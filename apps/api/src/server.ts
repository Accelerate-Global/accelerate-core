import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { z } from "zod";
import { Storage } from "@google-cloud/storage";

import {
  CreateResourceRequestSchema,
  CreateRunRequestSchema,
  CreateRunResponseSchema,
  ExportRequestSchema,
  PatchResourceCurrentVersionRequestSchema,
  PatchResourceDataRequestSchema,
  PROJECT_IDS,
  QueryRequestSchema,
  UploadResourceVersionRequestSchema
} from "@accelerate-core/shared";
import { previewRowsFromTable } from "@accelerate-core/bq";
import {
  appendRunLog,
  createRun,
  getDatasetById,
  getDatasetVersionById,
  getRunById,
  listRunLogs,
  listRuns,
  updateRun
} from "@accelerate-core/firestore";

import { assertIsAllowedAdmin, getAuthContextFromRequest, HttpError } from "./auth";
import { kickoffWorkerRun } from "./workerClient";
import {
  CsvValidationError,
  buildResourceService,
  createFirestoreResourceStore,
  createGcsBlobStore
} from "./resources/service";

function getArtifactsBucket(): string {
  return process.env.ARTIFACTS_BUCKET ?? PROJECT_IDS.artifactsBucketDefault;
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true
  });

  app.setErrorHandler((err, req, reply) => {
    const httpErr = err instanceof HttpError ? err : null;
    const zodErr = err instanceof z.ZodError ? err : null;
    const csvErr = err instanceof CsvValidationError ? err : null;

    const statusCode = httpErr?.statusCode ?? (zodErr ? 400 : csvErr ? 400 : 500);
    const message =
      httpErr?.expose
        ? httpErr.message
        : zodErr
          ? (zodErr.issues[0]?.message ?? "Invalid request")
          : csvErr
            ? csvErr.message
            : "Internal Server Error";
    if (statusCode >= 500) req.log.error({ err }, "unhandled error");
    void reply.status(statusCode).send({ error: message });
  });

  app.get("/health", async () => {
    return { ok: true };
  });

  app.get("/healthz", async () => {
    return { ok: true };
  });

  // Authn/authz pre-handler (V1: internal-only).
  app.addHook("preHandler", async (req) => {
    if (
      req.url === "/health" ||
      req.url.startsWith("/health?") ||
      req.url === "/healthz" ||
      req.url.startsWith("/healthz?")
    ) {
      return;
    }
    const auth = await getAuthContextFromRequest({
      authorizationHeader: req.headers.authorization
    });
    assertIsAllowedAdmin(auth.email);
    (req as unknown as { auth: typeof auth }).auth = auth;
  });

  const resourceService = buildResourceService({
    store: createFirestoreResourceStore(),
    blobs: createGcsBlobStore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT ?? PROJECT_IDS.gcpProjectId,
      bucketName: getArtifactsBucket()
    }),
    bucketName: getArtifactsBucket()
  });

  function throwResourceError(err: unknown): never {
    if (err instanceof CsvValidationError) {
      throw new HttpError(400, err.message);
    }
    const message = err instanceof Error ? err.message : "Resource operation failed";
    if (/already exists/i.test(message)) throw new HttpError(409, message);
    if (/not found/i.test(message)) throw new HttpError(404, message);
    throw err;
  }

  app.post("/runs", async (req) => {
    const body = CreateRunRequestSchema.parse(req.body);
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;
    const run = await createRun({
      connectorId: body.connectorId,
      datasetId: body.datasetId,
      createdBy: auth
    });

    await appendRunLog({
      runId: run.id,
      source: "api",
      level: "info",
      message: `Run created (connector=${body.connectorId} dataset=${body.datasetId})`
    });

    // Kickoff is best-effort. If it fails, the run remains queued.
    void kickoffWorkerRun({ runId: run.id, actorEmail: auth.email })
      .then(() =>
        appendRunLog({
          runId: run.id,
          source: "api",
          level: "info",
          message: "Worker kickoff requested"
        }).catch(() => {})
      )
      .catch(async (err) => {
        req.log.error({ err, runId: run.id }, "worker kickoff failed");
        await appendRunLog({
          runId: run.id,
          source: "api",
          level: "error",
          message: `Worker kickoff failed: ${err instanceof Error ? err.message : String(err)}`
        }).catch(() => {});
      });

    return CreateRunResponseSchema.parse({ id: run.id });
  });

  app.get("/runs", async () => {
    // V1 internal-only: list recent runs for admin UI.
    const runs = await listRuns(50);
    return { runs };
  });

  app.get("/runs/:id", async (req) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const run = await getRunById(params.id);
    if (!run) throw new HttpError(404, "Not found");
    return run;
  });

  app.get("/runs/:id/logs", async (req) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const query = z
      .object({
        afterTsMs: z.coerce.number().int().nonnegative().optional(),
        limit: z.coerce.number().int().min(1).max(500).optional()
      })
      .parse(req.query);

    const logs = await listRunLogs({
      runId: params.id,
      afterTsMs: query.afterTsMs,
      limit: query.limit
    });
    return { logs };
  });

  app.post("/runs/:id/cancel", async (req) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;

    const run = await getRunById(params.id);
    if (!run) throw new HttpError(404, "Not found");
    if (run.status === "succeeded") throw new HttpError(409, "Run already succeeded");
    if (run.status === "failed") throw new HttpError(409, "Run already failed");

    const finishedAt = new Date().toISOString();
    await updateRun(params.id, {
      status: "failed",
      finishedAt,
      error: { message: `Canceled by ${auth.email}`, code: "canceled" }
    });

    await appendRunLog({
      runId: params.id,
      source: "api",
      level: "warn",
      message: `Cancel requested by ${auth.email}`
    }).catch(() => {});

    return { ok: true };
  });

  app.get("/runs/:id/raw", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const run = await getRunById(params.id);
    if (!run) throw new HttpError(404, "Not found");

    const path = run.outputs?.gcsRawNdjsonPath;
    if (!path) throw new HttpError(404, "Raw artifact not available");

    const bucketName = getArtifactsBucket();
    const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT ?? PROJECT_IDS.gcpProjectId });
    const file = storage.bucket(bucketName).file(path);

    // Stream the artifact to the caller.
    const filename = path.split("/").slice(-1)[0] ?? "artifact.ndjson";
    void reply.header("content-type", "application/x-ndjson");
    void reply.header("content-disposition", `attachment; filename=\"${filename}\"`);
    return reply.send(file.createReadStream());
  });

  app.get("/resources", async () => {
    const resources = await resourceService.listResources(200);
    return { resources };
  });

  app.post("/resources", async (req) => {
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;
    const body = CreateResourceRequestSchema.parse(req.body);
    try {
      const resource = await resourceService.createResource({
        slug: body.slug,
        name: body.name,
        description: body.description,
        actor: auth
      });
      return { resource };
    } catch (err) {
      throwResourceError(err);
    }
  });

  app.get("/resources/:slug", async (req) => {
    const params = z.object({ slug: z.string().min(1) }).parse(req.params);
    const snapshot = await resourceService.getResourceWithCurrentTable(params.slug);
    if (!snapshot) throw new HttpError(404, "Resource not found");
    return snapshot;
  });

  app.post("/resources/:slug/versions", async (req) => {
    const params = z.object({ slug: z.string().min(1) }).parse(req.params);
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;
    const body = UploadResourceVersionRequestSchema.parse(req.body);
    try {
      const result = await resourceService.uploadCsvAsNewVersion({
        slug: params.slug,
        csvText: body.csvText,
        actor: auth
      });
      return result;
    } catch (err) {
      throwResourceError(err);
    }
  });

  app.get("/resources/:slug/versions", async (req) => {
    const params = z.object({ slug: z.string().min(1) }).parse(req.params);
    try {
      return await resourceService.listResourceVersions(params.slug);
    } catch (err) {
      throwResourceError(err);
    }
  });

  app.get("/resources/:slug/versions/:versionId", async (req) => {
    const params = z.object({ slug: z.string().min(1), versionId: z.string().min(1) }).parse(req.params);
    const snapshot = await resourceService.getResourceVersion(params.slug, params.versionId);
    if (!snapshot) throw new HttpError(404, "Resource/version not found");
    return snapshot;
  });

  app.post("/resources/:slug/versions/:versionId/restore", async (req) => {
    const params = z.object({ slug: z.string().min(1), versionId: z.string().min(1) }).parse(req.params);
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;
    try {
      return await resourceService.restoreVersion({
        slug: params.slug,
        versionId: params.versionId,
        actor: auth
      });
    } catch (err) {
      throwResourceError(err);
    }
  });

  app.patch("/resources/:slug/current", async (req) => {
    const params = z.object({ slug: z.string().min(1) }).parse(req.params);
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;
    const body = PatchResourceCurrentVersionRequestSchema.parse(req.body);
    try {
      const resource = await resourceService.setCurrentVersion({
        slug: params.slug,
        versionId: body.versionId,
        actor: auth
      });
      return { resource };
    } catch (err) {
      throwResourceError(err);
    }
  });

  app.patch("/resources/:slug/data", async (req) => {
    const params = z.object({ slug: z.string().min(1) }).parse(req.params);
    const auth = (req as unknown as { auth: { uid: string; email: string } }).auth;
    const body = PatchResourceDataRequestSchema.parse(req.body);
    try {
      const result = await resourceService.saveEditedData({
        slug: params.slug,
        headers: body.columns,
        rows: body.rows,
        actor: auth,
        basedOnVersionId: body.basedOnVersionId
      });
      return result;
    } catch (err) {
      throwResourceError(err);
    }
  });

  app.post("/query", async (req) => {
    const body = QueryRequestSchema.parse(req.body);
    const dataset = await getDatasetById(body.datasetId);
    if (!dataset) throw new HttpError(404, "Dataset not found");

    const versionId = body.versionId ?? dataset.latestVersionId;
    if (!versionId) throw new HttpError(404, "Dataset has no versions");

    const version = await getDatasetVersionById(body.datasetId, versionId);
    if (!version) throw new HttpError(404, "Dataset version not found");

    const rows = await previewRowsFromTable({
      datasetId: version.bigQuery.datasetId,
      tableId: version.bigQuery.tableId,
      limit: body.limit ?? 100
    });
    return { rows };
  });

  app.post("/exports", async (req) => {
    const body = ExportRequestSchema.parse(req.body);
    // TODO(V1): Export artifacts to GCS bucket and return a signed URL.
    void body;
    throw new HttpError(501, "Exports not implemented");
  });

  return app;
}

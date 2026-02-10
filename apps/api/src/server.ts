import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { z } from "zod";
import { Storage } from "@google-cloud/storage";

import {
  CreateRunRequestSchema,
  CreateRunResponseSchema,
  ExportRequestSchema,
  PROJECT_IDS,
  QueryRequestSchema
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

function getArtifactsBucket(): string {
  return process.env.ARTIFACTS_BUCKET ?? PROJECT_IDS.artifactsBucketDefault;
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true
  });

  app.setErrorHandler((err, req, reply) => {
    const httpErr = err instanceof HttpError ? err : null;
    const statusCode = httpErr?.statusCode ?? 500;
    const message = httpErr?.expose ? httpErr.message : "Internal Server Error";
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

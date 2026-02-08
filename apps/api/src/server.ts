import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { z } from "zod";

import {
  CreateRunRequestSchema,
  CreateRunResponseSchema,
  ExportRequestSchema,
  QueryRequestSchema
} from "@accelerate-core/shared";
import { previewRowsFromTable } from "@accelerate-core/bq";
import {
  createRun,
  getDatasetById,
  getDatasetVersionById,
  getRunById,
  listRuns
} from "@accelerate-core/firestore";

import { assertIsAllowedAdmin, getAuthContextFromRequest, HttpError } from "./auth";
import { kickoffWorkerRun } from "./workerClient";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true
  });

  app.setErrorHandler((err, _req, reply) => {
    const httpErr = err instanceof HttpError ? err : null;
    const statusCode = httpErr?.statusCode ?? 500;
    const message = httpErr?.expose ? httpErr.message : "Internal Server Error";
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

    // Kickoff is best-effort. If it fails, the run remains queued.
    void kickoffWorkerRun({ runId: run.id, actorEmail: auth.email }).catch((err) => {
      req.log.error({ err, runId: run.id }, "worker kickoff failed");
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

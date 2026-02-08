import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { z } from "zod";

import {
  CreateRunRequestSchema,
  CreateRunResponseSchema,
  ExportRequestSchema,
  QueryRequestSchema
} from "@accelerate-core/shared";
import { assertSafeSql, runQuery } from "@accelerate-core/bq";
import { createRun, getRunById } from "@accelerate-core/firestore";

import { assertIsAllowedAdmin, getAuthContextFromRequest, HttpError } from "./auth";

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

  app.get("/healthz", async () => {
    return { ok: true };
  });

  // Authn/authz pre-handler (V1: internal-only).
  app.addHook("preHandler", async (req) => {
    if (req.url === "/healthz" || req.url.startsWith("/healthz?")) return;
    const auth = await getAuthContextFromRequest({
      authorizationHeader: req.headers.authorization
    });
    assertIsAllowedAdmin(auth.email);
    (req as unknown as { auth: typeof auth }).auth = auth;
  });

  app.post("/runs", async (req) => {
    const body = CreateRunRequestSchema.parse(req.body);
    const run = await createRun(body);
    return CreateRunResponseSchema.parse({ id: run.id });
  });

  app.get("/runs/:id", async (req) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const run = await getRunById(params.id);
    if (!run) throw new HttpError(404, "Not found");
    return run;
  });

  app.post("/query", async (req) => {
    const body = QueryRequestSchema.parse(req.body);
    const sql = body.sql;
    assertSafeSql(sql);
    const rows = await runQuery(sql);
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

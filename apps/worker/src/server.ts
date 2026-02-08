import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { z } from "zod";

import { assertIsAllowedAdmin, getAuthContextFromRequest, HttpError } from "./auth";
import { runConnectorForRun } from "./runner";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err, _req, reply) => {
    const httpErr = err instanceof HttpError ? err : null;
    const statusCode = httpErr?.statusCode ?? 500;
    const message = httpErr?.expose ? httpErr.message : "Internal Server Error";
    void reply.status(statusCode).send({ error: message });
  });

  app.get("/healthz", async () => {
    return { ok: true };
  });

  app.addHook("preHandler", async (req) => {
    if (req.url === "/healthz" || req.url.startsWith("/healthz?")) return;
    const auth = await getAuthContextFromRequest({
      authorizationHeader: req.headers.authorization
    });
    assertIsAllowedAdmin(auth.email);
    (req as unknown as { auth: typeof auth }).auth = auth;
  });

  app.post("/run/:runId", async (req) => {
    const params = z.object({ runId: z.string().min(1) }).parse(req.params);
    const result = await runConnectorForRun(params.runId);
    if (!result.ok) throw new HttpError(409, result.message);
    return result;
  });

  return app;
}

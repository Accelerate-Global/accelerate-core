import { buildServer } from "./server";

async function main() {
  const port = Number(process.env.PORT ?? "8081");
  const host = process.env.HOST ?? "0.0.0.0";

  const app = await buildServer();
  await app.listen({ port, host });
  app.log.info({ port, host }, "worker listening");
}

void main();


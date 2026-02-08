import { GoogleAuth } from "google-auth-library";

export class WorkerKickoffError extends Error {}

function getWorkerBaseUrl(): string {
  const baseUrl = process.env.WORKER_BASE_URL;
  if (!baseUrl) throw new WorkerKickoffError("Missing WORKER_BASE_URL");
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function kickoffWorkerRun(input: { runId: string; actorEmail: string }): Promise<void> {
  const baseUrl = getWorkerBaseUrl();
  const url = `${baseUrl}/run/${encodeURIComponent(input.runId)}`;

  // Cloud Run IAM auth: fetch an ID token for the worker URL and call it.
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(baseUrl);

  const res = await client.request({
    url,
    method: "POST",
    headers: {
      "X-Accelerate-Actor-Email": input.actorEmail
    },
    timeout: 60_000
  });

  if (res.status && res.status >= 400) {
    throw new WorkerKickoffError(`Worker kickoff failed: ${res.status}`);
  }
}

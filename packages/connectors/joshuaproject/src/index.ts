import type { Connector, ConnectorRunContext, ConnectorRunResult } from "@accelerate-core/connectors";

export const JOSHUA_PROJECT_CONNECTOR_KEY = "joshuaproject";

export type JoshuaProjectFetchParams = {
  // TODO(V1): Define concrete request params (country codes, filters, etc.).
  placeholder?: string;
};

export async function fetchJoshuaProjectData(
  _ctx: ConnectorRunContext,
  _params: JoshuaProjectFetchParams
): Promise<ConnectorRunResult> {
  const apiKey = process.env.JOSHUA_PROJECT_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Missing JOSHUA_PROJECT_API_KEY", errorCode: "missing_api_key" };
  }

  // TODO(V1): Implement the real API call.
  // Intentionally stubbed to avoid network calls and to prevent accidental secret leakage.
  return { ok: true, message: "Joshua Project fetch stub (not implemented)" };
}

export const connector: Connector = {
  key: JOSHUA_PROJECT_CONNECTOR_KEY,
  displayName: "Joshua Project",
  description: "Placeholder connector for Joshua Project ingestion",
  run: async (ctx) => {
    return fetchJoshuaProjectData(ctx, {});
  }
};


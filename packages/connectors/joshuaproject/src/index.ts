import type { Connector, ConnectorRunContext, ConnectorRunResult } from "@accelerate-core/connectors";
import { DATASET_IDS } from "@accelerate-core/shared";

export const JOSHUA_PROJECT_PGIC_CONNECTOR_ID = "joshuaproject_pgic";

export type JoshuaProjectPeopleGroupsOptions = {
  limit?: number;
  url?: string; // override full endpoint URL
  includeProfileText?: "Y" | "N";
  includeResources?: "Y" | "N";
};

const DEFAULT_PEOPLE_GROUPS_URL = "https://api.joshuaproject.net/v1/people_groups.json";

function safeSnippet(text: string, max = 280): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(0, max - 1))}…`;
}

async function fetchPeopleGroupsOnce(input: {
  apiKey: string;
  url: string;
  limit: number;
  includeProfileText: "Y" | "N";
  includeResources: "Y" | "N";
}): Promise<Record<string, unknown>[]> {
  const url = new URL(input.url);
  url.searchParams.set("api_key", input.apiKey);
  url.searchParams.set("include_profile_text", input.includeProfileText);
  url.searchParams.set("include_resources", input.includeResources);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", String(input.limit));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const snippet = text ? ` ${safeSnippet(text)}` : "";
    throw new Error(`Joshua Project API error: ${res.status} ${res.statusText}.${snippet}`.trim());
  }

  const payload = (await res.json()) as unknown;
  const data = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data?: unknown[] }).data!
      : [payload];

  return data.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
}

export async function* streamPgicPeopleGroups(input: {
  apiKey: string;
  options?: JoshuaProjectPeopleGroupsOptions;
}): AsyncGenerator<Record<string, unknown>> {
  const url = input.options?.url ?? DEFAULT_PEOPLE_GROUPS_URL;
  // Script equivalent: single call with a very large limit to fetch everything at once.
  const limit = input.options?.limit ?? (process.env.JOSHUA_PROJECT_LIMIT ? Number(process.env.JOSHUA_PROJECT_LIMIT) : 100000);
  const includeProfileText = input.options?.includeProfileText ?? "Y";
  const includeResources = input.options?.includeResources ?? "Y";

  const items = await fetchPeopleGroupsOnce({
    apiKey: input.apiKey,
    url,
    limit,
    includeProfileText,
    includeResources
  });

  for (const item of items) yield item;
}

export async function fetchJoshuaProjectData(ctx: ConnectorRunContext): Promise<ConnectorRunResult> {
  const apiKey = process.env.JOSHUA_PROJECT_API_KEY;
  if (!apiKey) return { ok: false, message: "Missing JOSHUA_PROJECT_API_KEY", errorCode: "missing_api_key" };

  if (ctx.datasetId !== DATASET_IDS.pgicPeopleGroups) {
    return {
      ok: false,
      message: `Unsupported datasetId for Joshua Project PGIC connector: ${ctx.datasetId}`,
      errorCode: "unsupported_dataset"
    };
  }

  return {
    ok: true,
    message: "Fetched Joshua Project PGIC people groups",
    output: {
      records: streamPgicPeopleGroups({
        apiKey,
        options: {
          limit: process.env.JOSHUA_PROJECT_LIMIT ? Number(process.env.JOSHUA_PROJECT_LIMIT) : undefined
        }
      })
    }
  };
}

export const connector: Connector = {
  id: JOSHUA_PROJECT_PGIC_CONNECTOR_ID,
  displayName: "Joshua Project (PGIC)",
  description: "People group data from the Joshua Project API (PGIC)",
  run: fetchJoshuaProjectData
};

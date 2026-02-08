import type { Connector, ConnectorRunContext, ConnectorRunResult } from "@accelerate-core/connectors";
import { DATASET_IDS } from "@accelerate-core/shared";

export const JOSHUA_PROJECT_PGIC_CONNECTOR_ID = "joshuaproject_pgic";

export type JoshuaProjectPeopleGroupsOptions = {
  limit?: number;
  maxPages?: number;
  baseUrl?: string;
};

type PeopleGroupsResponse = {
  data?: unknown[];
  meta?: {
    pagination?: {
      current_page?: number;
      total_pages?: number;
      per_page?: number;
      total?: number;
    };
  };
};

async function fetchPeopleGroupsPage(input: {
  apiKey: string;
  baseUrl: string;
  page: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; totalPages: number | null }> {
  const baseUrl = input.baseUrl.endsWith("/") ? input.baseUrl.slice(0, -1) : input.baseUrl;
  const url = new URL(`${baseUrl}/people_groups`);
  url.searchParams.set("api_key", input.apiKey);
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("limit", String(input.limit));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Joshua Project API error: ${res.status} ${res.statusText} ${text}`.trim());
  }

  const json = (await res.json()) as PeopleGroupsResponse;
  const items = Array.isArray(json.data) ? json.data : [];
  const totalPages =
    typeof json.meta?.pagination?.total_pages === "number" ? json.meta.pagination.total_pages : null;

  return {
    items: items.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") as Record<
      string,
      unknown
    >[],
    totalPages
  };
}

export async function* streamPgicPeopleGroups(input: {
  apiKey: string;
  options?: JoshuaProjectPeopleGroupsOptions;
}): AsyncGenerator<Record<string, unknown>> {
  const limit = input.options?.limit ?? 1000;
  const maxPages = input.options?.maxPages ?? 200;
  const baseUrl = input.options?.baseUrl ?? process.env.JOSHUA_PROJECT_BASE_URL ?? "https://joshuaproject.net/api/v2";

  let page = 1;
  let totalPages: number | null = null;

  while (page <= maxPages && (totalPages == null || page <= totalPages)) {
    const { items, totalPages: nextTotalPages } = await fetchPeopleGroupsPage({
      apiKey: input.apiKey,
      baseUrl,
      page,
      limit
    });

    totalPages = totalPages ?? nextTotalPages;

    if (items.length === 0) break;
    for (const item of items) yield item;

    page += 1;
  }
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
          limit: process.env.JOSHUA_PROJECT_LIMIT ? Number(process.env.JOSHUA_PROJECT_LIMIT) : undefined,
          maxPages: process.env.JOSHUA_PROJECT_MAX_PAGES ? Number(process.env.JOSHUA_PROJECT_MAX_PAGES) : undefined
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

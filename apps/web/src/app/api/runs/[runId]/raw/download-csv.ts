import { collectCsvColumnsFromNdjson, createCsvStreamFromNdjson } from "./ndjson-to-csv.ts";

function buildErrorResponse(status: number, fallbackMessage: string, textBody: string): Response {
  try {
    const parsed = JSON.parse(textBody) as unknown;
    return Response.json(parsed ?? { error: fallbackMessage }, { status });
  } catch {
    return Response.json({ error: textBody || fallbackMessage }, { status });
  }
}

export function csvFilenameFromContentDisposition(contentDisposition: string | null, runId: string): string {
  const fallback = `run-${runId}.csv`;
  if (!contentDisposition) return fallback;

  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(contentDisposition);
  if (!match) return fallback;

  let parsed = match[1] ?? fallback;
  try {
    parsed = decodeURIComponent(parsed);
  } catch {
    // keep raw value
  }

  const basename = parsed.split(/[\\/]/).pop() ?? parsed;
  const replaced = basename.replace(/(?:\.bq)?\.ndjson$/i, ".csv").replace(/\.jsonl$/i, ".csv");
  return replaced.toLowerCase().endsWith(".csv") ? replaced : `${replaced}.csv`;
}

export async function buildCsvDownloadResponse(input: {
  runId: string;
  auth: string;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<Response> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const rawUrl = `${input.apiBaseUrl}/runs/${encodeURIComponent(input.runId)}/raw`;

  const columnsResponse = await fetchImpl(rawUrl, {
    method: "GET",
    headers: {
      authorization: input.auth
    }
  });
  if (!columnsResponse.ok) {
    return buildErrorResponse(columnsResponse.status, `Request failed: ${columnsResponse.status}`, await columnsResponse.text());
  }
  if (!columnsResponse.body) {
    return Response.json({ error: "Raw artifact stream unavailable" }, { status: 502 });
  }

  let columns: string[];
  try {
    columns = await collectCsvColumnsFromNdjson(columnsResponse.body);
  } catch {
    return Response.json({ error: "Failed to parse raw artifact" }, { status: 500 });
  }

  const csvResponse = await fetchImpl(rawUrl, {
    method: "GET",
    headers: {
      authorization: input.auth
    }
  });
  if (!csvResponse.ok) {
    return buildErrorResponse(csvResponse.status, `Request failed: ${csvResponse.status}`, await csvResponse.text());
  }
  if (!csvResponse.body) {
    return Response.json({ error: "Raw artifact stream unavailable" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("content-type", "text/csv; charset=utf-8");
  headers.set(
    "content-disposition",
    `attachment; filename="${csvFilenameFromContentDisposition(csvResponse.headers.get("content-disposition"), input.runId)}"`
  );

  return new Response(createCsvStreamFromNdjson(csvResponse.body, columns), {
    status: 200,
    headers
  });
}

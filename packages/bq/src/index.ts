import { BigQuery } from "@google-cloud/bigquery";
import { PROJECT_IDS } from "@accelerate-core/shared";

export type SafeSql = string & { readonly __brand: "SafeSql" };

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

let _client: BigQuery | null = null;

export function getGcpProjectId(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCP_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    PROJECT_IDS.gcpProjectId
  );
}

export function getBigQueryDatasetId(): string {
  return process.env.BIGQUERY_DATASET ?? PROJECT_IDS.bigQueryDataset;
}

export function getBigQueryLocation(): string {
  return process.env.BIGQUERY_LOCATION ?? "US";
}

export function getBigQueryClient(): BigQuery {
  if (_client) return _client;
  _client = new BigQuery({ projectId: getGcpProjectId() });
  return _client;
}

export function assertSafeIdentifier(name: string, kind: "dataset" | "table" | "column") {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Unsafe ${kind} identifier: ${name}`);
  }
}

// Very conservative SQL guardrails (V1: read-only).
export function assertSafeSql(sql: string): asserts sql is SafeSql {
  const trimmed = sql.trim();

  if (trimmed.length === 0) throw new Error("SQL is empty");
  if (trimmed.includes(";")) throw new Error("Multi-statement SQL is not allowed");
  if (trimmed.includes("--") || trimmed.includes("/*") || trimmed.includes("*/")) {
    throw new Error("SQL comments are not allowed");
  }

  const upper = trimmed.toUpperCase();
  const disallowed = ["INSERT ", "UPDATE ", "DELETE ", "MERGE ", "DROP ", "ALTER ", "CREATE "];
  if (disallowed.some((kw) => upper.includes(kw))) {
    throw new Error("DDL/DML is not allowed");
  }

  if (!upper.startsWith("SELECT ")) {
    throw new Error("Only SELECT queries are allowed");
  }
}

export async function previewRowsFromTable(input: {
  datasetId?: string;
  tableId: string;
  limit?: number;
}): Promise<unknown[]> {
  const projectId = getGcpProjectId();
  const datasetId = input.datasetId ?? getBigQueryDatasetId();
  const tableId = input.tableId;
  const limit = typeof input.limit === "number" ? Math.max(1, Math.min(1000, input.limit)) : 100;

  assertSafeIdentifier(datasetId, "dataset");
  assertSafeIdentifier(tableId, "table");

  const sql = `SELECT * FROM \`${projectId}.${datasetId}.${tableId}\` LIMIT @limit`;
  assertSafeSql(sql);

  const bq = getBigQueryClient();
  const [rows] = await bq.query({
    query: sql,
    params: { limit },
    location: getBigQueryLocation()
  });
  return rows as unknown[];
}

export async function loadNdjsonFromGcsToTable(input: {
  datasetId?: string;
  tableId: string;
  gcsUri: string; // gs://bucket/path.ndjson
}): Promise<{ jobId?: string }> {
  const datasetId = input.datasetId ?? getBigQueryDatasetId();
  const tableId = input.tableId;

  assertSafeIdentifier(datasetId, "dataset");
  assertSafeIdentifier(tableId, "table");

  const bq = getBigQueryClient();
  const projectId = getGcpProjectId();

  // NOTE: `Table#load(string)` treats a string as a local file path and will try
  // to `fs.open()` it. We create an explicit load job so `gs://...` URIs work.
  const [job] = await bq.createJob({
    configuration: {
      load: {
        sourceUris: [input.gcsUri],
        destinationTable: {
          projectId,
          datasetId,
          tableId
        },
        sourceFormat: "NEWLINE_DELIMITED_JSON",
        autodetect: true,
        createDisposition: "CREATE_IF_NEEDED",
        writeDisposition: "WRITE_TRUNCATE"
      }
    },
    location: getBigQueryLocation()
  });

  // Wait for completion (throws on job error).
  const promiseResult = (await job.promise()) as unknown;
  const metadata = Array.isArray(promiseResult) ? (promiseResult[0] as unknown) : undefined;

  const jobId = extractJobId(metadata ?? job);
  return { jobId };
}

type JobMetadataLike = {
  jobReference?: { jobId?: string | null } | null;
  id?: string | null;
  jobId?: string | null;
};

function extractJobId(job: unknown): string | undefined {
  if (!job || typeof job !== "object") return undefined;
  const j = job as JobMetadataLike;
  return j.jobReference?.jobId ?? j.id ?? (typeof j.jobId === "string" ? j.jobId : undefined) ?? undefined;
}

import { z } from "zod";

// Project identifiers (do not change)
export const PROJECT_IDS = {
  gcpProjectId: "accelerate-global-473318",
  firebaseProjectId: "accelerate-global-473318",
  bigQueryDataset: "accelerate_dev",
  // GCS buckets must be globally unique. Prefer appending "-473318" if the base name is taken.
  artifactsBucketDefault: "accelerate-artifacts-dev",
  firstDatasetId: "pgic_people_groups"
} as const;

export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type RunId = string;
export type ConnectorId = string;
export type DatasetId = string;
export type DatasetVersionId = string;

export type Run = {
  id: RunId;
  status: RunStatus;
  createdAt: string; // ISO string
  createdBy: {
    uid: string;
    email: string;
  };
  connectorId: ConnectorId;
  datasetId: DatasetId;
  startedAt?: string; // ISO
  finishedAt?: string; // ISO
  error?: {
    message: string;
    code?: string;
  };
  outputs?: {
    datasetVersionId?: DatasetVersionId;
    bigQueryTableId?: string; // table id only (dataset is env configured)
    gcsRawNdjsonPath?: string; // path inside ARTIFACTS_BUCKET
  };
};

export type RunLogSource = "api" | "worker";
export type RunLogLevel = "info" | "warn" | "error";

export type RunLogEntry = {
  id: string;
  runId: RunId;
  ts: string; // ISO
  tsMs: number;
  source: RunLogSource;
  level: RunLogLevel;
  message: string;
};

export type Dataset = {
  id: DatasetId;
  displayName: string;
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  latestVersionId?: DatasetVersionId;
  nextVersionNumber: number;
};

export type DatasetVersion = {
  id: DatasetVersionId; // v000001
  datasetId: DatasetId;
  versionNumber: number;
  createdAt: string; // ISO
  runId: RunId;
  connectorId: ConnectorId;
  rowCount?: number;
  bigQuery: {
    projectId: string;
    datasetId: string;
    tableId: string;
    location: string;
  };
  gcs: {
    bucket: string;
    rawNdjsonPath: string;
  };
};

export type Connector = {
  id: ConnectorId;
  displayName: string;
  description?: string;
  updatedAt: string; // ISO
};

export const CONNECTOR_IDS = {
  joshuaProjectPgic: "joshuaproject_pgic"
} as const;

export const DATASET_IDS = {
  pgicPeopleGroups: "pgic_people_groups"
} as const;

export const CreateRunRequestSchema = z.object({
  connectorId: z.string().min(1),
  datasetId: z.string().min(1)
});
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;

export const CreateRunResponseSchema = z.object({
  id: z.string().min(1)
});
export type CreateRunResponse = z.infer<typeof CreateRunResponseSchema>;

export const QueryRequestSchema = z.object({
  datasetId: z.string().min(1),
  versionId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(1000).optional()
});
export type QueryRequest = z.infer<typeof QueryRequestSchema>;

export const ExportRequestSchema = z.object({
  runId: z.string().min(1),
  format: z.enum(["jsonl", "csv"]).default("jsonl")
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

export function padVersionNumber(n: number, width = 6): string {
  const s = String(Math.max(0, Math.trunc(n)));
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

export function formatVersionId(versionNumber: number): DatasetVersionId {
  return `v${padVersionNumber(versionNumber)}` as DatasetVersionId;
}

export function formatVersionedTableId(datasetId: DatasetId, versionNumber: number): string {
  return `${datasetId}__v${padVersionNumber(versionNumber)}`;
}

export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseAllowedAdminEmails(value: string | undefined): Set<string> {
  return new Set(parseCommaSeparated(value).map((e) => e.toLowerCase()));
}

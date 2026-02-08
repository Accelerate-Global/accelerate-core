import { z } from "zod";

// Project identifiers (do not change)
export const PROJECT_IDS = {
  gcpProjectId: "accelerate-global-473318",
  firebaseProjectId: "accelerate-global-473318",
  bigQueryDataset: "accelerate_dev",
  // GCS buckets must be globally unique. Prefer appending "-473318" if the base name is taken.
  artifactsBucketDefault: "accelerate-artifacts-dev-473318",
  firstDatasetSlug: "pgic_people_groups"
} as const;

export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type ConnectorKey = string;
export type DatasetSlug = string;
export type RunId = string;

export type Run = {
  id: RunId;
  status: RunStatus;
  createdAt: string; // ISO string
  connectorKey?: ConnectorKey;
  datasetSlug?: DatasetSlug;
};

export type Dataset = {
  slug: DatasetSlug;
  displayName: string;
  description?: string;
};

export const CreateRunRequestSchema = z.object({
  connectorKey: z.string().min(1).optional(),
  datasetSlug: z.string().min(1).optional()
});
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;

export const CreateRunResponseSchema = z.object({
  id: z.string().min(1)
});
export type CreateRunResponse = z.infer<typeof CreateRunResponseSchema>;

export const QueryRequestSchema = z.object({
  sql: z.string().min(1)
});
export type QueryRequest = z.infer<typeof QueryRequestSchema>;

export const ExportRequestSchema = z.object({
  runId: z.string().min(1),
  format: z.enum(["jsonl", "csv"]).default("jsonl")
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

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


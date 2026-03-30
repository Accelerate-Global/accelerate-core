import { z } from "zod";

import type { Enums, Json, Tables } from "@/lib/supabase/database.types";

export const datasetVisibility = {
  global: "global",
  private: "private",
  shared: "shared",
  workspace: "workspace",
} as const;

export const datasetColumnKind = {
  attribute: "attribute",
  system: "system",
} as const;

export type DatasetVisibility = Enums<"dataset_visibility">;

interface JsonRecord {
  [key: string]: Json | undefined;
}

type DatasetRecord = Tables<"datasets">;
type DatasetRowRecord = Tables<"dataset_rows">;
type DatasetVersionSourceRecord = Tables<"dataset_version_sources">;
type DatasetVersionRecord = Tables<"dataset_versions">;

export const datasetColumnDefinitionSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  dataType: z.string().trim().min(1),
  source: z.string().trim().min(1),
  sortable: z.boolean(),
  filterable: z.boolean(),
  searchable: z.boolean(),
  kind: z.enum([datasetColumnKind.system, datasetColumnKind.attribute]),
});

export const datasetColumnDefinitionsSchema = z.object({
  columns: z.array(datasetColumnDefinitionSchema).default([]),
});

export type DatasetColumnDefinition = z.infer<
  typeof datasetColumnDefinitionSchema
>;

export type DatasetColumnDefinitions = z.infer<
  typeof datasetColumnDefinitionsSchema
>;

export interface Dataset {
  activeVersionId: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  isDefaultGlobal: boolean;
  metadata: JsonRecord;
  name: string;
  ownerWorkspaceId: string | null;
  slug: string;
  updatedAt: string;
  visibility: DatasetVisibility;
}

export interface DatasetVersion {
  columnDefinitions: DatasetColumnDefinitions;
  createdAt: string;
  datasetId: string;
  id: string;
  metadata: JsonRecord;
  rowCount: number;
  sourceRef: string | null;
  versionNumber: number;
}

export interface DatasetVersionSource {
  createdAt: string;
  datasetVersionId: string;
  id: string;
  relationType: string;
  sourceDatasetVersionId: string;
}

export interface DatasetRow {
  attributes: JsonRecord;
  createdAt: string;
  datasetVersionId: string;
  id: string;
  lineage: JsonRecord | null;
  pipelineRowId: string;
  rowIndex: number | null;
  updatedAt: string;
}

export interface DatasetWorkspaceReference {
  id: string;
  name: string;
  slug: string;
}

export interface DatasetLineageSummary {
  isDerived: boolean;
  relationTypes: string[];
  sourceCount: number;
}

const isJsonRecord = (value: Json | null | undefined): value is JsonRecord => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

export const normalizeJsonRecord = (
  value: Json | null | undefined
): JsonRecord => {
  if (isJsonRecord(value)) {
    return value;
  }

  return {};
};

export const normalizeDatasetColumnDefinitions = (
  value: Json
): DatasetColumnDefinitions => {
  const parsedValue = datasetColumnDefinitionsSchema.safeParse(value);

  if (parsedValue.success) {
    return parsedValue.data;
  }

  return { columns: [] };
};

export const normalizeDataset = (dataset: DatasetRecord): Dataset => {
  return {
    activeVersionId: dataset.active_version_id,
    createdAt: dataset.created_at,
    description: dataset.description,
    id: dataset.id,
    isDefaultGlobal: dataset.is_default_global,
    metadata: normalizeJsonRecord(dataset.metadata),
    name: dataset.name,
    ownerWorkspaceId: dataset.owner_workspace_id,
    slug: dataset.slug,
    updatedAt: dataset.updated_at,
    visibility: dataset.visibility,
  };
};

export const normalizeDatasetVersion = (
  datasetVersion: DatasetVersionRecord
): DatasetVersion => {
  return {
    columnDefinitions: normalizeDatasetColumnDefinitions(
      datasetVersion.column_definitions
    ),
    createdAt: datasetVersion.created_at,
    datasetId: datasetVersion.dataset_id,
    id: datasetVersion.id,
    metadata: normalizeJsonRecord(datasetVersion.metadata),
    rowCount: datasetVersion.row_count,
    sourceRef: datasetVersion.source_ref,
    versionNumber: datasetVersion.version_number,
  };
};

export const normalizeDatasetVersionSource = (
  datasetVersionSource: DatasetVersionSourceRecord
): DatasetVersionSource => {
  return {
    createdAt: datasetVersionSource.created_at,
    datasetVersionId: datasetVersionSource.dataset_version_id,
    id: datasetVersionSource.id,
    relationType: datasetVersionSource.relation_type,
    sourceDatasetVersionId: datasetVersionSource.source_dataset_version_id,
  };
};

const normalizeLineage = (value: Json | null): JsonRecord | null => {
  if (value === null) {
    return null;
  }

  if (isJsonRecord(value)) {
    return value;
  }

  return {};
};

export const normalizeDatasetRow = (
  datasetRow: DatasetRowRecord
): DatasetRow => {
  return {
    attributes: normalizeJsonRecord(datasetRow.attributes),
    createdAt: datasetRow.created_at,
    datasetVersionId: datasetRow.dataset_version_id,
    id: datasetRow.id,
    lineage: normalizeLineage(datasetRow.lineage),
    pipelineRowId: datasetRow.pipeline_row_id,
    rowIndex: datasetRow.row_index,
    updatedAt: datasetRow.updated_at,
  };
};

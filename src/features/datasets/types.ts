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
  changeSummary: string | null;
  columnDefinitions: DatasetColumnDefinitions;
  createdAt: string;
  datasetId: string;
  id: string;
  metadata: JsonRecord;
  notes: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
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
  lineage: DatasetRowProvenance | null;
  pipelineRowId: string;
  rowIndex: number | null;
  updatedAt: string;
}

export interface DatasetRowLineageReference {
  datasetVersionId: string | null;
  pipelineRowId: string;
  rowId: string | null;
}

export interface DatasetRowFieldMapping {
  fieldKey: string;
  sourceFields: string[];
}

export interface DatasetRowProvenance {
  fieldMappings: DatasetRowFieldMapping[];
  ingestedFrom: string | null;
  raw: JsonRecord;
  upstreamRows: DatasetRowLineageReference[];
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
    changeSummary: datasetVersion.change_summary,
    columnDefinitions: normalizeDatasetColumnDefinitions(
      datasetVersion.column_definitions
    ),
    createdAt: datasetVersion.created_at,
    datasetId: datasetVersion.dataset_id,
    id: datasetVersion.id,
    metadata: normalizeJsonRecord(datasetVersion.metadata),
    notes: datasetVersion.notes,
    publishedAt: datasetVersion.published_at,
    publishedBy: datasetVersion.published_by,
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

const getFirstTrimmedString = (
  value: JsonRecord,
  keys: readonly string[]
): string | null => {
  for (const key of keys) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

const normalizeLineageReference = (
  value: Json
): DatasetRowLineageReference | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const pipelineRowId = getFirstTrimmedString(value, [
    "pipelineRowId",
    "sourcePipelineRowId",
  ]);

  if (!pipelineRowId) {
    return null;
  }

  return {
    datasetVersionId: getFirstTrimmedString(value, [
      "datasetVersionId",
      "sourceDatasetVersionId",
    ]),
    pipelineRowId,
    rowId: getFirstTrimmedString(value, ["rowId", "sourceRowId"]),
  };
};

const normalizeStringArray = (value: Json | undefined): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => {
      return typeof entry === "string" && entry.trim().length > 0;
    })
    .map((entry) => entry.trim());
};

const normalizeFieldMapping = (value: Json): DatasetRowFieldMapping | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const fieldKey = getFirstTrimmedString(value, ["fieldKey", "targetField"]);

  if (!fieldKey) {
    return null;
  }

  const sourceFields = normalizeStringArray(
    value.sourceFields ?? value.sources ?? value.sourceColumns
  );

  return {
    fieldKey,
    sourceFields,
  };
};

const getFirstLineageArray = (
  value: JsonRecord,
  keys: readonly string[]
): Json[] => {
  for (const key of keys) {
    if (Array.isArray(value[key])) {
      return value[key] as Json[];
    }
  }

  return [];
};

const normalizeLineage = (value: Json | null): DatasetRowProvenance | null => {
  if (value === null) {
    return null;
  }

  if (!isJsonRecord(value)) {
    return {
      fieldMappings: [],
      ingestedFrom: null,
      raw: {},
      upstreamRows: [],
    };
  }

  return {
    fieldMappings: getFirstLineageArray(value, [
      "fieldMappings",
      "fieldLineage",
    ])
      .map((entry) => normalizeFieldMapping(entry))
      .filter((entry): entry is DatasetRowFieldMapping => Boolean(entry)),
    ingestedFrom:
      typeof value.ingestedFrom === "string" && value.ingestedFrom.trim()
        ? value.ingestedFrom
        : null,
    raw: value,
    upstreamRows: getFirstLineageArray(value, [
      "upstreamRows",
      "sourceRows",
      "rowReferences",
    ])
      .map((entry) => normalizeLineageReference(entry))
      .filter((entry): entry is DatasetRowLineageReference => Boolean(entry)),
  };
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

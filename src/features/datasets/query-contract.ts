import { z } from "zod";

import {
  datasetColumnDefinitionSchema,
  datasetVisibility,
} from "@/features/datasets/types";

const datasetAccessModeValues = [
  datasetVisibility.global,
  datasetVisibility.private,
  datasetVisibility.workspace,
  datasetVisibility.shared,
] as const;

const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const jsonValueSchema: z.ZodType<
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

export const datasetAccessModeSchema = z.enum(datasetAccessModeValues);

export const datasetWorkspaceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

export const datasetLineageSummarySchema = z.object({
  isDerived: z.boolean(),
  relationTypes: z.array(z.string().trim().min(1)),
  sourceCount: z.number().int().nonnegative(),
});

export const datasetSummarySchema = z.object({
  activeVersionId: z.string().uuid().nullable(),
  accessMode: datasetAccessModeSchema,
  id: z.string().uuid(),
  isHomeDataset: z.boolean(),
  lineageSummary: datasetLineageSummarySchema,
  name: z.string().trim().min(1),
  ownerWorkspace: datasetWorkspaceSummarySchema.nullable(),
  rowCount: z.number().int().nonnegative(),
  sharedWorkspaceCount: z.number().int().nonnegative(),
  slug: z.string().trim().min(1),
});

export const datasetListResponseSchema = z.object({
  datasets: z.array(datasetSummarySchema),
});

export const datasetMetadataDatasetSchema = datasetSummarySchema.pick({
  accessMode: true,
  id: true,
  isHomeDataset: true,
  name: true,
  ownerWorkspace: true,
  sharedWorkspaceCount: true,
  slug: true,
});

export const datasetMetadataVersionSchema = z.object({
  id: z.string().uuid(),
  lineageSummary: datasetLineageSummarySchema,
  rowCount: z.number().int().nonnegative(),
  versionNumber: z.number().int().positive(),
});

export const datasetMetadataResponseSchema = z.object({
  columns: z.array(datasetColumnDefinitionSchema),
  dataset: datasetMetadataDatasetSchema,
  version: datasetMetadataVersionSchema,
});

export const datasetSortSchema = z.object({
  direction: z.enum(["asc", "desc"]),
  field: z.string().trim().min(1),
});

export const datasetFilterSchema = z.object({
  field: z.string().trim().min(1),
  op: z.enum([
    "eq",
    "neq",
    "in",
    "contains",
    "startsWith",
    "gt",
    "gte",
    "lt",
    "lte",
    "isNull",
  ]),
  value: z
    .union([jsonPrimitiveSchema, z.array(jsonPrimitiveSchema)])
    .optional(),
});

export const datasetQueryRequestSchema = z.object({
  filters: z.array(datasetFilterSchema).max(20).default([]),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  sort: z.array(datasetSortSchema).max(3).default([]),
  versionId: z.string().uuid().optional(),
});

export const datasetQueryRowSchema = z.object({
  pipelineRowId: z.string().trim().min(1),
  rowId: z.string().uuid(),
  values: z.record(z.string(), jsonValueSchema),
});

export const datasetQueryResponseSchema = z.object({
  appliedFilters: z.array(datasetFilterSchema),
  appliedSort: z.array(datasetSortSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  rows: z.array(datasetQueryRowSchema),
  totalPages: z.number().int().min(0),
  totalRows: z.number().int().nonnegative(),
});

export const apiErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "DATASET_NOT_FOUND",
  "DATASET_ACCESS_DENIED",
  "DATASET_VERSION_NOT_FOUND",
  "DATASET_VERSION_UNAVAILABLE",
  "INVALID_REQUEST",
  "INVALID_FILTER_FIELD",
  "INVALID_SORT_FIELD",
  "UNSUPPORTED_FILTER_OPERATOR",
  "INTERNAL_ERROR",
]);

export const apiErrorResponseSchema = z.object({
  code: apiErrorCodeSchema,
  details: z.record(z.string(), jsonValueSchema).optional(),
  message: z.string().trim().min(1),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type DatasetColumnDefinition = z.infer<
  typeof datasetColumnDefinitionSchema
>;
export type DatasetFilter = z.infer<typeof datasetFilterSchema>;
export type DatasetLineageSummary = z.infer<typeof datasetLineageSummarySchema>;
export type DatasetListResponse = z.infer<typeof datasetListResponseSchema>;
export type DatasetMetadataResponse = z.infer<
  typeof datasetMetadataResponseSchema
>;
export type DatasetQueryRequest = z.infer<typeof datasetQueryRequestSchema>;
export type DatasetQueryResponse = z.infer<typeof datasetQueryResponseSchema>;
export type DatasetSort = z.infer<typeof datasetSortSchema>;
export type DatasetSummary = z.infer<typeof datasetSummarySchema>;
export type DatasetWorkspaceSummary = z.infer<
  typeof datasetWorkspaceSummarySchema
>;

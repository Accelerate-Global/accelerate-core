import { z } from "zod";

import { normalizeJsonRecord } from "@/features/datasets/types";
import type { Json } from "@/lib/supabase/database.types";

export const registeredSourceConnectorKind = {
  googleSheets: "google_sheets",
} as const;

export const ingestionRunKind = {
  sourceRead: "source_read",
} as const;

export const pipelineExecutionMode = {
  deferredScaffold: "deferred_scaffold",
} as const;

export const pipelineKey = {
  sourceIngestionScaffold: "source_ingestion_scaffold",
} as const;

export const publishRunActionType = {
  activateDatasetVersion: "activate_dataset_version",
} as const;

export const sourceReadBounds = {
  maxConfiguredRowSpan: 2000,
  maxHeaderCount: 50,
  maxMetadataBytes: 32 * 1024,
  maxSampleRows: 10,
  maxStoredCellLength: 200,
} as const;

const sheetNameSchema = z.string().trim().min(1).max(100);

const spreadsheetIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^[A-Za-z0-9-_]+$/,
    "Spreadsheet id must use Google Sheets id characters only."
  );

const boundedA1RangeSchema = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^[A-Z]{1,3}\d+:[A-Z]{1,3}\d+$/i,
    "Range must be an explicit bounded A1 range like A1:Z200."
  )
  .transform((value) => value.toUpperCase())
  .superRefine((value: string, context: z.RefinementCtx) => {
    const parsedRange = parseBoundedA1Range(value);

    if (!parsedRange) {
      context.addIssue({
        code: "custom",
        message: "Range must be an explicit bounded A1 range like A1:Z200.",
      });

      return;
    }

    if (parsedRange.endRow < parsedRange.startRow) {
      context.addIssue({
        code: "custom",
        message: "Range end row must be after the start row.",
      });
    }

    if (parsedRange.endColumn < parsedRange.startColumn) {
      context.addIssue({
        code: "custom",
        message: "Range end column must be after the start column.",
      });
    }

    if (parsedRange.rowSpan > sourceReadBounds.maxConfiguredRowSpan) {
      context.addIssue({
        code: "custom",
        message: `Range may span at most ${sourceReadBounds.maxConfiguredRowSpan} rows.`,
      });
    }
  });

export const googleSheetsSourceConfigSchema = z.object({
  range: boundedA1RangeSchema,
  sheetName: sheetNameSchema,
  spreadsheetId: spreadsheetIdSchema,
});

export const registeredSourceFormSchema = z.object({
  connectorKind: z.literal(registeredSourceConnectorKind.googleSheets),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value ? value : null)),
  isEnabled: z.coerce.boolean(),
  name: z.string().trim().min(1).max(120),
  range: boundedA1RangeSchema,
  sheetName: sheetNameSchema,
  sourceId: z
    .string()
    .trim()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  spreadsheetId: spreadsheetIdSchema,
});

export const ingestionRunMetadataSchema = z.object({
  columnCount: z.number().int().nonnegative().nullable().default(null),
  connectorDurationMs: z.number().int().nonnegative().nullable().default(null),
  dataRowCount: z.number().int().nonnegative().default(0),
  headers: z.array(z.string()).default([]),
  metadataBytes: z.number().int().nonnegative().nullable().default(null),
  rawRowCount: z.number().int().nonnegative().default(0),
  sampleRows: z.array(z.array(z.string())).default([]),
  truncated: z.object({
    cellValues: z.boolean().default(false),
    headers: z.boolean().default(false),
    metadata: z.boolean().default(false),
    sampleRows: z.boolean().default(false),
  }),
  valuesSource: z.string().trim().min(1).default("google_api"),
});

export const deferredPipelineMetadataSchema = z.object({
  deferred: z.boolean().default(true),
  executionMode: z
    .literal(pipelineExecutionMode.deferredScaffold)
    .default(pipelineExecutionMode.deferredScaffold),
  ingestionRunId: z.string().uuid().nullable().default(null),
  reason: z.string().trim().min(1),
  sourceReadSummary: z
    .object({
      columnCount: z.number().int().nonnegative().nullable().default(null),
      dataRowCount: z.number().int().nonnegative().default(0),
      valuesSource: z.string().trim().min(1).default("google_api"),
    })
    .default({
      columnCount: null,
      dataRowCount: 0,
      valuesSource: "google_api",
    }),
});

export const publishRunMetadataSchema = z.object({
  existingDomainHistoryTable: z.literal("dataset_version_events"),
  operationWrapper: z.literal(true),
  rpcResult: z.record(z.string(), z.unknown()).default({}),
});

export type GoogleSheetsSourceConfig = z.infer<
  typeof googleSheetsSourceConfigSchema
>;

export type RegisteredSourceFormValues = z.infer<
  typeof registeredSourceFormSchema
>;

export type IngestionRunMetadata = z.infer<typeof ingestionRunMetadataSchema>;
export type DeferredPipelineMetadata = z.infer<
  typeof deferredPipelineMetadataSchema
>;
export type PublishRunMetadata = z.infer<typeof publishRunMetadataSchema>;

const boundedCellReferencePattern = /^([A-Z]{1,3})(\d+)$/;

interface ParsedCellReference {
  column: number;
  row: number;
}

export interface ParsedBoundedA1Range {
  endColumn: number;
  endRow: number;
  rowSpan: number;
  startColumn: number;
  startRow: number;
}

const parseCellReference = (value: string): ParsedCellReference | null => {
  const match = boundedCellReferencePattern.exec(value);

  if (!match) {
    return null;
  }

  const [, columnLetters, rowDigits] = match;
  let column = 0;

  for (const letter of columnLetters) {
    column = column * 26 + (letter.charCodeAt(0) - 64);
  }

  return {
    column,
    row: Number.parseInt(rowDigits, 10),
  };
};

export const parseBoundedA1Range = (
  value: string
): ParsedBoundedA1Range | null => {
  const [startReference, endReference] = value.split(":");

  if (!(startReference && endReference)) {
    return null;
  }

  const start = parseCellReference(startReference);
  const end = parseCellReference(endReference);

  if (!(start && end)) {
    return null;
  }

  return {
    endColumn: end.column,
    endRow: end.row,
    rowSpan: end.row - start.row + 1,
    startColumn: start.column,
    startRow: start.row,
  };
};

export const parseGoogleSheetsSourceConfig = (
  value: Json | null | undefined
): GoogleSheetsSourceConfig | null => {
  const parsedValue = googleSheetsSourceConfigSchema.safeParse(value);

  if (parsedValue.success) {
    return parsedValue.data;
  }

  return null;
};

export const parseIngestionRunMetadata = (
  value: Json | null | undefined
): IngestionRunMetadata => {
  const parsedValue = ingestionRunMetadataSchema.safeParse(value);

  if (parsedValue.success) {
    return parsedValue.data;
  }

  return ingestionRunMetadataSchema.parse({});
};

export const parseDeferredPipelineMetadata = (
  value: Json | null | undefined
): DeferredPipelineMetadata | null => {
  const parsedValue = deferredPipelineMetadataSchema.safeParse(value);

  if (parsedValue.success) {
    return parsedValue.data;
  }

  return null;
};

export const parsePublishRunMetadata = (
  value: Json | null | undefined
): PublishRunMetadata => {
  const parsedValue = publishRunMetadataSchema.safeParse(value);

  if (parsedValue.success) {
    return parsedValue.data;
  }

  return publishRunMetadataSchema.parse({
    rpcResult: normalizeJsonRecord(value),
  });
};

export const buildGoogleSheetsValueRange = (
  config: GoogleSheetsSourceConfig
): string => {
  const escapedSheetName = config.sheetName.replace(/'/g, "''");

  return `'${escapedSheetName}'!${config.range}`;
};

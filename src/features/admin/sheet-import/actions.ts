"use server";

import { parse } from "csv-parse/sync";

import {
  type GoogleSheetsReadResult,
  readGoogleSheetValues,
} from "@/features/admin/operations/google-sheets";
import {
  type GoogleSheetsSourceConfig,
  googleSheetsSourceConfigSchema,
} from "@/features/admin/operations/source-config";
import {
  buildPreparedImportFromRows,
  type PreparedTabularImport,
  persistDatasetImport,
  toErrorMessage,
} from "@/features/admin/sheet-import/import-core";
import { requireCurrentUserAdmin } from "@/lib/auth/server";
import type { Json } from "@/lib/supabase/database.types";

const CSV_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const sanitizeCsvFileName = (name: string): string => {
  const base =
    name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 200) || "upload";
  return base.toLowerCase().endsWith(".csv") ? base : `${base}.csv`;
};

interface PreparedSheetImport {
  readResult: GoogleSheetsReadResult;
  sheetConfig: GoogleSheetsSourceConfig;
  sheetName: string;
  spreadsheetId: string;
  tabular: PreparedTabularImport;
}

const prepareSheetImportFromForm = async (
  formData: FormData
): Promise<PreparedSheetImport> => {
  const spreadsheetIdRaw = formData.get("spreadsheetId");
  const sheetNameRaw = formData.get("sheetName");
  const rangeRaw = formData.get("range");

  const spreadsheetId =
    typeof spreadsheetIdRaw === "string" && spreadsheetIdRaw.trim()
      ? spreadsheetIdRaw.trim()
      : (process.env.GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID?.trim() ?? "");

  if (!spreadsheetId) {
    throw new Error(
      "Set a spreadsheet id or configure GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID."
    );
  }

  const sheetName =
    typeof sheetNameRaw === "string" && sheetNameRaw.trim()
      ? sheetNameRaw.trim()
      : "PGAC Titled 1";

  const range =
    typeof rangeRaw === "string" && rangeRaw.trim()
      ? rangeRaw.trim()
      : "A1:ZZ2000";

  const parsedConfig = googleSheetsSourceConfigSchema.safeParse({
    range,
    sheetName,
    spreadsheetId,
  });

  if (!parsedConfig.success) {
    throw new Error(
      parsedConfig.error.issues[0]?.message ??
        "Spreadsheet id, sheet name, or range is invalid."
    );
  }

  const readResult = await readGoogleSheetValues(parsedConfig.data);
  const values = readResult.values;

  if (values.length < 2) {
    throw new Error(
      "The sheet range returned no data rows (need a header row plus at least one data row)."
    );
  }

  const headerRow = values[0] ?? [];
  const dataRows = values.slice(1);

  const tabular = buildPreparedImportFromRows(
    headerRow,
    dataRows,
    "The sheet range returned no data rows (need a header row plus at least one data row)."
  );

  return {
    readResult,
    sheetConfig: parsedConfig.data,
    sheetName,
    spreadsheetId,
    tabular,
  };
};

export const importGoogleSheetToDatasetAction = async (
  formData: FormData
): Promise<void> => {
  const actingUser = await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("Choose a target dataset.");
  }

  const prepared = await prepareSheetImportFromForm(formData);
  const sourceRef = `google_sheet:${prepared.spreadsheetId}:${prepared.sheetName}`;
  const metadata: Json = {
    googleSheet: {
      connectorDurationMs: prepared.readResult.durationMs,
      importedAt: new Date().toISOString(),
      range: prepared.sheetConfig.range,
      sheetName: prepared.sheetName,
      spreadsheetId: prepared.spreadsheetId,
      valuesSource: prepared.readResult.valuesSource,
    },
  };

  await persistDatasetImport({
    actingUser,
    changeSummary: `Imported from Google Sheet (${prepared.sheetName}).`,
    datasetId,
    metadata,
    notes: `Rows imported from Google Sheets tab "${prepared.sheetName}".`,
    pipelineRowIdPrefix: "google-sheet",
    prepared: prepared.tabular,
    sourceRef,
  });
};

export const importCsvToDatasetAction = async (
  formData: FormData
): Promise<void> => {
  const actingUser = await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");
  const fileEntry = formData.get("csvFile");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("Choose a target dataset.");
  }

  if (!(fileEntry instanceof File)) {
    throw new Error("Choose a CSV file to upload.");
  }

  if (fileEntry.size === 0) {
    throw new Error("The CSV file is empty.");
  }

  if (fileEntry.size > CSV_UPLOAD_MAX_BYTES) {
    throw new Error(
      `CSV file is too large (max ${CSV_UPLOAD_MAX_BYTES / (1024 * 1024)} MB).`
    );
  }

  const lowerName = fileEntry.name.toLowerCase();
  const hasCsvExtension = lowerName.endsWith(".csv");
  const hasCsvMime =
    fileEntry.type === "text/csv" || fileEntry.type === "application/csv";
  if (!(hasCsvExtension || hasCsvMime)) {
    throw new Error("Upload a .csv file (or a file with a CSV content type).");
  }

  const text = await fileEntry.text();
  let rows: string[][];
  try {
    rows = parse(text, {
      bom: true,
      columns: false,
      relax_column_count: true,
      skip_empty_lines: true,
    }) as string[][];
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(toErrorMessage("Could not parse CSV", message));
  }

  if (rows.length < 2) {
    throw new Error(
      "The CSV must have a header row plus at least one data row."
    );
  }

  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1);

  const safeName = sanitizeCsvFileName(fileEntry.name);
  const tabular = buildPreparedImportFromRows(
    headerRow,
    dataRows,
    "The CSV must have a header row plus at least one data row."
  );

  const sourceRef = `csv_upload:${safeName}`;
  const metadata: Json = {
    csv: {
      fileName: safeName,
      importedAt: new Date().toISOString(),
      originalFileName: fileEntry.name.slice(0, 300),
      rowCount: tabular.dataRows.length,
    },
  };

  await persistDatasetImport({
    actingUser,
    changeSummary: `Imported from CSV (${safeName}).`,
    datasetId,
    metadata,
    notes: `Rows imported from CSV file "${safeName}".`,
    pipelineRowIdPrefix: "csv",
    prepared: tabular,
    sourceRef,
  });
};

import type { ResourceColumn, ResourceRow, ResourceRowValue } from "@accelerate-core/shared";

export class CsvValidationError extends Error {}

function stripBom(value: string): string {
  return value.startsWith("\uFEFF") ? value.slice(1) : value;
}

function isRowCompletelyEmpty(row: string[]): boolean {
  return row.every((cell) => cell.length === 0);
}

function parseCsvRows(inputText: string): string[][] {
  const input = stripBom(inputText);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;

    if (inQuotes) {
      if (ch === "\"") {
        const next = input[i + 1];
        if (next === "\"") {
          cell += "\"";
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      cell += ch;
      continue;
    }

    if (ch === "\"") {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (ch === "\r") {
      continue;
    }

    cell += ch;
  }

  if (inQuotes) {
    throw new CsvValidationError("CSV has an unclosed quoted value");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export type ParsedCsvTable = {
  headers: string[];
  rows: ResourceRow[];
};

export function parseCsvTextToTable(csvText: string): ParsedCsvTable {
  if (csvText.trim().length === 0) throw new CsvValidationError("CSV is empty");

  const allRows = parseCsvRows(csvText).filter((row) => !isRowCompletelyEmpty(row));
  if (allRows.length === 0) throw new CsvValidationError("CSV has no rows");

  const rawHeaders = allRows[0] ?? [];
  if (rawHeaders.length === 1 && rawHeaders[0]?.includes(";") && !rawHeaders[0].includes(",")) {
    throw new CsvValidationError("CSV appears to use ';' delimiter. Please upload a comma-separated CSV.");
  }

  const headers = rawHeaders.map((h, idx) => (idx === 0 ? stripBom(h.trim()) : h.trim()));
  if (headers.length === 0) throw new CsvValidationError("CSV is missing a header row");
  if (headers.some((h) => h.length === 0)) throw new CsvValidationError("CSV header contains an empty column name");

  const dup = new Set<string>();
  for (const h of headers) {
    const key = h.toLowerCase();
    if (dup.has(key)) throw new CsvValidationError(`CSV header contains duplicate column: ${h}`);
    dup.add(key);
  }

  const rows: ResourceRow[] = [];
  for (let i = 1; i < allRows.length; i += 1) {
    const rowCells = allRows[i] ?? [];
    if (rowCells.length > headers.length) {
      throw new CsvValidationError(`Row ${i + 1} has ${rowCells.length} values, expected ${headers.length}`);
    }
    const record: ResourceRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c]!;
      record[key] = rowCells[c] ?? "";
    }
    rows.push(record);
  }

  return { headers, rows };
}

function normalizeCellValue(value: ResourceRowValue | undefined): string {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") return value;
  return String(value);
}

function escapeCsvCell(value: string): string {
  if (value.includes("\"")) return `"${value.replace(/"/g, "\"\"")}"`;
  if (value.includes(",") || value.includes("\n") || value.includes("\r")) return `"${value}"`;
  return value;
}

export function serializeTableToCsv(headers: string[], rows: ResourceRow[]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const row of rows) {
    const cells = headers.map((header) => escapeCsvCell(normalizeCellValue(row[header])));
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export function headersToColumns(headers: string[]): ResourceColumn[] {
  return headers.map((header) => ({
    key: header,
    label: header,
    type: "string"
  }));
}

export function normalizeTableRowsFromPatch(input: {
  headers: string[];
  rows: Array<Record<string, ResourceRowValue>>;
}): ResourceRow[] {
  const seen = new Set<string>();
  for (const header of input.headers) {
    const normalized = header.trim();
    if (!normalized) throw new CsvValidationError("Column names cannot be empty");
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) throw new CsvValidationError(`Duplicate column: ${normalized}`);
    seen.add(lower);
  }

  return input.rows.map((row) => {
    const normalizedRow: ResourceRow = {};
    for (const header of input.headers) {
      const raw = row[header];
      if (raw === null || typeof raw === "undefined") {
        normalizedRow[header] = "";
      } else if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
        normalizedRow[header] = raw;
      } else {
        normalizedRow[header] = JSON.stringify(raw);
      }
    }
    return normalizedRow;
  });
}

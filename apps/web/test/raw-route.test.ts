import assert from "node:assert/strict";
import test from "node:test";

import { buildCsvDownloadResponse } from "../src/app/api/runs/[runId]/raw/download-csv.ts";

function parseCsv(inputRaw: string): string[][] {
  const input = inputRaw.startsWith("\uFEFF") ? inputRaw.slice(1) : inputRaw;
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

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

test("download handler returns CSV stream with csv headers and filename", async () => {
  const ndjson = [JSON.stringify({ id: 1, name: "Alice" }), JSON.stringify({ id: 2, name: "Bob" })].join("\n");
  let fetchCalls = 0;

  const fetchImpl: typeof fetch = async (input, init) => {
    fetchCalls += 1;
    assert.equal(String(input), "https://example.internal/runs/run-123/raw");
    const authHeader = new Headers(init?.headers).get("authorization");
    assert.equal(authHeader, "Bearer token");

    return new Response(ndjson, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson",
        "content-disposition": "attachment; filename=\"pgic_people_groups-run-123.ndjson\""
      }
    });
  };

  const response = await buildCsvDownloadResponse({
    runId: "run-123",
    auth: "Bearer token",
    apiBaseUrl: "https://example.internal",
    fetchImpl
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.equal(response.headers.get("content-disposition"), "attachment; filename=\"pgic_people_groups-run-123.csv\"");
  assert.equal(fetchCalls, 2);

  const rows = parseCsv(await response.text());
  assert.deepEqual(rows, [
    ["id", "name"],
    ["1", "Alice"],
    ["2", "Bob"]
  ]);
});

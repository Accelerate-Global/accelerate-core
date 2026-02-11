import assert from "node:assert/strict";
import test from "node:test";

import { convertNdjsonTextToCsvForTest } from "../src/app/api/runs/[runId]/raw/ndjson-to-csv.ts";

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

test("NDJSON converts to CSV with stable headers, escaping, and missing values", async () => {
  const ndjson = [
    JSON.stringify({
      id: 1,
      name: "Alice",
      note: "hello, world",
      quote: "He said \"yes\"",
      multiline: "line-1\nline-2",
      empty: null,
      meta: { region: "east" },
      tags: ["a", "b"]
    }),
    JSON.stringify({
      id: 2,
      name: "Bob",
      active: true,
      extra: "present"
    })
  ].join("\n");

  const csv = await convertNdjsonTextToCsvForTest(ndjson);
  const rows = parseCsv(csv);

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ["active", "empty", "extra", "id", "meta", "multiline", "name", "note", "quote", "tags"]);

  const header = rows[0]!;
  const row1 = Object.fromEntries(header.map((key, idx) => [key, rows[1]![idx]]));
  const row2 = Object.fromEntries(header.map((key, idx) => [key, rows[2]![idx]]));

  assert.equal(row1.active, "");
  assert.equal(row1.empty, "");
  assert.equal(row1.extra, "");
  assert.equal(row1.id, "1");
  assert.equal(row1.meta, "{\"region\":\"east\"}");
  assert.equal(row1.multiline, "line-1\nline-2");
  assert.equal(row1.name, "Alice");
  assert.equal(row1.note, "hello, world");
  assert.equal(row1.quote, "He said \"yes\"");
  assert.equal(row1.tags, "[\"a\",\"b\"]");

  assert.equal(row2.active, "true");
  assert.equal(row2.empty, "");
  assert.equal(row2.extra, "present");
  assert.equal(row2.id, "2");
  assert.equal(row2.meta, "");
  assert.equal(row2.multiline, "");
  assert.equal(row2.name, "Bob");
  assert.equal(row2.note, "");
  assert.equal(row2.quote, "");
  assert.equal(row2.tags, "");
});

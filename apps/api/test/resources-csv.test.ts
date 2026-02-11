import assert from "node:assert/strict";
import test from "node:test";
import { CsvValidationError, parseCsvTextToTable, serializeTableToCsv } from "../src/resources/csv.ts";

test("parseCsvTextToTable parses a standard CSV into headers and rows", () => {
  const parsed = parseCsvTextToTable("code,name\nUS,United States\nCA,Canada");
  assert.deepEqual(parsed.headers, ["code", "name"]);
  assert.deepEqual(parsed.rows, [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" }
  ]);
});

test("parseCsvTextToTable rejects empty input", () => {
  assert.throws(() => parseCsvTextToTable(" \n "), CsvValidationError);
});

test("parseCsvTextToTable rejects duplicate headers", () => {
  assert.throws(() => parseCsvTextToTable("code,Code\nUS,United States"), CsvValidationError);
});

test("parseCsvTextToTable rejects semicolon-delimited header rows", () => {
  assert.throws(() => parseCsvTextToTable("code;name\nUS;United States"), CsvValidationError);
});

test("serializeTableToCsv escapes commas, quotes, and newlines", () => {
  const csv = serializeTableToCsv(["id", "note"], [
    { id: 1, note: "hello, world" },
    { id: 2, note: "He said \"yes\"" },
    { id: 3, note: "line1\nline2" }
  ]);

  assert.equal(
    csv,
    "id,note\n1,\"hello, world\"\n2,\"He said \"\"yes\"\"\"\n3,\"line1\nline2\""
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIndexLines,
  injectGeneratedIndex,
  MARKER_END,
  MARKER_START,
} from "./index.mjs";

test("buildIndexLines sorts directories and files deterministically", () => {
  const directoryToFiles = new Map([
    ["packages/beta", new Set(["z.ts", "a.ts"])],
    [".agent-docs", new Set(["workflows.md", "env.md", "overview.md"])],
  ]);

  const lines = buildIndexLines(directoryToFiles, 30);

  assert.equal(lines[0], "[Accelerate Core Repo Index]|root: .");
  assert.equal(
    lines[1],
    "|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning"
  );
  assert.equal(lines[2], "|.agent-docs:{env.md,overview.md,workflows.md}");
  assert.equal(lines[3], "|packages/beta:{a.ts,z.ts}");
});

test("buildIndexLines truncates long directory listings with +N", () => {
  const files = new Set(
    Array.from({ length: 33 }, (_, index) => `file-${String(index + 1).padStart(2, "0")}.ts`)
  );
  const directoryToFiles = new Map([["apps/api/src", files]]);

  const lines = buildIndexLines(directoryToFiles, 30);
  const sourceLine = lines.find((line) => line.startsWith("|apps/api/src:{"));

  assert.ok(sourceLine, "expected line for apps/api/src");
  assert.match(sourceLine, /\.\.\.\+3\}/);
});

test("injectGeneratedIndex replaces only the marker block", () => {
  const current = [
    "# header",
    MARKER_START,
    "old index",
    MARKER_END,
    "footer",
  ].join("\n");

  const updated = injectGeneratedIndex(current, "new index");

  assert.equal(
    updated,
    ["# header", MARKER_START, "new index", MARKER_END, "footer"].join("\n")
  );
});

test("injectGeneratedIndex throws if markers are missing", () => {
  assert.throws(() => injectGeneratedIndex("# header", "new index"));
});

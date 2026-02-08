import { PROJECT_IDS } from "@accelerate-core/shared";

export type SafeSql = string & { readonly __brand: "SafeSql" };

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertSafeIdentifier(name: string, kind: "dataset" | "table" | "column") {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Unsafe ${kind} identifier: ${name}`);
  }
}

// Very conservative SQL guardrails for V1 scaffolding.
export function assertSafeSql(sql: string): asserts sql is SafeSql {
  const trimmed = sql.trim();

  if (trimmed.length === 0) throw new Error("SQL is empty");
  if (trimmed.includes(";")) throw new Error("Multi-statement SQL is not allowed");
  if (trimmed.includes("--") || trimmed.includes("/*") || trimmed.includes("*/")) {
    throw new Error("SQL comments are not allowed");
  }

  // Disallow common DDL/DML keywords (V1: read-only).
  const upper = trimmed.toUpperCase();
  const disallowed = ["INSERT ", "UPDATE ", "DELETE ", "MERGE ", "DROP ", "ALTER ", "CREATE "];
  if (disallowed.some((kw) => upper.includes(kw))) {
    throw new Error("DDL/DML is not allowed");
  }

  // Require SELECT in V1.
  if (!upper.startsWith("SELECT ")) {
    throw new Error("Only SELECT queries are allowed");
  }
}

export function buildSelectQuery(input: {
  dataset?: string;
  table: string;
  columns?: string[];
  limit?: number;
}): SafeSql {
  const dataset = input.dataset ?? PROJECT_IDS.bigQueryDataset;
  assertSafeIdentifier(dataset, "dataset");
  assertSafeIdentifier(input.table, "table");

  const cols = (input.columns?.length ? input.columns : ["*"]).map((c) => {
    if (c === "*") return "*";
    assertSafeIdentifier(c, "column");
    return `\`${c}\``;
  });

  const limit = typeof input.limit === "number" ? Math.max(1, Math.min(10_000, input.limit)) : 100;

  const sql = `SELECT ${cols.join(", ")} FROM \`${dataset}.${input.table}\` LIMIT ${limit}`;
  assertSafeSql(sql);
  return sql;
}

export async function runQuery(_sql: SafeSql): Promise<unknown[]> {
  // TODO(V1): Implement BigQuery client execution via ADC in Cloud Run.
  // Intentionally unimplemented in scaffold to avoid accidental credentials coupling.
  return [];
}


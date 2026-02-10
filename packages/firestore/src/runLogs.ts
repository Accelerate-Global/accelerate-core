import type { RunId, RunLogEntry, RunLogLevel, RunLogSource } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS, SUBCOLLECTIONS } from "./collections";

export async function appendRunLog(input: {
  runId: RunId;
  source: RunLogSource;
  level?: RunLogLevel;
  message: string;
  tsMs?: number;
}): Promise<RunLogEntry> {
  const db = getDb();
  const tsMs = typeof input.tsMs === "number" ? input.tsMs : Date.now();
  const ts = new Date(tsMs).toISOString();

  const ref = db
    .collection(COLLECTIONS.runs)
    .doc(input.runId)
    .collection(SUBCOLLECTIONS.logs)
    .doc();

  const entry: RunLogEntry = {
    id: ref.id,
    runId: input.runId,
    ts,
    tsMs,
    source: input.source,
    level: input.level ?? "info",
    message: input.message
  };

  await ref.set(entry);
  return entry;
}

export async function listRunLogs(input: {
  runId: RunId;
  afterTsMs?: number;
  limit?: number;
}): Promise<RunLogEntry[]> {
  const db = getDb();
  const limit = typeof input.limit === "number" ? Math.max(1, Math.min(500, input.limit)) : 200;

  const col = db
    .collection(COLLECTIONS.runs)
    .doc(input.runId)
    .collection(SUBCOLLECTIONS.logs);

  // NOTE: Build the query without reusing an already-limited query instance.
  // Some SDK versions behave poorly if you chain `limit()` multiple times.
  let q = col.orderBy("tsMs", "asc");
  if (typeof input.afterTsMs === "number") {
    q = q.where("tsMs", ">", input.afterTsMs);
  }
  q = q.limit(limit);

  const snap = await q.get();
  return snap.docs.map((d) => d.data() as RunLogEntry);
}

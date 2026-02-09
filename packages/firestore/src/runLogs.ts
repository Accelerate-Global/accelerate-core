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

  let q = db
    .collection(COLLECTIONS.runs)
    .doc(input.runId)
    .collection(SUBCOLLECTIONS.logs)
    .orderBy("tsMs", "asc")
    .limit(limit);

  if (typeof input.afterTsMs === "number") {
    q = q.where("tsMs", ">", input.afterTsMs).orderBy("tsMs", "asc").limit(limit);
  }

  const snap = await q.get();
  return snap.docs.map((d) => d.data() as RunLogEntry);
}


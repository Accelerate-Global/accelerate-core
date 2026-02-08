import type { Run, RunId, RunStatus } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export async function createRun(input: {
  connectorKey?: string;
  datasetSlug?: string;
}): Promise<Run> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.runs).doc();

  const run: Run = {
    id: ref.id as RunId,
    status: "queued",
    createdAt: new Date().toISOString(),
    connectorKey: input.connectorKey,
    datasetSlug: input.datasetSlug
  };

  await ref.set(run);
  return run;
}

export async function getRunById(id: RunId): Promise<Run | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.runs).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as Run;
}

export async function setRunStatus(id: RunId, status: RunStatus): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.runs).doc(id).update({
    status
  });
}


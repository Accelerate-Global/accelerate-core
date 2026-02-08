import type { ConnectorId, DatasetId, Run, RunId, RunStatus } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export async function createRun(input: {
  connectorId: ConnectorId;
  datasetId: DatasetId;
  createdBy: { uid: string; email: string };
}): Promise<Run> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.runs).doc();

  const run: Run = {
    id: ref.id as RunId,
    status: "queued",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    connectorId: input.connectorId,
    datasetId: input.datasetId
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

export async function updateRun(id: RunId, patch: Partial<Run>): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.runs).doc(id).set(patch, { merge: true });
}

export async function listRuns(limit = 50): Promise<Run[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.runs).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as Run);
}

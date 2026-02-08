import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export type DatasetVersionRecord = {
  id: string;
  datasetSlug: string;
  createdAt: string; // ISO
  // TODO(V1): add provenance fields: connectorKey, runId, bqTable, etc.
};

export async function createDatasetVersion(input: Omit<DatasetVersionRecord, "createdAt">) {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.datasetVersions).doc(input.id);
  const record: DatasetVersionRecord = { ...input, createdAt: new Date().toISOString() };
  await ref.set(record);
  return record;
}


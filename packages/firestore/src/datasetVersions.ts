import type { DatasetId, DatasetVersion, DatasetVersionId, RunId } from "@accelerate-core/shared";
import { formatVersionId } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS, SUBCOLLECTIONS } from "./collections";

export type ReserveDatasetVersionResult = {
  datasetId: DatasetId;
  versionId: DatasetVersionId;
  versionNumber: number;
};

export async function reserveNextDatasetVersion(input: {
  datasetId: DatasetId;
}): Promise<ReserveDatasetVersionResult> {
  const db = getDb();
  const datasetRef = db.collection(COLLECTIONS.datasets).doc(input.datasetId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(datasetRef);
    if (!snap.exists) {
      throw new Error(`Dataset not found: ${input.datasetId}`);
    }

    const data = snap.data() as { nextVersionNumber?: number };
    const current = typeof data.nextVersionNumber === "number" ? data.nextVersionNumber : 1;
    const versionNumber = current;
    const next = current + 1;

    tx.update(datasetRef, {
      nextVersionNumber: next,
      updatedAt: new Date().toISOString()
    });

    return {
      datasetId: input.datasetId,
      versionNumber,
      versionId: formatVersionId(versionNumber)
    } satisfies ReserveDatasetVersionResult;
  });

  return result;
}

export function datasetVersionDocPath(datasetId: DatasetId, versionId: DatasetVersionId): string {
  return `${COLLECTIONS.datasetVersions}/${datasetId}/${SUBCOLLECTIONS.versions}/${versionId}`;
}

export async function createDatasetVersion(input: {
  datasetId: DatasetId;
  versionId: DatasetVersionId;
  versionNumber: number;
  runId: RunId;
  connectorId: string;
  rowCount?: number;
  bigQuery: DatasetVersion["bigQuery"];
  gcs: DatasetVersion["gcs"];
}): Promise<DatasetVersion> {
  const db = getDb();
  const containerRef = db.collection(COLLECTIONS.datasetVersions).doc(input.datasetId);
  const versionRef = containerRef.collection(SUBCOLLECTIONS.versions).doc(input.versionId);

  const record: DatasetVersion = {
    id: input.versionId,
    datasetId: input.datasetId,
    versionNumber: input.versionNumber,
    createdAt: new Date().toISOString(),
    runId: input.runId,
    connectorId: input.connectorId,
    rowCount: input.rowCount,
    bigQuery: input.bigQuery,
    gcs: input.gcs
  };

  await db.runTransaction(async (tx) => {
    tx.set(containerRef, { datasetId: input.datasetId }, { merge: true });
    tx.create(versionRef, record);
    tx.set(
      db.collection(COLLECTIONS.datasets).doc(input.datasetId),
      {
        latestVersionId: input.versionId,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  });

  return record;
}

export async function getDatasetVersionById(
  datasetId: DatasetId,
  versionId: DatasetVersionId
): Promise<DatasetVersion | null> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTIONS.datasetVersions)
    .doc(datasetId)
    .collection(SUBCOLLECTIONS.versions)
    .doc(versionId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as DatasetVersion;
}

export async function listDatasetVersions(datasetId: DatasetId, limit = 20): Promise<DatasetVersion[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTIONS.datasetVersions)
    .doc(datasetId)
    .collection(SUBCOLLECTIONS.versions)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as DatasetVersion);
}


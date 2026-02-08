import type { Dataset, DatasetId } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export async function upsertDataset(dataset: Dataset): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.datasets).doc(dataset.id).set(dataset, { merge: true });
}

export async function getDatasetById(id: DatasetId): Promise<Dataset | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.datasets).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as Dataset;
}

export async function listDatasets(limit = 50): Promise<Dataset[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.datasets).limit(limit).get();
  return snap.docs.map((d) => d.data() as Dataset);
}

export async function ensureDataset(input: {
  id: DatasetId;
  displayName: string;
  description?: string;
}): Promise<Dataset> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.datasets).doc(input.id);

  const now = new Date().toISOString();

  const dataset = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as Dataset;
      const patch: Partial<Dataset> = {
        displayName: input.displayName ?? existing.displayName,
        description: input.description ?? existing.description,
        updatedAt: now
      };
      tx.set(ref, patch, { merge: true });
      return { ...existing, ...patch } as Dataset;
    }

    const created: Dataset = {
      id: input.id,
      displayName: input.displayName,
      description: input.description,
      createdAt: now,
      updatedAt: now,
      nextVersionNumber: 1
    };
    tx.set(ref, created);
    return created;
  });

  return dataset;
}

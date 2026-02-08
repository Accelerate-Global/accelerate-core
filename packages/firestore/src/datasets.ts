import type { Dataset, DatasetSlug } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export async function upsertDataset(dataset: Dataset): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.datasets).doc(dataset.slug).set(dataset, { merge: true });
}

export async function getDatasetBySlug(slug: DatasetSlug): Promise<Dataset | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.datasets).doc(slug).get();
  if (!snap.exists) return null;
  return snap.data() as Dataset;
}

export async function listDatasets(limit = 50): Promise<Dataset[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.datasets).limit(limit).get();
  return snap.docs.map((d) => d.data() as Dataset);
}


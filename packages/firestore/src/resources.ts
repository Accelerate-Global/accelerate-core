import type { Resource, ResourceId, ResourceVersionId } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

type Actor = {
  uid: string;
  email: string;
};

export async function createResource(input: {
  slug: string;
  name: string;
  description?: string;
  createdBy: Actor;
}): Promise<Resource> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.resources).doc(input.slug);
  const now = new Date().toISOString();

  const resource: Resource = {
    id: input.slug,
    slug: input.slug,
    name: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
    nextVersionNumber: 1
  };

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      throw new Error(`Resource already exists: ${input.slug}`);
    }
    tx.create(ref, resource);
  });

  return resource;
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.resources).doc(slug).get();
  if (!snap.exists) return null;
  return snap.data() as Resource;
}

export async function listResources(limit = 100): Promise<Resource[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.resources).orderBy("updatedAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as Resource);
}

export async function setResourceCurrentVersion(input: {
  resourceId: ResourceId;
  versionId: ResourceVersionId;
  updatedBy: Actor;
}): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.resources).doc(input.resourceId).set(
    {
      currentVersionId: input.versionId,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy
    },
    { merge: true }
  );
}

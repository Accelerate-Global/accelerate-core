import type { Resource, ResourceId, ResourceVersionId } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

type Actor = {
  uid: string;
  email: string;
};

function normalizeResource(resourceId: string, data: Partial<Resource>): Resource {
  const now = new Date().toISOString();
  return {
    id: resourceId,
    slug: typeof data.slug === "string" && data.slug.length > 0 ? data.slug : resourceId,
    name: typeof data.name === "string" && data.name.length > 0 ? data.name : resourceId,
    description: typeof data.description === "string" ? data.description : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
    createdBy: data.createdBy ?? { uid: "unknown", email: "unknown" },
    updatedBy: data.updatedBy ?? data.createdBy ?? { uid: "unknown", email: "unknown" },
    currentVersionId: data.currentVersionId,
    nextVersionNumber: typeof data.nextVersionNumber === "number" && data.nextVersionNumber >= 1 ? data.nextVersionNumber : 1
  };
}

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

    const slugDupes = await tx.get(
      db.collection(COLLECTIONS.resources).where("slug", "==", input.slug).limit(1)
    );
    if (!slugDupes.empty) {
      throw new Error(`Resource already exists: ${input.slug}`);
    }
    tx.create(ref, resource);
  });

  return resource;
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  return getResourceByIdentifier(slug);
}

export async function getResourceByIdentifier(identifier: string): Promise<Resource | null> {
  const db = getDb();
  const byIdSnap = await db.collection(COLLECTIONS.resources).doc(identifier).get();
  if (byIdSnap.exists) {
    return normalizeResource(byIdSnap.id, byIdSnap.data() as Partial<Resource>);
  }

  const bySlugSnap = await db
    .collection(COLLECTIONS.resources)
    .where("slug", "==", identifier)
    .limit(1)
    .get();
  if (bySlugSnap.empty) return null;

  const match = bySlugSnap.docs[0];
  if (!match) return null;
  return normalizeResource(match.id, match.data() as Partial<Resource>);
}

export async function listResources(limit = 100): Promise<Resource[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.resources).orderBy("updatedAt", "desc").limit(limit).get();
  return snap.docs.map((d) => normalizeResource(d.id, d.data() as Partial<Resource>));
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

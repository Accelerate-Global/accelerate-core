import type {
  ResourceColumn,
  ResourceId,
  ResourceVersion,
  ResourceVersionId,
  ResourceVersionSource,
  Resource
} from "@accelerate-core/shared";
import { formatResourceVersionId } from "@accelerate-core/shared";
import { getDb } from "./admin";
import { COLLECTIONS, SUBCOLLECTIONS } from "./collections";

type Actor = {
  uid: string;
  email: string;
};

export type ReserveResourceVersionResult = {
  resourceId: ResourceId;
  versionId: ResourceVersionId;
  versionNumber: number;
  previousCurrentVersionId?: ResourceVersionId;
};

export async function reserveNextResourceVersion(input: { resourceId: ResourceId }): Promise<ReserveResourceVersionResult> {
  const db = getDb();
  const resourceRef = db.collection(COLLECTIONS.resources).doc(input.resourceId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(resourceRef);
    if (!snap.exists) {
      throw new Error(`Resource not found: ${input.resourceId}`);
    }

    const resource = snap.data() as Resource;
    const current = typeof resource.nextVersionNumber === "number" ? resource.nextVersionNumber : 1;
    const versionNumber = current;
    const next = current + 1;

    tx.update(resourceRef, {
      nextVersionNumber: next,
      updatedAt: new Date().toISOString()
    });

    return {
      resourceId: input.resourceId,
      versionId: formatResourceVersionId(versionNumber),
      versionNumber,
      previousCurrentVersionId: resource.currentVersionId
    } satisfies ReserveResourceVersionResult;
  });

  return result;
}

export function resourceVersionDocPath(resourceId: ResourceId, versionId: ResourceVersionId): string {
  return `${COLLECTIONS.resourceVersions}/${resourceId}/${SUBCOLLECTIONS.versions}/${versionId}`;
}

export async function createResourceVersion(input: {
  resourceId: ResourceId;
  slug: string;
  versionId: ResourceVersionId;
  versionNumber: number;
  createdBy: Actor;
  source: ResourceVersionSource;
  basedOnVersionId?: ResourceVersionId;
  rowCount: number;
  columnCount: number;
  columns: ResourceColumn[];
  storage: ResourceVersion["storage"];
  archivePreviousVersionId?: ResourceVersionId;
}): Promise<ResourceVersion> {
  const db = getDb();
  const containerRef = db.collection(COLLECTIONS.resourceVersions).doc(input.resourceId);
  const versionRef = containerRef.collection(SUBCOLLECTIONS.versions).doc(input.versionId);
  const resourceRef = db.collection(COLLECTIONS.resources).doc(input.resourceId);

  const now = new Date().toISOString();
  const record: ResourceVersion = {
    id: input.versionId,
    resourceId: input.resourceId,
    slug: input.slug,
    versionNumber: input.versionNumber,
    createdAt: now,
    createdBy: input.createdBy,
    source: input.source,
    basedOnVersionId: input.basedOnVersionId,
    isArchived: false,
    rowCount: input.rowCount,
    columnCount: input.columnCount,
    columns: input.columns,
    storage: input.storage
  };

  await db.runTransaction(async (tx) => {
    tx.set(containerRef, { resourceId: input.resourceId, slug: input.slug }, { merge: true });
    tx.create(versionRef, record);
    tx.set(
      resourceRef,
      {
        currentVersionId: input.versionId,
        updatedAt: now,
        updatedBy: input.createdBy
      },
      { merge: true }
    );

    if (input.archivePreviousVersionId && input.archivePreviousVersionId !== input.versionId) {
      const previousRef = containerRef.collection(SUBCOLLECTIONS.versions).doc(input.archivePreviousVersionId);
      tx.set(previousRef, { isArchived: true }, { merge: true });
    }
  });

  return record;
}

export async function getResourceVersionById(
  resourceId: ResourceId,
  versionId: ResourceVersionId
): Promise<ResourceVersion | null> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTIONS.resourceVersions)
    .doc(resourceId)
    .collection(SUBCOLLECTIONS.versions)
    .doc(versionId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as ResourceVersion;
}

export async function listResourceVersions(resourceId: ResourceId, limit = 100): Promise<ResourceVersion[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTIONS.resourceVersions)
    .doc(resourceId)
    .collection(SUBCOLLECTIONS.versions)
    .orderBy("versionNumber", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as ResourceVersion);
}

export async function setCurrentResourceVersion(input: {
  resourceId: ResourceId;
  versionId: ResourceVersionId;
  updatedBy: Actor;
}): Promise<void> {
  const db = getDb();
  const resourceRef = db.collection(COLLECTIONS.resources).doc(input.resourceId);
  const versionsRef = db.collection(COLLECTIONS.resourceVersions).doc(input.resourceId).collection(SUBCOLLECTIONS.versions);
  const targetRef = versionsRef.doc(input.versionId);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const [resourceSnap, targetSnap] = await Promise.all([tx.get(resourceRef), tx.get(targetRef)]);
    if (!resourceSnap.exists) throw new Error(`Resource not found: ${input.resourceId}`);
    if (!targetSnap.exists) throw new Error(`Resource version not found: ${input.versionId}`);

    const resource = resourceSnap.data() as Resource;
    const previous = resource.currentVersionId;
    if (previous && previous !== input.versionId) {
      tx.set(versionsRef.doc(previous), { isArchived: true }, { merge: true });
    }
    tx.set(targetRef, { isArchived: false }, { merge: true });
    tx.set(
      resourceRef,
      {
        currentVersionId: input.versionId,
        updatedAt: now,
        updatedBy: input.updatedBy
      },
      { merge: true }
    );
  });
}

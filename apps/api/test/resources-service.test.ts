import assert from "node:assert/strict";
import test from "node:test";
import type { Resource, ResourceColumn, ResourceId, ResourceVersion, ResourceVersionId } from "@accelerate-core/shared";
import { buildResourceService, type ResourceBlobStore, type ResourceStore } from "../src/resources/service.ts";

type Actor = { uid: string; email: string };

function clone<T>(value: T): T {
  return structuredClone(value);
}

class MemoryStore implements ResourceStore {
  private readonly resources = new Map<string, Resource>();
  private readonly versions = new Map<string, Map<string, ResourceVersion>>();

  async createResource(input: { slug: string; name: string; description?: string; createdBy: Actor }): Promise<Resource> {
    if (this.resources.has(input.slug)) throw new Error(`Resource already exists: ${input.slug}`);
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
    this.resources.set(input.slug, clone(resource));
    this.versions.set(input.slug, new Map());
    return clone(resource);
  }

  async listResources(): Promise<Resource[]> {
    return Array.from(this.resources.values())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((resource) => clone(resource));
  }

  async getResourceBySlug(slug: string): Promise<Resource | null> {
    const resource = this.resources.get(slug);
    return resource ? clone(resource) : null;
  }

  async reserveNextVersion(input: {
    resourceId: ResourceId;
  }): Promise<{ resourceId: ResourceId; versionId: ResourceVersionId; versionNumber: number; previousCurrentVersionId?: ResourceVersionId }> {
    const resource = this.resources.get(input.resourceId);
    if (!resource) throw new Error(`Resource not found: ${input.resourceId}`);
    const versionNumber = resource.nextVersionNumber;
    resource.nextVersionNumber += 1;
    this.resources.set(input.resourceId, clone(resource));
    return {
      resourceId: input.resourceId,
      versionId: `v${String(versionNumber).padStart(6, "0")}`,
      versionNumber,
      previousCurrentVersionId: resource.currentVersionId
    };
  }

  async createVersion(input: {
    resourceId: ResourceId;
    slug: string;
    versionId: ResourceVersionId;
    versionNumber: number;
    createdBy: Actor;
    source: ResourceVersion["source"];
    basedOnVersionId?: ResourceVersionId;
    rowCount: number;
    columnCount: number;
    columns: ResourceColumn[];
    storage: ResourceVersion["storage"];
    archivePreviousVersionId?: ResourceVersionId;
  }): Promise<ResourceVersion> {
    const resource = this.resources.get(input.resourceId);
    if (!resource) throw new Error(`Resource not found: ${input.resourceId}`);
    const versions = this.versions.get(input.resourceId);
    if (!versions) throw new Error(`Resource not found: ${input.resourceId}`);
    if (versions.has(input.versionId)) throw new Error(`Version already exists: ${input.versionId}`);

    if (input.archivePreviousVersionId) {
      const previous = versions.get(input.archivePreviousVersionId);
      if (previous) {
        previous.isArchived = true;
        versions.set(previous.id, clone(previous));
      }
    }

    const now = new Date().toISOString();
    const version: ResourceVersion = {
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
    versions.set(version.id, clone(version));

    resource.currentVersionId = version.id;
    resource.updatedAt = now;
    resource.updatedBy = input.createdBy;
    this.resources.set(resource.id, clone(resource));

    return clone(version);
  }

  async listVersions(resourceId: ResourceId): Promise<ResourceVersion[]> {
    const versions = this.versions.get(resourceId);
    if (!versions) return [];
    return Array.from(versions.values())
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((version) => clone(version));
  }

  async getVersionById(resourceId: ResourceId, versionId: ResourceVersionId): Promise<ResourceVersion | null> {
    const versions = this.versions.get(resourceId);
    if (!versions) return null;
    const version = versions.get(versionId);
    return version ? clone(version) : null;
  }

  async setCurrentVersion(input: { resourceId: ResourceId; versionId: ResourceVersionId; updatedBy: Actor }): Promise<void> {
    const resource = this.resources.get(input.resourceId);
    const versions = this.versions.get(input.resourceId);
    if (!resource || !versions) throw new Error(`Resource not found: ${input.resourceId}`);

    const target = versions.get(input.versionId);
    if (!target) throw new Error(`Resource version not found: ${input.versionId}`);

    if (resource.currentVersionId && resource.currentVersionId !== input.versionId) {
      const previous = versions.get(resource.currentVersionId);
      if (previous) {
        previous.isArchived = true;
        versions.set(previous.id, clone(previous));
      }
    }

    target.isArchived = false;
    versions.set(target.id, clone(target));
    resource.currentVersionId = target.id;
    resource.updatedBy = input.updatedBy;
    resource.updatedAt = new Date().toISOString();
    this.resources.set(resource.id, clone(resource));
  }
}

class MemoryBlobStore implements ResourceBlobStore {
  private readonly files = new Map<string, string>();

  async writeText(path: string, content: string, _contentType: string): Promise<void> {
    this.files.set(path, content);
  }

  async readText(path: string): Promise<string> {
    const value = this.files.get(path);
    if (typeof value !== "string") throw new Error(`Missing blob: ${path}`);
    return value;
  }
}

test("resource service supports create/list/upload/edit/restore and keeps old versions accessible", async () => {
  const store = new MemoryStore();
  const blobs = new MemoryBlobStore();
  const service = buildResourceService({
    store,
    blobs,
    bucketName: "test-bucket"
  });
  const actor = { uid: "u-1", email: "admin@example.com" };

  await service.createResource({
    slug: "country_codes",
    name: "Country Codes",
    description: "Canonical country names",
    actor
  });
  const list = await service.listResources();
  assert.equal(list.length, 1);
  assert.equal(list[0]?.slug, "country_codes");
  assert.equal(list[0]?.currentVersionId, undefined);

  const upload1 = await service.uploadCsvAsNewVersion({
    slug: "country_codes",
    csvText: "code,name\nUS,United States\nCA,Canada",
    actor
  });
  assert.equal(upload1.version.id, "v000001");
  assert.equal(upload1.resource.currentVersionId, "v000001");

  const upload2 = await service.uploadCsvAsNewVersion({
    slug: "country_codes",
    csvText: "code,name\nUS,United States of America\nCA,Canada",
    actor
  });
  assert.equal(upload2.version.id, "v000002");
  assert.equal(upload2.resource.currentVersionId, "v000002");

  const afterUploadVersions = await service.listResourceVersions("country_codes");
  assert.equal(afterUploadVersions.versions.length, 2);
  assert.equal(afterUploadVersions.versions[0]?.id, "v000002");
  assert.equal(afterUploadVersions.versions[1]?.id, "v000001");
  assert.equal(afterUploadVersions.versions[1]?.isArchived, true);

  const edit = await service.saveEditedData({
    slug: "country_codes",
    headers: ["code", "name"],
    rows: [
      { code: "US", name: "United States of America" },
      { code: "CA", name: "Canada" },
      { code: "MX", name: "Mexico" }
    ],
    actor,
    basedOnVersionId: "v000002"
  });
  assert.equal(edit.version.id, "v000003");
  assert.equal(edit.resource.currentVersionId, "v000003");

  const restored = await service.restoreVersion({
    slug: "country_codes",
    versionId: "v000001",
    actor
  });
  assert.equal(restored.version.id, "v000004");
  assert.equal(restored.version.source, "restore");
  assert.equal(restored.resource.currentVersionId, "v000004");

  const oldSnapshot = await service.getResourceVersion("country_codes", "v000001");
  assert.ok(oldSnapshot);
  assert.equal(oldSnapshot?.table.rows.length, 2);

  const restoredSnapshot = await service.getResourceVersion("country_codes", "v000004");
  assert.ok(restoredSnapshot);
  assert.equal(restoredSnapshot?.table.rows.length, 2);
  assert.equal(String(restoredSnapshot?.table.rows[0]?.name ?? ""), "United States");
});

import assert from "node:assert/strict";
import test from "node:test";
import type { Resource, ResourceColumn, ResourceId, ResourceVersion, ResourceVersionId } from "@accelerate-core/shared";
import { buildServer } from "../src/server.ts";
import { type ResourceBlobStore, type ResourceStore } from "../src/resources/service.ts";

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
    return Array.from(this.resources.values()).map((item) => clone(item));
  }

  async getResourceByIdentifier(identifier: string): Promise<Resource | null> {
    const resource = this.resources.get(identifier);
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
    this.resources.set(input.resourceId, clone(resource));
    return clone(version);
  }

  async listVersions(resourceId: ResourceId): Promise<ResourceVersion[]> {
    const versions = this.versions.get(resourceId);
    if (!versions) return [];
    return Array.from(versions.values())
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((item) => clone(item));
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

test("resources routes support create, upload, and preview via fastify inject", async (t) => {
  const app = await buildServer({
    authMode: "bypass",
    bypassAuth: { uid: "u-1", email: "admin@example.com" },
    resourceStore: new MemoryStore(),
    resourceBlobs: new MemoryBlobStore()
  });

  t.after(async () => {
    await app.close();
  });

  const createRes = await app.inject({
    method: "POST",
    url: "/resources",
    payload: {
      slug: "country_codes",
      name: "Country Codes",
      description: "Country names"
    }
  });
  assert.equal(createRes.statusCode, 200);
  const createJson = createRes.json() as { resource?: Resource };
  assert.equal(createJson.resource?.slug, "country_codes");

  const uploadRes = await app.inject({
    method: "POST",
    url: "/resources/country_codes/upload",
    payload: {
      csvText: "code,name\nUS,United States\nCA,Canada",
      fileName: "country_codes.csv"
    }
  });
  assert.equal(uploadRes.statusCode, 200);
  const uploadJson = uploadRes.json() as { version?: ResourceVersion; resource?: Resource };
  assert.equal(uploadJson.version?.id, "v000001");
  assert.equal(uploadJson.resource?.currentVersionId, "v000001");

  const previewRes = await app.inject({
    method: "GET",
    url: "/resources/country_codes/preview?limit=1&offset=1"
  });
  assert.equal(previewRes.statusCode, 200);
  const previewJson = previewRes.json() as {
    rowCount?: number;
    rows?: Array<Record<string, string | number | boolean | null>>;
    columns?: Array<{ key?: string }>;
  };
  assert.equal(previewJson.rowCount, 2);
  assert.equal(previewJson.rows?.length, 1);
  assert.equal(String(previewJson.rows?.[0]?.name ?? ""), "Canada");
  assert.equal(previewJson.columns?.[0]?.key, "code");
});

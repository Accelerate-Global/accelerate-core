import { Storage } from "@google-cloud/storage";
import type {
  Resource,
  ResourceColumn,
  ResourceId,
  ResourceRow,
  ResourceRowValue,
  ResourceVersion,
  ResourceVersionId
} from "@accelerate-core/shared";
import {
  createResource as createResourceRecord,
  createResourceVersion,
  getResourceByIdentifier,
  getResourceVersionById,
  listResources as listResourceRecords,
  listResourceVersions,
  reserveNextResourceVersion,
  setCurrentResourceVersion,
  type ReserveResourceVersionResult
} from "@accelerate-core/firestore";
import {
  CsvValidationError,
  headersToColumns,
  normalizeTableRowsFromPatch,
  parseCsvTextToTable,
  serializeTableToCsv
} from "./csv";

type Actor = {
  uid: string;
  email: string;
};

export type ResourceTableSnapshot = {
  columns: ResourceColumn[];
  rows: ResourceRow[];
};

export type ResourceBlobStore = {
  writeText(path: string, content: string, contentType: string): Promise<void>;
  readText(path: string): Promise<string>;
};

export type ResourceStore = {
  createResource(input: { slug: string; name: string; description?: string; createdBy: Actor }): Promise<Resource>;
  listResources(limit?: number): Promise<Resource[]>;
  getResourceByIdentifier(identifier: string): Promise<Resource | null>;
  reserveNextVersion(input: { resourceId: ResourceId }): Promise<ReserveResourceVersionResult>;
  createVersion(input: {
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
  }): Promise<ResourceVersion>;
  listVersions(resourceId: ResourceId, limit?: number): Promise<ResourceVersion[]>;
  getVersionById(resourceId: ResourceId, versionId: ResourceVersionId): Promise<ResourceVersion | null>;
  setCurrentVersion(input: { resourceId: ResourceId; versionId: ResourceVersionId; updatedBy: Actor }): Promise<void>;
};

function resourceVersionBasePath(slug: string, versionId: string): string {
  return `resources/${slug}/${versionId}`;
}

function parseStoredTable(value: string): ResourceTableSnapshot {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid stored table");

  const columnsRaw = (parsed as { columns?: unknown }).columns;
  const rowsRaw = (parsed as { rows?: unknown }).rows;
  if (!Array.isArray(columnsRaw) || !Array.isArray(rowsRaw)) throw new Error("Invalid stored table");

  const columns: ResourceColumn[] = columnsRaw.map((column) => {
    if (!column || typeof column !== "object") throw new Error("Invalid stored column");
    const record = column as { key?: unknown; label?: unknown; type?: unknown };
    if (typeof record.key !== "string" || typeof record.label !== "string") throw new Error("Invalid stored column");
    return {
      key: record.key,
      label: record.label,
      type:
        record.type === "number" || record.type === "boolean" || record.type === "json" || record.type === "string"
          ? record.type
          : "string"
    };
  });

  const rows: ResourceRow[] = rowsRaw.map((row) => {
    if (!row || typeof row !== "object") throw new Error("Invalid stored row");
    const out: ResourceRow = {};
    for (const key of columns.map((col) => col.key)) {
      const value = (row as Record<string, unknown>)[key];
      if (value === null || typeof value === "undefined") out[key] = "";
      else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
      else out[key] = JSON.stringify(value);
    }
    return out;
  });

  return { columns, rows };
}

function toStorageRecord(table: ResourceTableSnapshot): string {
  return JSON.stringify({
    columns: table.columns,
    rows: table.rows
  });
}

function inferTableHeaders(columns: ResourceColumn[]): string[] {
  return columns.map((column) => column.key);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function createGcsBlobStore(input: { projectId: string; bucketName: string }): ResourceBlobStore {
  const storage = new Storage({ projectId: input.projectId });
  const bucket = storage.bucket(input.bucketName);

  return {
    async writeText(path: string, content: string, contentType: string): Promise<void> {
      await bucket.file(path).save(content, {
        resumable: false,
        contentType
      });
    },
    async readText(path: string): Promise<string> {
      const [buffer] = await bucket.file(path).download();
      return buffer.toString("utf8");
    }
  };
}

export function createFirestoreResourceStore(): ResourceStore {
  return {
    createResource: createResourceRecord,
    listResources: listResourceRecords,
    getResourceByIdentifier,
    reserveNextVersion: reserveNextResourceVersion,
    createVersion: createResourceVersion,
    listVersions: listResourceVersions,
    getVersionById: getResourceVersionById,
    setCurrentVersion: setCurrentResourceVersion
  };
}

export function buildResourceService(input: { store: ResourceStore; blobs: ResourceBlobStore; bucketName: string }) {
  const { store, blobs, bucketName } = input;

  const maxCsvBytes = parsePositiveInt(process.env.RESOURCE_CSV_MAX_BYTES, 5_000_000);
  const cacheTtlMs = parsePositiveInt(process.env.RESOURCE_TABLE_CACHE_TTL_MS, 30_000);
  const cacheMaxEntries = parsePositiveInt(process.env.RESOURCE_TABLE_CACHE_MAX_ENTRIES, 25);
  const tableCache = new Map<string, { expiresAt: number; table: ResourceTableSnapshot }>();

  function getCachedTable(path: string): ResourceTableSnapshot | null {
    const cached = tableCache.get(path);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      tableCache.delete(path);
      return null;
    }
    return cached.table;
  }

  function setCachedTable(path: string, table: ResourceTableSnapshot): void {
    tableCache.delete(path);
    tableCache.set(path, { expiresAt: Date.now() + cacheTtlMs, table });
    while (tableCache.size > cacheMaxEntries) {
      const oldest = tableCache.keys().next().value;
      if (!oldest) break;
      tableCache.delete(oldest);
    }
  }

  async function readTableFromVersion(version: ResourceVersion): Promise<ResourceTableSnapshot> {
    const cached = getCachedTable(version.storage.tableJsonPath);
    if (cached) return cached;
    const raw = await blobs.readText(version.storage.tableJsonPath);
    const parsed = parseStoredTable(raw);
    setCachedTable(version.storage.tableJsonPath, parsed);
    return parsed;
  }

  async function createVersionFromTable(inputVersion: {
    resource: Resource;
    table: ResourceTableSnapshot;
    createdBy: Actor;
    source: ResourceVersion["source"];
    basedOnVersionId?: ResourceVersionId;
    rawCsvText?: string;
  }): Promise<ResourceVersion> {
    const reserved = await store.reserveNextVersion({ resourceId: inputVersion.resource.id });
    const basePath = resourceVersionBasePath(inputVersion.resource.slug, reserved.versionId);
    const rawCsvPath = `${basePath}/raw.csv`;
    const tableJsonPath = `${basePath}/table.json`;

    const headers = inferTableHeaders(inputVersion.table.columns);
    const csvText = inputVersion.rawCsvText ?? serializeTableToCsv(headers, inputVersion.table.rows);

    await blobs.writeText(rawCsvPath, csvText, "text/csv; charset=utf-8");
    await blobs.writeText(tableJsonPath, toStorageRecord(inputVersion.table), "application/json; charset=utf-8");

    return store.createVersion({
      resourceId: inputVersion.resource.id,
      slug: inputVersion.resource.slug,
      versionId: reserved.versionId,
      versionNumber: reserved.versionNumber,
      createdBy: inputVersion.createdBy,
      source: inputVersion.source,
      basedOnVersionId: inputVersion.basedOnVersionId,
      rowCount: inputVersion.table.rows.length,
      columnCount: inputVersion.table.columns.length,
      columns: inputVersion.table.columns,
      storage: {
        bucket: bucketName,
        rawCsvPath,
        tableJsonPath
      },
      archivePreviousVersionId: reserved.previousCurrentVersionId
    });
  }

  async function resolveResource(identifier: string): Promise<Resource> {
    const resource = await store.getResourceByIdentifier(identifier);
    if (!resource) throw new Error("Resource not found");
    return resource;
  }

  return {
    async listResources(limit = 100): Promise<Resource[]> {
      return store.listResources(limit);
    },

    async createResource(inputResource: {
      slug: string;
      name: string;
      description?: string;
      actor: Actor;
    }): Promise<Resource> {
      return store.createResource({
        slug: inputResource.slug,
        name: inputResource.name,
        description: inputResource.description,
        createdBy: inputResource.actor
      });
    },

    async getResourceWithCurrentTable(resourceIdentifier: string): Promise<{
      resource: Resource;
      currentVersion: ResourceVersion | null;
      table: ResourceTableSnapshot | null;
    } | null> {
      const resource = await store.getResourceByIdentifier(resourceIdentifier);
      if (!resource) return null;
      if (!resource.currentVersionId) return { resource, currentVersion: null, table: null };

      const currentVersion = await store.getVersionById(resource.id, resource.currentVersionId);
      if (!currentVersion) return { resource, currentVersion: null, table: null };

      return {
        resource,
        currentVersion,
        table: await readTableFromVersion(currentVersion)
      };
    },

    async uploadCsvAsNewVersion(inputVersion: {
      resourceIdentifier: string;
      csvText: string;
      actor: Actor;
    }): Promise<{ resource: Resource; version: ResourceVersion }> {
      const resource = await resolveResource(inputVersion.resourceIdentifier);
      const csvBytes = Buffer.byteLength(inputVersion.csvText, "utf8");
      if (csvBytes > maxCsvBytes) {
        throw new CsvValidationError(
          `CSV exceeds max size (${csvBytes} bytes > ${maxCsvBytes} bytes). Reduce file size and retry.`
        );
      }

      const parsed = parseCsvTextToTable(inputVersion.csvText);
      const table: ResourceTableSnapshot = {
        columns: headersToColumns(parsed.headers),
        rows: parsed.rows
      };

      const version = await createVersionFromTable({
        resource,
        table,
        createdBy: inputVersion.actor,
        source: "csv_upload",
        basedOnVersionId: resource.currentVersionId,
        rawCsvText: inputVersion.csvText
      });

      const refreshed = await store.getResourceByIdentifier(resource.id);
      if (!refreshed) throw new Error("Resource not found after version creation");
      return { resource: refreshed, version };
    },

    async listResourceVersions(resourceIdentifier: string): Promise<{ resource: Resource; versions: ResourceVersion[] }> {
      const resource = await resolveResource(resourceIdentifier);
      const versions = await store.listVersions(resource.id, 200);
      return { resource, versions };
    },

    async getResourceVersion(resourceIdentifier: string, versionId: string): Promise<{
      resource: Resource;
      version: ResourceVersion;
      table: ResourceTableSnapshot;
    } | null> {
      const resource = await store.getResourceByIdentifier(resourceIdentifier);
      if (!resource) return null;

      const version = await store.getVersionById(resource.id, versionId);
      if (!version) return null;

      const table = await readTableFromVersion(version);
      return { resource, version, table };
    },

    async restoreVersion(inputRestore: { resourceIdentifier: string; versionId: string; actor: Actor }): Promise<{
      resource: Resource;
      version: ResourceVersion;
    }> {
      const snapshot = await (async () => {
        const resource = await store.getResourceByIdentifier(inputRestore.resourceIdentifier);
        if (!resource) return null;
        const version = await store.getVersionById(resource.id, inputRestore.versionId);
        if (!version) return null;
        return {
          resource,
          version,
          table: await readTableFromVersion(version)
        };
      })();
      if (!snapshot) throw new Error("Resource/version not found");

      const version = await createVersionFromTable({
        resource: snapshot.resource,
        table: snapshot.table,
        createdBy: inputRestore.actor,
        source: "restore",
        basedOnVersionId: snapshot.version.id
      });

      const refreshed = await store.getResourceByIdentifier(snapshot.resource.id);
      if (!refreshed) throw new Error("Resource not found after restore");
      return { resource: refreshed, version };
    },

    async saveEditedData(inputEdit: {
      resourceIdentifier: string;
      headers: string[];
      rows: Array<Record<string, ResourceRowValue>>;
      actor: Actor;
      basedOnVersionId?: string;
    }): Promise<{ resource: Resource; version: ResourceVersion }> {
      const resource = await resolveResource(inputEdit.resourceIdentifier);

      const normalizedRows = normalizeTableRowsFromPatch({
        headers: inputEdit.headers,
        rows: inputEdit.rows
      });
      const table: ResourceTableSnapshot = {
        columns: headersToColumns(inputEdit.headers),
        rows: normalizedRows
      };

      const version = await createVersionFromTable({
        resource,
        table,
        createdBy: inputEdit.actor,
        source: "edit",
        basedOnVersionId: inputEdit.basedOnVersionId ?? resource.currentVersionId
      });

      const refreshed = await store.getResourceByIdentifier(resource.id);
      if (!refreshed) throw new Error("Resource not found after edit save");
      return { resource: refreshed, version };
    },

    async setCurrentVersion(inputCurrent: {
      resourceIdentifier: string;
      versionId: string;
      actor: Actor;
    }): Promise<Resource> {
      const resource = await resolveResource(inputCurrent.resourceIdentifier);

      const version = await store.getVersionById(resource.id, inputCurrent.versionId);
      if (!version) throw new Error("Resource version not found");

      await store.setCurrentVersion({
        resourceId: resource.id,
        versionId: version.id,
        updatedBy: inputCurrent.actor
      });

      const refreshed = await store.getResourceByIdentifier(resource.id);
      if (!refreshed) throw new Error("Resource not found after current version update");
      return refreshed;
    },

    async previewResourceRows(inputPreview: {
      resourceIdentifier: string;
      limit?: number;
      offset?: number;
      versionId?: string;
    }): Promise<{
      resource: Resource;
      version: ResourceVersion | null;
      columns: ResourceColumn[];
      rows: ResourceRow[];
      rowCount: number;
      limit: number;
      offset: number;
    }> {
      const resource = await resolveResource(inputPreview.resourceIdentifier);
      const limit = Math.max(1, Math.min(1000, inputPreview.limit ?? 100));
      const offset = Math.max(0, inputPreview.offset ?? 0);
      const resolvedVersionId = inputPreview.versionId ?? resource.currentVersionId;
      if (!resolvedVersionId) {
        return {
          resource,
          version: null,
          columns: [],
          rows: [],
          rowCount: 0,
          limit,
          offset
        };
      }

      const version = await store.getVersionById(resource.id, resolvedVersionId);
      if (!version) throw new Error("Resource version not found");
      const table = await readTableFromVersion(version);
      const rowCount = table.rows.length;
      const start = Math.min(offset, rowCount);
      const end = Math.min(start + limit, rowCount);

      return {
        resource,
        version,
        columns: table.columns,
        rows: table.rows.slice(start, end),
        rowCount,
        limit,
        offset
      };
    }
  };
}

export { CsvValidationError };

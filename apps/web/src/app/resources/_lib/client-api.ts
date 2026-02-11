"use client";

import type {
  CreateResourceRequest,
  Resource,
  ResourceColumn,
  ResourceRow,
  ResourceRowValue,
  ResourceVersion
} from "@accelerate-core/shared";

export type ResourceTableSnapshot = {
  columns: ResourceColumn[];
  rows: ResourceRow[];
};

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof (json as { error?: unknown }).error === "string"
      ? (json as { error: string }).error
      : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

async function authFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });
}

export async function listResources(idToken: string): Promise<Resource[]> {
  const res = await authFetch("/api/resources", idToken, { method: "GET" });
  const json = await parseJson<{ resources: Resource[] }>(res);
  return Array.isArray(json.resources) ? json.resources : [];
}

export async function createResource(idToken: string, input: CreateResourceRequest): Promise<Resource> {
  const res = await authFetch("/api/resources", idToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const json = await parseJson<{ resource: Resource }>(res);
  return json.resource;
}

export async function getResourceWithCurrentTable(idToken: string, slug: string): Promise<{
  resource: Resource;
  currentVersion: ResourceVersion | null;
  table: ResourceTableSnapshot | null;
}> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(slug)}`, idToken, { method: "GET" });
  return parseJson(res);
}

export async function uploadCsvVersion(idToken: string, slug: string, csvText: string, fileName?: string): Promise<{
  resource: Resource;
  version: ResourceVersion;
}> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(slug)}/upload`, idToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csvText, fileName })
  });
  return parseJson(res);
}

export async function uploadCsvVersionFromFile(input: {
  idToken: string;
  slug: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<{ resource: Resource; version: ResourceVersion }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/resources/${encodeURIComponent(input.slug)}/upload`);
    xhr.setRequestHeader("authorization", `Bearer ${input.idToken}`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!input.onProgress || !event.lengthComputable || event.total <= 0) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      input.onProgress(percent);
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading CSV"));
    };

    xhr.onload = () => {
      const raw = xhr.response ?? {};
      const body = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
      if (xhr.status < 200 || xhr.status >= 300) {
        const message = typeof body.error === "string" ? body.error : `Upload failed: ${xhr.status}`;
        reject(new Error(message));
        return;
      }

      if (!body.resource || !body.version) {
        reject(new Error("Upload succeeded but response was malformed"));
        return;
      }

      resolve(body as { resource: Resource; version: ResourceVersion });
    };

    const formData = new FormData();
    formData.append("file", input.file, input.file.name);
    xhr.send(formData);
  });
}

export async function listResourceVersions(idToken: string, slug: string): Promise<{
  resource: Resource;
  versions: ResourceVersion[];
}> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(slug)}/versions`, idToken, { method: "GET" });
  return parseJson(res);
}

export async function getResourcePreview(input: {
  idToken: string;
  slug: string;
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
  const query = new URLSearchParams();
  if (typeof input.limit === "number") query.set("limit", String(input.limit));
  if (typeof input.offset === "number") query.set("offset", String(input.offset));
  if (input.versionId) query.set("versionId", input.versionId);

  const path = `/api/resources/${encodeURIComponent(input.slug)}/preview${query.size ? `?${query}` : ""}`;
  const res = await authFetch(path, input.idToken, { method: "GET" });
  return parseJson(res);
}

export async function getResourceVersion(idToken: string, slug: string, versionId: string): Promise<{
  resource: Resource;
  version: ResourceVersion;
  table: ResourceTableSnapshot;
}> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(slug)}/versions/${encodeURIComponent(versionId)}`, idToken, {
    method: "GET"
  });
  return parseJson(res);
}

export async function restoreResourceVersion(idToken: string, slug: string, versionId: string): Promise<{
  resource: Resource;
  version: ResourceVersion;
}> {
  const res = await authFetch(
    `/api/resources/${encodeURIComponent(slug)}/versions/${encodeURIComponent(versionId)}/restore`,
    idToken,
    { method: "POST" }
  );
  return parseJson(res);
}

export async function saveResourceDataAsVersion(input: {
  idToken: string;
  slug: string;
  columns: string[];
  rows: Array<Record<string, ResourceRowValue>>;
  basedOnVersionId?: string;
}): Promise<{ resource: Resource; version: ResourceVersion }> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(input.slug)}/data`, input.idToken, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      columns: input.columns,
      rows: input.rows,
      basedOnVersionId: input.basedOnVersionId
    })
  });
  return parseJson(res);
}

export async function setCurrentResourceVersion(input: {
  idToken: string;
  slug: string;
  versionId: string;
}): Promise<Resource> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(input.slug)}/current`, input.idToken, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ versionId: input.versionId })
  });
  const json = await parseJson<{ resource: Resource }>(res);
  return json.resource;
}

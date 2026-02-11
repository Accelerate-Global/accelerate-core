"use client";

import type {
  CreateResourceRequest,
  Resource,
  ResourceColumn,
  ResourceRow,
  ResourceVersion,
  ResourceRowValue
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
  const res = await authFetch(`/api/resources/${encodeURIComponent(slug)}/versions`, idToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csvText, fileName })
  });
  return parseJson(res);
}

export async function listResourceVersions(idToken: string, slug: string): Promise<{
  resource: Resource;
  versions: ResourceVersion[];
}> {
  const res = await authFetch(`/api/resources/${encodeURIComponent(slug)}/versions`, idToken, { method: "GET" });
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

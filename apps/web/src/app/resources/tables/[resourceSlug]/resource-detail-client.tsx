"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Resource, ResourceVersion } from "@accelerate-core/shared";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  getResourcePreview,
  type ResourceTableSnapshot,
  getResourceWithCurrentTable,
  listResourceVersions,
  saveResourceDataAsVersion,
  setCurrentResourceVersion,
  uploadCsvVersionFromFile
} from "../../_lib/client-api";
import { ResourceTableEditor, type EditableTableValue } from "../../_components/resource-table-editor";

const PREVIEW_PAGE_SIZE = 100;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function tableToEditable(table: ResourceTableSnapshot | null): EditableTableValue {
  if (!table) {
    return {
      columns: ["column_1"],
      rows: []
    };
  }
  return {
    columns: table.columns.map((column) => column.key),
    rows: table.rows
  };
}

type ReadyState = {
  resource: Resource;
  currentVersion: ResourceVersion | null;
  table: ResourceTableSnapshot | null;
};

type PreviewState =
  | {
      status: "idle" | "loading";
      offset: number;
    }
  | {
      status: "error";
      offset: number;
      message: string;
    }
  | {
      status: "ready";
      offset: number;
      rowCount: number;
      rows: Array<Record<string, string | number | boolean | null>>;
      columns: string[];
      versionId: string | null;
    };

export function ResourceDetailClient({ resourceSlug }: { resourceSlug: string }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<{ status: "idle" | "loading" | "error" | "ready"; message?: string; readyState?: ReadyState }>({
    status: "idle"
  });
  const [versions, setVersions] = useState<ResourceVersion[]>([]);
  const [draft, setDraft] = useState<EditableTableValue>({ columns: ["column_1"], rows: [] });
  const [busy, setBusy] = useState<null | "upload" | "save" | "current">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle", offset: 0 });

  const canLoad = ready && !!user;

  const baseline = useMemo<EditableTableValue | null>(() => {
    if (state.status !== "ready" || !state.readyState) return null;
    return tableToEditable(state.readyState.table);
  }, [state]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify(baseline) !== JSON.stringify(draft);
  }, [baseline, draft]);

  const loadPreview = async (token: string, slug: string, offset = 0, versionId?: string) => {
    setPreview({ status: "loading", offset });
    try {
      const payload = await getResourcePreview({
        idToken: token,
        slug,
        limit: PREVIEW_PAGE_SIZE,
        offset,
        versionId
      });
      setPreview({
        status: "ready",
        offset: payload.offset,
        rowCount: payload.rowCount,
        rows: payload.rows,
        columns: payload.columns.map((column) => column.key),
        versionId: payload.version?.id ?? null
      });
    } catch (err) {
      setPreview({
        status: "error",
        offset,
        message: err instanceof Error ? err.message : "Failed to load table preview"
      });
    }
  };

  const load = async () => {
    if (!user) return;
    setState({ status: "loading" });
    setError(null);
    setSuccess(null);
    try {
      const token = await user.getIdToken();
      const [snapshot, versionsPayload] = await Promise.all([
        getResourceWithCurrentTable(token, resourceSlug),
        listResourceVersions(token, resourceSlug)
      ]);
      const readyState: ReadyState = {
        resource: snapshot.resource,
        currentVersion: snapshot.currentVersion,
        table: snapshot.table
      };
      setState({ status: "ready", readyState });
      setVersions(versionsPayload.versions);
      setDraft(tableToEditable(snapshot.table));
      setSelectedVersionId(snapshot.resource.currentVersionId ?? versionsPayload.versions[0]?.id ?? "");
      await loadPreview(token, snapshot.resource.slug, 0, snapshot.resource.currentVersionId);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load resource"
      });
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [canLoad, user, resourceSlug]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view resources.</p>;
  if (state.status === "idle" || state.status === "loading") return <p className="muted">Loading resource...</p>;
  if (state.status === "error" || !state.readyState) return <p className="muted">Error: {state.message}</p>;

  const { resource, currentVersion, table } = state.readyState;
  const uploadLocked = busy === "upload";
  const previewCanPrev = preview.status === "ready" && preview.offset > 0;
  const previewCanNext = preview.status === "ready" && preview.offset + preview.rows.length < preview.rowCount;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{resource.name}</h3>
        <span className="pill">
          Current version: <code>{resource.currentVersionId ?? "-"}</code>
        </span>
        {uploadLocked ? (
          <span className="btn" aria-disabled="true">
            View versions
          </span>
        ) : (
          <Link className="btn" href={`/resources/tables/${encodeURIComponent(resource.slug)}/versions`}>
            View versions
          </Link>
        )}
      </div>

      <div className="muted" style={{ display: "grid", gap: 6 }}>
        <div>
          Resource slug: <code>{resource.slug}</code>
        </div>
        <div>
          Last updated: <code>{formatTime(resource.updatedAt)}</code> by <code>{resource.updatedBy?.email ?? "unknown"}</code>
        </div>
        {resource.description ? <div>{resource.description}</div> : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <h4 style={{ marginTop: 0 }}>Upload CSV (creates new version)</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy !== null}
            onChange={(event) => {
              setUploadFile(event.currentTarget.files?.[0] ?? null);
              setUploadProgress(0);
            }}
          />
          <button
            className="btn"
            type="button"
            disabled={!uploadFile || busy !== null}
            onClick={async () => {
              if (!user || !uploadFile) return;
              setBusy("upload");
              setError(null);
              setSuccess(null);
              setUploadProgress(0);
              try {
                const token = await user.getIdToken();
                await uploadCsvVersionFromFile({
                  idToken: token,
                  slug: resource.slug,
                  file: uploadFile,
                  onProgress: setUploadProgress
                });
                setUploadProgress(100);
                setUploadFile(null);
                setSuccess("Uploaded CSV as a new version.");
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "CSV upload failed");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "upload" ? "Uploading..." : "Upload CSV"}
          </button>
        </div>
        {busy === "upload" ? (
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            <progress max={100} value={uploadProgress} style={{ width: "100%" }} />
            <span className="muted">
              {uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : "Upload complete. Validating CSV..."}
            </span>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <h4 style={{ marginTop: 0 }}>Version selector</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={selectedVersionId} disabled={busy !== null} onChange={(event) => setSelectedVersionId(event.currentTarget.value)}>
            <option value="">Select version</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.id} ({version.source}, {formatTime(version.createdAt)})
              </option>
            ))}
          </select>
          {selectedVersionId && !uploadLocked ? (
            <Link className="btn" href={`/resources/tables/${encodeURIComponent(resource.slug)}/versions/${encodeURIComponent(selectedVersionId)}`}>
              View snapshot
            </Link>
          ) : null}
          {selectedVersionId && uploadLocked ? (
            <span className="btn" aria-disabled="true">
              View snapshot
            </span>
          ) : null}
          <button
            className="btn"
            type="button"
            disabled={!selectedVersionId || selectedVersionId === resource.currentVersionId || busy !== null}
            onClick={async () => {
              if (!user || !selectedVersionId) return;
              setBusy("current");
              setError(null);
              setSuccess(null);
              try {
                const token = await user.getIdToken();
                await setCurrentResourceVersion({
                  idToken: token,
                  slug: resource.slug,
                  versionId: selectedVersionId
                });
                setSuccess(`Set ${selectedVersionId} as current version.`);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to set current version");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "current" ? "Updating..." : "Set current"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h4 style={{ margin: 0 }}>Data preview</h4>
          <span className="muted">
            {preview.status === "ready" ? (
              <>
                Rows <code>{preview.offset + 1}</code>-<code>{preview.offset + preview.rows.length}</code> of{" "}
                <code>{preview.rowCount}</code>
              </>
            ) : (
              "Load the latest data preview."
            )}
          </span>
        </div>

        {preview.status === "loading" ? <p className="muted" style={{ marginTop: 10 }}>Loading preview...</p> : null}
        {preview.status === "error" ? <p className="muted" style={{ marginTop: 10 }}>Error: {preview.message}</p> : null}
        {preview.status === "ready" && preview.columns.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>
            No rows available yet. Upload a CSV or save table edits to create the first version.
          </p>
        ) : null}

        {preview.status === "ready" && preview.columns.length > 0 ? (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    {preview.columns.map((column) => (
                      <th key={column}>
                        <code>{column}</code>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rowIndex) => (
                    <tr key={`${preview.offset + rowIndex}`}>
                      {preview.columns.map((column) => (
                        <td key={column}>
                          {row[column] === null || typeof row[column] === "undefined" ? "" : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn"
                type="button"
                disabled={!previewCanPrev || busy !== null}
                onClick={async () => {
                  if (!user || preview.status !== "ready") return;
                  const token = await user.getIdToken();
                  const nextOffset = Math.max(0, preview.offset - PREVIEW_PAGE_SIZE);
                  await loadPreview(token, resource.slug, nextOffset, preview.versionId ?? undefined);
                }}
              >
                Previous
              </button>
              <button
                className="btn"
                type="button"
                disabled={!previewCanNext || busy !== null}
                onClick={async () => {
                  if (!user || preview.status !== "ready") return;
                  const token = await user.getIdToken();
                  const nextOffset = preview.offset + PREVIEW_PAGE_SIZE;
                  await loadPreview(token, resource.slug, nextOffset, preview.versionId ?? undefined);
                }}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <h4 style={{ margin: 0 }}>Current table editor</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              type="button"
              disabled={!baseline || busy !== null || !isDirty}
              onClick={() => {
                if (!baseline) return;
                setDraft(baseline);
                setError(null);
                setSuccess("Discarded unsaved edits.");
              }}
            >
              Discard
            </button>
            <button
              className="btn btnPrimary"
              type="button"
              disabled={busy !== null || !isDirty}
              onClick={async () => {
                if (!user) return;
                setBusy("save");
                setError(null);
                setSuccess(null);
                try {
                  const token = await user.getIdToken();
                  await saveResourceDataAsVersion({
                    idToken: token,
                    slug: resource.slug,
                    columns: draft.columns,
                    rows: draft.rows,
                    basedOnVersionId: currentVersion?.id
                  });
                  setSuccess("Saved changes as a new version.");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to save edits");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "save" ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
        {!table ? (
          <p className="muted" style={{ marginTop: 10 }}>
            This resource does not have a version yet. Upload a CSV or build the first table and save it as version{" "}
            <code>v000001</code>.
          </p>
        ) : null}
        <div style={{ marginTop: 10 }}>
          <ResourceTableEditor value={draft} onChange={setDraft} />
        </div>
      </div>

      {error ? <p className="muted">Error: {error}</p> : null}
      {success ? <p className="muted">{success}</p> : null}
    </div>
  );
}

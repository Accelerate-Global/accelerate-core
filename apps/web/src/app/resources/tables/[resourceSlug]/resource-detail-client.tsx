"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Resource, ResourceVersion } from "@accelerate-core/shared";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  type ResourceTableSnapshot,
  getResourceWithCurrentTable,
  listResourceVersions,
  saveResourceDataAsVersion,
  setCurrentResourceVersion,
  uploadCsvVersion
} from "../../_lib/client-api";
import { ResourceTableEditor, type EditableTableValue } from "../../_components/resource-table-editor";

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

  const canLoad = ready && !!user;

  const baseline = useMemo<EditableTableValue | null>(() => {
    if (state.status !== "ready" || !state.readyState) return null;
    return tableToEditable(state.readyState.table);
  }, [state]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify(baseline) !== JSON.stringify(draft);
  }, [baseline, draft]);

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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{resource.name}</h3>
        <span className="pill">
          Current version: <code>{resource.currentVersionId ?? "-"}</code>
        </span>
        <Link className="btn" href={`/resources/tables/${encodeURIComponent(resource.slug)}/versions`}>
          View versions
        </Link>
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
          <input type="file" accept=".csv,text/csv" onChange={(event) => setUploadFile(event.currentTarget.files?.[0] ?? null)} />
          <button
            className="btn"
            type="button"
            disabled={!uploadFile || busy !== null}
            onClick={async () => {
              if (!user || !uploadFile) return;
              setBusy("upload");
              setError(null);
              setSuccess(null);
              try {
                const token = await user.getIdToken();
                const csvText = await uploadFile.text();
                await uploadCsvVersion(token, resource.slug, csvText, uploadFile.name);
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
      </div>

      <div className="card" style={{ padding: 12 }}>
        <h4 style={{ marginTop: 0 }}>Version selector</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={selectedVersionId} onChange={(event) => setSelectedVersionId(event.currentTarget.value)}>
            <option value="">Select version</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.id} ({version.source}, {formatTime(version.createdAt)})
              </option>
            ))}
          </select>
          {selectedVersionId ? (
            <Link className="btn" href={`/resources/tables/${encodeURIComponent(resource.slug)}/versions/${encodeURIComponent(selectedVersionId)}`}>
              View snapshot
            </Link>
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

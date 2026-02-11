"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Resource, ResourceVersion } from "@accelerate-core/shared";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { listResourceVersions, restoreResourceVersion } from "../../../_lib/client-api";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type State =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; resource: Resource; versions: ResourceVersion[] };

export function ResourceVersionsClient({ resourceSlug }: { resourceSlug: string }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setState({ status: "loading" });
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const payload = await listResourceVersions(token, resourceSlug);
      setState({ status: "ready", resource: payload.resource, versions: payload.versions });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load versions" });
    }
  };

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, resourceSlug]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view versions.</p>;
  if (state.status === "idle" || state.status === "loading") return <p className="muted">Loading versions...</p>;
  if (state.status === "error") return <p className="muted">Error: {state.message}</p>;
  const readyState = state.status === "ready" ? state : null;
  if (!readyState) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>
          {readyState.resource.name} (<code>{readyState.resource.slug}</code>)
        </h3>
        <Link className="btn" href={`/resources/tables/${encodeURIComponent(readyState.resource.slug)}`}>
          Back to table
        </Link>
        <button className="btn" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {message ? <p className="muted">{message}</p> : null}

      {readyState.versions.length === 0 ? (
        <p className="muted">No versions yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Source</th>
                <th>Created</th>
                <th>By</th>
                <th>Rows</th>
                <th>Columns</th>
                <th>Archived</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {readyState.versions.map((version) => (
                <tr key={version.id}>
                  <td>
                    <code>{version.id}</code>
                    {version.id === readyState.resource.currentVersionId ? (
                      <span className="muted" style={{ marginLeft: 6 }}>
                        (current)
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <code>{version.source}</code>
                  </td>
                  <td>{formatTime(version.createdAt)}</td>
                  <td>
                    <code>{version.createdBy?.email ?? "unknown"}</code>
                  </td>
                  <td>{version.rowCount}</td>
                  <td>{version.columnCount}</td>
                  <td>{version.isArchived ? "yes" : "no"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        className="btn"
                        href={`/resources/tables/${encodeURIComponent(readyState.resource.slug)}/versions/${encodeURIComponent(version.id)}`}
                      >
                        View
                      </Link>
                      <button
                        className="btn"
                        type="button"
                        disabled={busyVersionId !== null}
                        onClick={async () => {
                          if (!user) return;
                          setBusyVersionId(version.id);
                          setMessage(null);
                          try {
                            const token = await user.getIdToken();
                            await restoreResourceVersion(token, readyState.resource.slug, version.id);
                            setMessage(`Restored ${version.id} as a new current version.`);
                            await load();
                          } catch (err) {
                            setMessage(err instanceof Error ? err.message : "Restore failed");
                          } finally {
                            setBusyVersionId(null);
                          }
                        }}
                      >
                        {busyVersionId === version.id ? "Restoring..." : "Restore"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

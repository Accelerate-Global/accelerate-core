"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Run } from "@accelerate-core/shared";

import { useAuth } from "../../lib/auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; runs: Run[] };

async function fetchRuns(idToken: string): Promise<Run[]> {
  const res = await fetch(`/api/runs`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${idToken}`
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  const runs = json?.runs;
  if (!Array.isArray(runs)) throw new Error("Invalid response");
  return runs as Run[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function RunsClient() {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  const canLoad = ready && !!user;

  const load = async () => {
    if (!user) return;
    setState({ status: "loading" });
    try {
      const token = await user.getIdToken();
      const runs = await fetchRuns(token);
      setState({ status: "ready", runs });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [canLoad, user]);

  if (!ready) return <p className="muted">Loading auth...</p>;
  if (!user) return <p className="muted">Sign in to view runs.</p>;

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div>
        <p className="muted">Loading runs...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        <p className="muted">Error: {state.message}</p>
        <button className="btn" type="button" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  const runs = state.runs;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <button className="btn" type="button" onClick={load}>
          Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <p className="muted">No runs yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Status</th>
                <th>Connector</th>
                <th>Dataset</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link href={`/runs/${encodeURIComponent(run.id)}`}>
                      <code>{formatTime(run.createdAt)}</code>
                    </Link>
                  </td>
                  <td>
                    <code>{run.status}</code>
                  </td>
                  <td>
                    <code>{run.connectorId}</code>
                  </td>
                  <td>
                    <code>{run.datasetId}</code>
                  </td>
                  <td>
                    <code>{run.outputs?.datasetVersionId ?? "-"}</code>
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

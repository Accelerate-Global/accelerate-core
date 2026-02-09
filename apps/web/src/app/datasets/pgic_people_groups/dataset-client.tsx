"use client";

import { useState } from "react";

import { DATASET_IDS } from "@accelerate-core/shared";

import { useAuth } from "../../../lib/auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: Array<Record<string, unknown>> };

async function fetchPreviewRows(input: { datasetId: string; versionId?: string; limit?: number }, idToken: string) {
  const res = await fetch(`/api/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(input)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : `Request failed: ${res.status}`;
    throw new Error(message);
  }

  const rows = json?.rows;
  if (!Array.isArray(rows)) throw new Error("Invalid response");
  return rows as Array<Record<string, unknown>>;
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function truncate(s: string, max = 220): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

export function PgicPeopleGroupsClient() {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  const onPreview = async () => {
    if (!user) return;
    setState({ status: "loading" });
    try {
      const token = await user.getIdToken();
      const rows = await fetchPreviewRows({ datasetId: DATASET_IDS.pgicPeopleGroups, limit: 100 }, token);
      setState({ status: "ready", rows });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Preview failed" });
    }
  };

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to preview this dataset.</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" type="button" onClick={onPreview} disabled={state.status === "loading"}>
          {state.status === "loading" ? "Loading..." : "Preview latest (limit 100)"}
        </button>
        <span className="muted">
          Uses API <code>POST /query</code> (safe preview only).
        </span>
      </div>

      {state.status === "error" ? (
        <details className="errorDetails" style={{ marginTop: 10 }}>
          <summary className="muted">
            Preview error: <code>{truncate(oneLine(state.message), 200)}</code>
          </summary>
          <pre className="logBlock">{state.message}</pre>
        </details>
      ) : null}

      {state.status === "ready" && state.rows.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Preview ({state.rows.length} rows)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  {Object.keys(state.rows[0] ?? {}).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(state.rows![0] ?? {}).map((k) => (
                      <td key={k}>
                        <code>{typeof row[k] === "string" ? row[k] : JSON.stringify(row[k])}</code>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";

import type { Run } from "@accelerate-core/shared";
import { useAuth } from "../../../lib/auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; run: Run; rows?: Array<Record<string, unknown>>; rowsError?: string };

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function truncate(s: string, max = 220): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

async function fetchRun(runId: string, idToken: string): Promise<Run> {
  const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
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

  return json as Run;
}

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

export function RunDetailsClient({ runId }: { runId: string }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  const canLoad = useMemo(() => ready && !!user, [ready, user]);

  useEffect(() => {
    let cancelled = false;
    if (!canLoad) return;

    const loadOnce = async () => {
      try {
        const token = await user!.getIdToken();
        const data = await fetchRun(runId, token);
        if (cancelled) return;
        setState((prev) => {
          if (prev.status === "ready") return { ...prev, run: data };
          return { status: "ready", run: data };
        });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Failed" });
      }
    };

    setState({ status: "loading" });
    void loadOnce();

    const interval = setInterval(() => {
      // Poll while queued/running so the UI updates as the worker progresses.
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        if (prev.run.status === "queued" || prev.run.status === "running") {
          void loadOnce();
        }
        return prev;
      });
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canLoad, runId, user]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view run details.</p>;

  if (state.status === "idle" || state.status === "loading") return <p className="muted">Loading run...</p>;
  if (state.status === "error") return <p className="muted">Error: {state.message}</p>;

  const run = state.run;

  const onPreview = async () => {
    try {
      const token = await user.getIdToken();
      const rows = await fetchPreviewRows(
        { datasetId: run.datasetId, versionId: run.outputs?.datasetVersionId, limit: 100 },
        token
      );
      setState((prev) => (prev.status === "ready" ? { ...prev, rows, rowsError: undefined } : prev));
    } catch (err) {
      setState((prev) =>
        prev.status === "ready"
          ? { ...prev, rows: undefined, rowsError: err instanceof Error ? err.message : "Preview failed" }
          : prev
      );
    }
  };

  const workerLogsUrl =
    "https://console.cloud.google.com/run/detail/us-east4/accelerate-core-worker/logs?project=accelerate-global-473318";
  const apiLogsUrl =
    "https://console.cloud.google.com/run/detail/us-east4/accelerate-core-api/logs?project=accelerate-global-473318";

  return (
    <div style={{ marginTop: 12 }}>
      <div className="pill">
        Status: <code>{run.status}</code>
      </div>
      <div style={{ marginTop: 10 }} className="muted">
        Run ID: <code>{run.id}</code>
      </div>
      <div style={{ marginTop: 10 }} className="muted">
        Created by: {run.createdBy?.email ?? "unknown"}
      </div>
      {run.startedAt ? (
        <div style={{ marginTop: 10 }} className="muted">
          Started: <code>{run.startedAt}</code>
        </div>
      ) : null}
      {run.finishedAt ? (
        <div style={{ marginTop: 10 }} className="muted">
          Finished: <code>{run.finishedAt}</code>
        </div>
      ) : null}
      {run.outputs?.datasetVersionId ? (
        <div style={{ marginTop: 10 }} className="muted">
          Dataset version: <code>{run.outputs.datasetVersionId}</code>
          {run.outputs.bigQueryTableId ? (
            <>
              {" "}
              (BQ table: <code>{run.outputs.bigQueryTableId}</code>)
            </>
          ) : null}
        </div>
      ) : null}
      {run.outputs?.gcsRawNdjsonPath ? (
        <div style={{ marginTop: 10 }} className="muted">
          Raw artifact: <code>{run.outputs.gcsRawNdjsonPath}</code>
        </div>
      ) : null}
      {run.error?.message ? (
        <details className="errorDetails" style={{ marginTop: 10 }}>
          <summary className="muted">
            Error: <code>{truncate(oneLine(run.error.message), 200)}</code>
          </summary>
          <pre className="logBlock">{run.error.message}</pre>
        </details>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" type="button" onClick={onPreview} disabled={run.status !== "succeeded"}>
          Preview rows (limit 100)
        </button>
        <a className="muted" href={apiLogsUrl} target="_blank" rel="noreferrer">
          API logs
        </a>
        <a className="muted" href={workerLogsUrl} target="_blank" rel="noreferrer">
          Worker logs
        </a>
        <span className="muted">
          Tip: in logs, search for <code>{run.id}</code>
        </span>
      </div>

      {state.rowsError ? (
        <details className="errorDetails" style={{ marginTop: 10 }}>
          <summary className="muted">
            Preview error: <code>{truncate(oneLine(state.rowsError), 200)}</code>
          </summary>
          <pre className="logBlock">{state.rowsError}</pre>
        </details>
      ) : null}

      {state.rows && state.rows.length > 0 ? (
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

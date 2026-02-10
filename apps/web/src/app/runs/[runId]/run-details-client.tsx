"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Run, RunLogEntry } from "@accelerate-core/shared";
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

async function fetchRunLogs(input: { runId: string; afterTsMs?: number; limit?: number }, idToken: string) {
  const url = new URL(`/api/runs/${encodeURIComponent(input.runId)}/logs`, window.location.origin);
  if (typeof input.afterTsMs === "number") url.searchParams.set("afterTsMs", String(input.afterTsMs));
  if (typeof input.limit === "number") url.searchParams.set("limit", String(input.limit));

  const res = await fetch(url.toString(), {
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

  const logs = json?.logs;
  if (!Array.isArray(logs)) throw new Error("Invalid response");
  return logs as RunLogEntry[];
}

function formatLogLine(e: RunLogEntry): string {
  const t = new Date(e.ts);
  const hh = Number.isNaN(t.getTime()) ? e.ts : t.toLocaleTimeString();
  const lvl = e.level ? e.level.toUpperCase() : "INFO";
  return `[${hh}] ${lvl} ${e.message}`;
}

export function RunDetailsClient({ runId, onRunUpdate }: { runId: string; onRunUpdate?: (run: Run) => void }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "cancel" | "download">(null);
  const [followLogs, setFollowLogs] = useState(true);
  const cursorRef = useRef<number>(0);
  const apiLogRef = useRef<HTMLPreElement | null>(null);
  const workerLogRef = useRef<HTMLPreElement | null>(null);

  const canLoad = useMemo(() => ready && !!user, [ready, user]);

  useEffect(() => {
    let cancelled = false;
    if (!canLoad) return;

    const loadOnce = async () => {
      try {
        const token = await user!.getIdToken();
        const data = await fetchRun(runId, token);
        if (cancelled) return;
        onRunUpdate?.(data);
        setState((prev) => {
          if (prev.status === "ready") return { ...prev, run: data };
          return { status: "ready", run: data };
        });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Failed" });
      }
    };

    const loadLogsOnce = async () => {
      try {
        const token = await user!.getIdToken();
        const afterTsMs = cursorRef.current > 0 ? cursorRef.current : undefined;
        const batch = await fetchRunLogs({ runId, afterTsMs, limit: afterTsMs ? 200 : 250 }, token);
        if (cancelled) return;
        if (batch.length > 0) {
          cursorRef.current = Math.max(cursorRef.current, ...batch.map((e) => (typeof e.tsMs === "number" ? e.tsMs : 0)));
        }
        setLogs((prev) => {
          const next = afterTsMs ? [...prev, ...batch] : batch;
          return next.length > 1000 ? next.slice(-1000) : next;
        });
        setLogsError(null);
      } catch (err) {
        if (!cancelled) setLogsError(err instanceof Error ? err.message : "Failed to load logs");
      }
    };

    setState({ status: "loading" });
    setLogs([]);
    setLogsError(null);
    setActionError(null);
    setBusy(null);
    cursorRef.current = 0;
    void loadOnce();
    void loadLogsOnce();

    const interval = setInterval(() => {
      // Poll while queued/running so the UI updates as the worker progresses.
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        if (prev.run.status === "queued" || prev.run.status === "running") {
          void loadOnce();
          void loadLogsOnce();
        }
        return prev;
      });
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canLoad, onRunUpdate, runId, user]);

  useEffect(() => {
    if (!followLogs) return;
    // Scroll log panes to bottom when new logs arrive.
    const apiEl = apiLogRef.current;
    if (apiEl) apiEl.scrollTop = apiEl.scrollHeight;
    const workerEl = workerLogRef.current;
    if (workerEl) workerEl.scrollTop = workerEl.scrollHeight;
  }, [followLogs, logs.length]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view run details.</p>;

  if (state.status === "idle" || state.status === "loading") return <p className="muted">Loading run...</p>;
  if (state.status === "error") return <p className="muted">Error: {state.message}</p>;

  const run = state.run;

  const onCancel = async () => {
    if (!user) return;
    setBusy("cancel");
    setActionError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/cancel`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof json?.error === "string" ? json.error : `Request failed: ${res.status}`;
        throw new Error(message);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  };

  const onDownloadRaw = async () => {
    if (!user) return;
    setBusy("download");
    setActionError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/raw`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const message = typeof json?.error === "string" ? json.error : `Request failed: ${res.status}`;
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${run.datasetId}-${run.id}.ndjson`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

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

  const apiLogs = logs.filter((e) => e.source === "api");
  const workerLogs = logs.filter((e) => e.source === "worker");
  const apiLogsText = apiLogs.map(formatLogLine).join("\n");
  const workerLogsText = workerLogs.map(formatLogLine).join("\n");

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
        {run.status === "queued" || run.status === "running" ? (
          <button className="btn" type="button" onClick={onCancel} disabled={busy !== null}>
            {busy === "cancel" ? "Stopping..." : "Stop run"}
          </button>
        ) : null}
        <button className="btn" type="button" onClick={onPreview} disabled={run.status !== "succeeded" || busy !== null}>
          Preview rows (limit 100)
        </button>
        {run.outputs?.gcsRawNdjsonPath ? (
          <button className="btn" type="button" onClick={onDownloadRaw} disabled={busy !== null}>
            {busy === "download" ? "Downloading..." : "Download raw artifact"}
          </button>
        ) : null}
        <button className="btn" type="button" onClick={() => setFollowLogs((v) => !v)} disabled={busy !== null}>
          {followLogs ? "Following logs" : "Follow logs"}
        </button>
      </div>

      {actionError ? (
        <details className="errorDetails" style={{ marginTop: 10 }}>
          <summary className="muted">
            Action error: <code>{truncate(oneLine(actionError), 200)}</code>
          </summary>
          <pre className="logBlock">{actionError}</pre>
        </details>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Logs</h3>
          <span className="muted">
            Updates while <code>queued</code>/<code>running</code>. (Run id: <code>{run.id}</code>)
          </span>
        </div>

        {logsError ? (
          <details className="errorDetails" style={{ marginTop: 10 }}>
            <summary className="muted">
              Log load error: <code>{truncate(oneLine(logsError), 200)}</code>
            </summary>
            <pre className="logBlock">{logsError}</pre>
          </details>
        ) : null}

        <div className="logGrid" style={{ marginTop: 10 }}>
          <div className="card">
            <div className="muted" style={{ marginBottom: 8 }}>
              API logs
            </div>
            <pre ref={apiLogRef} className="logBlock">
              {apiLogsText || "(no API log entries yet)"}
            </pre>
          </div>
          <div className="card">
            <div className="muted" style={{ marginBottom: 8 }}>
              Worker logs
            </div>
            <pre ref={workerLogRef} className="logBlock">
              {workerLogsText || "(no worker log entries yet)"}
            </pre>
          </div>
        </div>
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

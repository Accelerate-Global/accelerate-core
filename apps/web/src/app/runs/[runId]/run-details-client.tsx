"use client";

import { useEffect, useMemo, useState } from "react";

import type { Run } from "@accelerate-core/shared";
import { useAuth } from "../../../lib/auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; run: Run };

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

export function RunDetailsClient({ runId }: { runId: string }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  const canLoad = useMemo(() => ready && !!user, [ready, user]);

  useEffect(() => {
    let cancelled = false;
    if (!canLoad) return;

    const run = async () => {
      setState({ status: "loading" });
      try {
        const token = await user!.getIdToken();
        const data = await fetchRun(runId, token);
        if (!cancelled) setState({ status: "ready", run: data });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Failed" });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [canLoad, runId, user]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view run details.</p>;

  if (state.status === "idle" || state.status === "loading") return <p className="muted">Loading run...</p>;
  if (state.status === "error") return <p className="muted">Error: {state.message}</p>;

  const run = state.run;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="pill">
        Status: <code>{run.status}</code>
      </div>
      <div style={{ marginTop: 10 }} className="muted">
        Created by: {run.createdBy?.email ?? "unknown"}
      </div>
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
      {run.error?.message ? (
        <div style={{ marginTop: 10 }} className="muted">
          Error: <code>{run.error.message}</code>
        </div>
      ) : null}
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Run } from "@accelerate-core/shared";
import { CONNECTOR_IDS, DATASET_IDS } from "@accelerate-core/shared";

import { AdminActions } from "../ui";
import { RunDetailsClient } from "../../runs/[runId]/run-details-client";
import { useAuth } from "../../../lib/auth/AuthProvider";

type RunsState =
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

function shortId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function JoshuaProjectClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();

  const urlRunId = searchParams.get("run");

  const [runsState, setRunsState] = useState<RunsState>({ status: "idle" });
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const canLoad = ready && !!user;

  const relevantRuns = useMemo(() => {
    if (runsState.status !== "ready") return [];
    return runsState.runs.filter(
      (r) => r.connectorId === CONNECTOR_IDS.joshuaProjectPgic && r.datasetId === DATASET_IDS.pgicPeopleGroups
    );
  }, [runsState]);

  const selectRun = (id: string | null, opts?: { updateUrl?: boolean }) => {
    setSelectedRunId(id);
    try {
      if (id) window.localStorage.setItem("ag.jp.selectedRunId", id);
    } catch {
      // ignore
    }
    const updateUrl = opts?.updateUrl ?? true;
    if (!updateUrl) return;

    const next = new URLSearchParams(searchParams.toString());
    if (id) next.set("run", id);
    else next.delete("run");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const load = async () => {
    if (!user) return;
    setRunsState({ status: "loading" });
    try {
      const token = await user.getIdToken();
      const runs = await fetchRuns(token);
      setRunsState({ status: "ready", runs });
    } catch (err) {
      setRunsState({ status: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [canLoad, user]);

  useEffect(() => {
    // If the URL specifies a run, that wins.
    if (urlRunId) {
      if (urlRunId !== selectedRunId) setSelectedRunId(urlRunId);
      return;
    }

    // If we have a cached selection, restore it.
    try {
      const cached = window.localStorage.getItem("ag.jp.selectedRunId");
      if (cached && cached !== selectedRunId) {
        setSelectedRunId(cached);
        return;
      }
    } catch {
      // ignore
    }
  }, [selectedRunId, urlRunId]);

  useEffect(() => {
    // Default selection: prefer any active run (queued/running), else most recent.
    if (selectedRunId) return;
    if (relevantRuns.length === 0) return;
    const active = relevantRuns.find((r) => r.status === "queued" || r.status === "running");
    const pick = active?.id ?? relevantRuns[0]!.id;
    selectRun(pick, { updateUrl: false });
  }, [relevantRuns, selectRun, selectedRunId]);

  return (
    <div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Trigger a run and watch it progress below. Logs stream into the UI while it runs.
        </p>
        <AdminActions
          onRunCreated={(id) => {
            selectRun(id);
            // Refresh the run list so it appears immediately.
            void load();
          }}
        />
      </div>

      <div style={{ marginTop: 14 }} className="card">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Recent runs</h3>
          <button className="btn" type="button" onClick={() => void load()} disabled={!canLoad}>
            Refresh
          </button>
        </div>

        {!ready ? <p className="muted">Auth loading...</p> : null}
        {ready && !user ? <p className="muted">Sign in to view runs.</p> : null}

        {runsState.status === "loading" ? <p className="muted">Loading runs...</p> : null}
        {runsState.status === "error" ? <p className="muted">Error: {runsState.message}</p> : null}

        {runsState.status === "ready" ? (
          relevantRuns.length === 0 ? (
            <p className="muted">No Joshua Project runs yet.</p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Run</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantRuns.map((r) => {
                    const active = r.id === selectedRunId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => selectRun(r.id)}
                        style={{ cursor: "pointer", background: active ? "rgba(86, 215, 255, 0.06)" : undefined }}
                      >
                        <td>
                          <code>{formatTime(r.createdAt)}</code>
                        </td>
                        <td>
                          <code>{r.status}</code>
                        </td>
                        <td>
                          <code title={r.id}>{shortId(r.id)}</code>
                        </td>
                        <td>
                          <code>{r.outputs?.datasetVersionId ?? "-"}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      {selectedRunId ? (
        <div style={{ marginTop: 14 }} className="card">
          <h3 style={{ marginTop: 0 }}>Run details</h3>
          <RunDetailsClient
            runId={selectedRunId}
            onRunUpdate={(nextRun) => {
              setRunsState((prev) => {
                if (prev.status !== "ready") return prev;
                const exists = prev.runs.some((r) => r.id === nextRun.id);
                const runs = exists ? prev.runs.map((r) => (r.id === nextRun.id ? nextRun : r)) : [nextRun, ...prev.runs];
                return { ...prev, runs };
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

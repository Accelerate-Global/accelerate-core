"use client";

import { useState } from "react";

import { AdminActions } from "../ui";
import { RunDetailsClient } from "../../runs/[runId]/run-details-client";

export function JoshuaProjectClient() {
  const [runId, setRunId] = useState<string | null>(null);

  return (
    <div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Trigger a run and watch it progress below. Logs are written in the worker and can be viewed in Cloud Run (link
          available on the run details panel).
        </p>
        <AdminActions onRunCreated={(id) => setRunId(id)} />
      </div>
      {runId ? (
        <div style={{ marginTop: 14 }} className="card">
          <h3 style={{ marginTop: 0 }}>Run details</h3>
          <RunDetailsClient runId={runId} />
        </div>
      ) : null}
    </div>
  );
}

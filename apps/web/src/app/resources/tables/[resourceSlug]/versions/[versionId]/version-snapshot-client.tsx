"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Resource, ResourceVersion } from "@accelerate-core/shared";
import { useAuth } from "../../../../../../lib/auth/AuthProvider";
import { getResourceVersion } from "../../../../_lib/client-api";
import { ResourceTableEditor } from "../../../../_components/resource-table-editor";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type State =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      resource: Resource;
      version: ResourceVersion;
      table: { columns: string[]; rows: Array<Record<string, string | number | boolean | null>> };
    };

export function ResourceVersionSnapshotClient(props: { resourceSlug: string; versionId: string }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (!ready || !user) return;

    const load = async () => {
      setState({ status: "loading" });
      try {
        const token = await user.getIdToken();
        const snapshot = await getResourceVersion(token, props.resourceSlug, props.versionId);
        setState({
          status: "ready",
          resource: snapshot.resource,
          version: snapshot.version,
          table: {
            columns: snapshot.table.columns.map((column) => column.key),
            rows: snapshot.table.rows
          }
        });
      } catch (err) {
        setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load snapshot" });
      }
    };

    void load();
  }, [props.resourceSlug, props.versionId, ready, user]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view resource snapshots.</p>;
  if (state.status === "idle" || state.status === "loading") return <p className="muted">Loading snapshot...</p>;
  if (state.status === "error") return <p className="muted">Error: {state.message}</p>;
  const readyState = state.status === "ready" ? state : null;
  if (!readyState) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>
          {readyState.resource.name} snapshot <code>{readyState.version.id}</code>
        </h3>
        <Link className="btn" href={`/resources/tables/${encodeURIComponent(readyState.resource.slug)}`}>
          Current table
        </Link>
        <Link className="btn" href={`/resources/tables/${encodeURIComponent(readyState.resource.slug)}/versions`}>
          Version history
        </Link>
      </div>

      <div className="muted" style={{ display: "grid", gap: 6 }}>
        <div>
          Created: <code>{formatTime(readyState.version.createdAt)}</code>
        </div>
        <div>
          Created by: <code>{readyState.version.createdBy?.email ?? "unknown"}</code>
        </div>
        <div>
          Source: <code>{readyState.version.source}</code>
        </div>
      </div>

      <ResourceTableEditor value={readyState.table} readOnly />
    </div>
  );
}

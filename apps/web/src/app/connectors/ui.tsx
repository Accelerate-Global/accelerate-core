"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CONNECTOR_IDS, DATASET_IDS } from "@accelerate-core/shared";

import { useAuth } from "../../lib/auth/AuthProvider";
import { isAllowedAdminEmail } from "../../lib/admin";

export function AdminActions() {
  const router = useRouter();
  const { user } = useAuth();
  const email = user?.email ?? null;
  const isAdmin = isAllowedAdminEmail(email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <p className="muted">
        Admin actions hidden. (UI checks <code>NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS</code>; API enforces{" "}
        <code>ALLOWED_ADMIN_EMAILS</code>.)
      </p>
    );
  }

  const onTrigger = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          connectorId: CONNECTOR_IDS.joshuaProjectPgic,
          datasetId: DATASET_IDS.pgicPeopleGroups
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof json?.error === "string" ? json.error : `Request failed: ${res.status}`;
        throw new Error(message);
      }

      const runId = json?.id;
      if (typeof runId !== "string" || runId.length === 0) throw new Error("Invalid response");
      router.push(`/runs/${encodeURIComponent(runId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
      <button className="btn" type="button" disabled={busy} onClick={onTrigger}>
        {busy ? "Starting..." : "Run PGIC People Groups"}
      </button>
      <span className="muted">Signed-in as {email}</span>
      {error ? <span className="muted">Error: {error}</span> : null}
    </div>
  );
}

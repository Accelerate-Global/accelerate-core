"use client";

import { useAuth } from "../../lib/auth/AuthProvider";
import { isAllowedAdminEmail } from "../../lib/admin";

export function AdminActions() {
  const { user } = useAuth();
  const email = user?.email ?? null;
  const isAdmin = isAllowedAdminEmail(email);

  if (!isAdmin) {
    return (
      <p className="muted">
        Admin actions hidden. (UI checks <code>NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS</code>; API enforces{" "}
        <code>ALLOWED_ADMIN_EMAILS</code>.)
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
      <button className="btn" type="button" onClick={() => alert("TODO: trigger run")}>
        Trigger Connector Run (placeholder)
      </button>
      <span className="muted">Signed-in as {email}</span>
    </div>
  );
}


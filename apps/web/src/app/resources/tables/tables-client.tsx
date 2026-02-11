"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CreateResourceRequest, Resource } from "@accelerate-core/shared";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { createResource, listResources } from "../_lib/client-api";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ResourceTablesClient() {
  const { user, ready } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const canLoad = ready && !!user;

  const createPayload: CreateResourceRequest | null = useMemo(() => {
    const resolvedSlug = slug.trim();
    const resolvedName = name.trim();
    if (!resolvedSlug || !resolvedName) return null;
    return {
      slug: resolvedSlug,
      name: resolvedName,
      description: description.trim() || undefined
    };
  }, [description, name, slug]);

  const refresh = async () => {
    if (!user) return;
    setState("loading");
    setError(null);
    try {
      const token = await user.getIdToken();
      const next = await listResources(token);
      setResources(next);
      setState("ready");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to load resources");
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    void refresh();
  }, [canLoad, user]);

  if (!ready) return <p className="muted">Auth loading...</p>;
  if (!user) return <p className="muted">Sign in to view resources.</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="card" style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create resource</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">Name</span>
            <input
              value={name}
              onChange={(event) => {
                const nextName = event.currentTarget.value;
                setName(nextName);
                if (!slug) setSlug(slugify(nextName));
              }}
              placeholder="People group mappings"
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(slugify(event.currentTarget.value))}
              placeholder="people_group_mappings"
            />
          </label>
          <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
            <span className="muted">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              rows={3}
              placeholder="Reference values used across datasets and connector transforms."
            />
          </label>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btnPrimary"
            type="button"
            disabled={createBusy || !createPayload}
            onClick={async () => {
              if (!user || !createPayload) return;
              setCreateBusy(true);
              setError(null);
              try {
                const token = await user.getIdToken();
                const created = await createResource(token, createPayload);
                setName("");
                setSlug("");
                setDescription("");
                setResources((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
                setState("ready");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create resource");
              } finally {
                setCreateBusy(false);
              }
            }}
          >
            {createBusy ? "Creating..." : "Create resource"}
          </button>
          <button className="btn" type="button" onClick={() => void refresh()} disabled={state === "loading"}>
            Refresh
          </button>
        </div>
      </section>

      {state === "loading" ? <p className="muted">Loading resources...</p> : null}
      {state === "error" && error ? <p className="muted">Error: {error}</p> : null}
      {state !== "error" && error ? <p className="muted">Error: {error}</p> : null}

      <section>
        <h3 style={{ marginTop: 0 }}>Resources</h3>
        {state === "ready" && resources.length === 0 ? <p className="muted">No resource tables yet.</p> : null}
        {resources.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Current version</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.name}</td>
                    <td>
                      <code>{resource.slug}</code>
                    </td>
                    <td>
                      <code>{resource.currentVersionId ?? "-"}</code>
                    </td>
                    <td>
                      <span className="muted">{formatTime(resource.updatedAt)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link className="btn" href={`/resources/tables/${encodeURIComponent(resource.slug)}`}>
                          View
                        </Link>
                        <Link className="btn" href={`/resources/tables/${encodeURIComponent(resource.slug)}/versions`}>
                          Versions
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

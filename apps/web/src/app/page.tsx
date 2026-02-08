export default function HomePage() {
  return (
    <div className="card">
      <h1>accelerate-core</h1>
      <p className="muted">
        V1: Firebase App Hosting (web) + Cloud Run (api/worker) + Firestore + BigQuery.
      </p>
      <p className="pill">
        Admin allowlist enforced by API via <code>ALLOWED_ADMIN_EMAILS</code>
      </p>
    </div>
  );
}

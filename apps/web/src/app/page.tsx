import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      <div className="nav">
        <Link href="/connectors">Connectors</Link>
        <Link href="/datasets">Datasets</Link>
        <Link href="/runs/example-run-id">Runs</Link>
      </div>

      <div className="card">
        <h1>accelerate-core</h1>
        <p className="muted">
          V1 scaffold: Firebase App Hosting (web) + Cloud Run (api/worker) + Firestore + BigQuery.
        </p>
        <p className="pill">
          Admin allowlist enforced by API/Worker via <code>ALLOWED_ADMIN_EMAILS</code>
        </p>
      </div>
    </div>
  );
}


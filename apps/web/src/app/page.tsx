import Link from "next/link";

import { Page } from "./_components/Page";

export default function HomePage() {
  return (
    <Page
      title="Home"
      description="Internal-only pipeline runner: trigger connectors, produce versioned BigQuery tables, and preview results."
    >
      <div className="card">
        <p className="pill">
          Admin allowlist enforced by API via <code>ALLOWED_ADMIN_EMAILS</code>
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          Start here:
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Link className="btn" href="/connectors">
            Browse APIs
          </Link>
          <Link className="btn" href="/runs">
            View runs
          </Link>
          <Link className="btn" href="/datasets">
            View datasets
          </Link>
          <Link className="btn" href="/resources">
            View resources
          </Link>
        </div>
      </div>
    </Page>
  );
}

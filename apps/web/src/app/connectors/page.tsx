import Link from "next/link";

import { Page } from "../_components/Page";

export default function ConnectorsPage() {
  return (
    <Page
      title="APIs"
      description="External data sources you can run. Each run writes raw artifacts to GCS and creates a versioned BigQuery table."
    >
      <div className="gridCards">
        <Link className="card cardLink" href="/connectors/joshuaproject">
          <h2 style={{ margin: 0 }}>Joshua Project</h2>
          <p className="muted" style={{ margin: "10px 0 0" }}>
            PGIC people groups (dataset: <code>pgic_people_groups</code>)
          </p>
        </Link>
      </div>
    </Page>
  );
}

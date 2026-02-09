import { Page } from "../_components/Page";
import Link from "next/link";

export default function DatasetsPage() {
  return (
    <Page
      title="Datasets"
      description="Read-only index of datasets. Versions are created by the worker as BigQuery tables (table-per-version)."
    >
      <div className="gridCards">
        <Link className="card cardLink" href="/datasets/pgic_people_groups">
          <h2 style={{ margin: 0 }}>PGIC People Groups</h2>
          <p className="muted" style={{ margin: "10px 0 0" }}>
            Dataset id: <code>pgic_people_groups</code>
          </p>
        </Link>
      </div>
    </Page>
  );
}

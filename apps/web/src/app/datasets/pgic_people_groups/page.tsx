import { Page } from "../../_components/Page";
import { PgicPeopleGroupsClient } from "./dataset-client";

export default function PgicPeopleGroupsPage() {
  return (
    <Page
      title="PGIC People Groups"
      description="Read-only dataset produced by the Joshua Project connector. Each successful run creates a new versioned BigQuery table."
    >
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          If you have not run the connector yet, this dataset will have no versions and preview will fail with “Dataset
          has no versions”.
        </p>
        <PgicPeopleGroupsClient />
      </div>
    </Page>
  );
}


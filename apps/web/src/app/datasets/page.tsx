import { Page } from "../_components/Page";

export default function DatasetsPage() {
  return (
    <Page
      title="Datasets"
      description="Read-only index of datasets. Versions are created by the worker as BigQuery tables (table-per-version)."
    >
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Placeholder list. First dataset id: <code>pgic_people_groups</code>.
        </p>
        <p className="muted">
          After a run succeeds, the dataset version is recorded in Firestore and the data is loaded into BigQuery as
          <code> pgic_people_groups__v000001</code>, <code>__v000002</code>, etc.
        </p>
      </div>
    </Page>
  );
}

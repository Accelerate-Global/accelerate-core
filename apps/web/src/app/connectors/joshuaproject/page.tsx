import { Page } from "../../_components/Page";
import { AdminActions } from "../ui";

export default function JoshuaProjectPage() {
  return (
    <Page
      title="Joshua Project"
      description="PGIC people groups connector. Runs are sequential in V1 and produce a new BigQuery table per successful run."
    >
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Trigger a run, then open the run page to watch status updates, view Cloud Run logs, and preview rows once the
          BigQuery load finishes.
        </p>
        <AdminActions />
      </div>
    </Page>
  );
}


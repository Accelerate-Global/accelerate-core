import { RunDetailsClient } from "./run-details-client";
import { Page } from "../../_components/Page";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  return (
    <Page title="Run" description="Status, artifacts, and a read-only preview of the loaded BigQuery rows.">
      <div className="card">
        <p className="pill">
          Run ID: <code>{runId}</code>
        </p>
        <RunDetailsClient runId={runId} />
      </div>
    </Page>
  );
}

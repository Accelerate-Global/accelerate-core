import { Page } from "../_components/Page";
import { RunsClient } from "./runs-client";

export default function RunsPage() {
  return (
    <Page title="Runs" description="Recent connector runs. Click a run to monitor status and preview rows.">
      <div className="card">
        <RunsClient />
      </div>
    </Page>
  );
}


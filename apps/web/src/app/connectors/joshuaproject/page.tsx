import { Suspense } from "react";
import { Page } from "../../_components/Page";
import { JoshuaProjectClient } from "./joshuaproject-client";

export default function JoshuaProjectPage() {
  return (
    <Page
      title="Joshua Project"
      description="PGIC people groups connector. Runs are sequential in V1 and produce a new BigQuery table per successful run."
    >
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <JoshuaProjectClient />
      </Suspense>
    </Page>
  );
}

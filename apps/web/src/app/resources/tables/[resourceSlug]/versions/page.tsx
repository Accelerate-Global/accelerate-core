import { Page } from "../../../../_components/Page";
import { ResourceVersionsClient } from "./versions-client";

export default async function ResourceVersionsPage({ params }: { params: Promise<{ resourceSlug: string }> }) {
  const { resourceSlug } = await params;
  return (
    <Page title="Resource Versions" description="History for this resource table, including restore actions.">
      <div className="card">
        <ResourceVersionsClient resourceSlug={resourceSlug} />
      </div>
    </Page>
  );
}

import { Page } from "../../../_components/Page";
import { ResourceDetailClient } from "./resource-detail-client";

export default async function ResourceDetailPage({ params }: { params: Promise<{ resourceSlug: string }> }) {
  const { resourceSlug } = await params;
  return (
    <Page title="Resource Table" description="Current version editing, CSV uploads, and metadata for this resource.">
      <div className="card">
        <ResourceDetailClient resourceSlug={resourceSlug} />
      </div>
    </Page>
  );
}

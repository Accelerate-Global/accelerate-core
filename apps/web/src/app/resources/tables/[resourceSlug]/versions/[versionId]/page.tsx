import { Page } from "../../../../../_components/Page";
import { ResourceVersionSnapshotClient } from "./version-snapshot-client";

export default async function ResourceVersionSnapshotPage({
  params
}: {
  params: Promise<{ resourceSlug: string; versionId: string }>;
}) {
  const { resourceSlug, versionId } = await params;
  return (
    <Page title="Resource Version Snapshot" description="Read-only view of a historical resource table version.">
      <div className="card">
        <ResourceVersionSnapshotClient resourceSlug={resourceSlug} versionId={versionId} />
      </div>
    </Page>
  );
}

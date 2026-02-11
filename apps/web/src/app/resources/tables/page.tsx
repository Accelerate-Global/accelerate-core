import { Page } from "../../_components/Page";
import { ResourceTablesClient } from "./tables-client";

export default function ResourceTablesPage() {
  return (
    <Page title="Resource Tables" description="Manage all resource tables and their current version pointers.">
      <div className="card">
        <ResourceTablesClient />
      </div>
    </Page>
  );
}

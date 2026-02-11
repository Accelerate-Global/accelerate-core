import Link from "next/link";
import { Page } from "../_components/Page";

export default function ResourcesOverviewPage() {
  return (
    <Page
      title="Resources"
      description="Versioned internal reference tables. Upload CSVs, edit values, and manage immutable version history."
    >
      <div className="gridCards">
        <Link className="card cardLink" href="/resources/tables">
          <h2 style={{ margin: 0 }}>Resource Tables</h2>
          <p className="muted" style={{ margin: "10px 0 0" }}>
            Create tables, upload CSV versions, edit current data, and restore historical snapshots.
          </p>
        </Link>
      </div>
    </Page>
  );
}

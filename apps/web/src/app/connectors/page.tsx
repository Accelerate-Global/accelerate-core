import { AdminActions } from "./ui";

export default function ConnectorsPage() {
  return (
    <div className="card">
      <h1>Connectors</h1>
      <p className="muted">V1 internal-only: trigger a run, then monitor status on the run page.</p>
      <AdminActions />
    </div>
  );
}

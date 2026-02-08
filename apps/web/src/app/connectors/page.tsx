import { AdminActions } from "./ui";

export default function ConnectorsPage() {
  return (
    <div className="container">
      <div className="nav">
        <a href="/">Home</a>
        <a href="/datasets">Datasets</a>
      </div>

      <div className="card">
        <h1>Connectors</h1>
        <p className="muted">Placeholder list. API integration will be added in V1.</p>
        <AdminActions />
      </div>
    </div>
  );
}


export default function RunDetailPage({ params }: { params: { runId: string } }) {
  return (
    <div className="container">
      <div className="nav">
        <a href="/">Home</a>
        <a href="/connectors">Connectors</a>
        <a href="/datasets">Datasets</a>
      </div>

      <div className="card">
        <h1>Run</h1>
        <p className="pill">
          Run ID: <code>{params.runId}</code>
        </p>
        <p className="muted">Placeholder detail view. API integration will be added in V1.</p>
      </div>
    </div>
  );
}


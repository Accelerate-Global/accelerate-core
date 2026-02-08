export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

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
          Run ID: <code>{runId}</code>
        </p>
        <p className="muted">Placeholder detail view. API integration will be added in V1.</p>
      </div>
    </div>
  );
}

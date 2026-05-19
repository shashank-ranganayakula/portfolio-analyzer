const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function App() {
  return (
    <main className="dashboard-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Demo dashboard</p>
          <h1>Portfolio Risk Alerts</h1>
        </div>
        <button type="button" className="primary-action">
          Simulate Prices
        </button>
      </section>

      <section className="metric-grid" aria-label="Portfolio risk summary">
        <article className="metric-card">
          <span>Total Clients</span>
          <strong>100</strong>
        </article>
        <article className="metric-card">
          <span>Tracked Equities</span>
          <strong>20</strong>
        </article>
        <article className="metric-card">
          <span>Open Alerts</span>
          <strong>0</strong>
        </article>
        <article className="metric-card">
          <span>AI Insights</span>
          <strong>0</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Risk Alerts</h2>
          <p>No active alerts.</p>
        </article>
        <article className="panel">
          <h2>AI Commentary</h2>
          <p>No client commentary available.</p>
        </article>
      </section>

      <footer>
        API target: <code>{apiBaseUrl}</code>
      </footer>
    </main>
  );
}

export default App;

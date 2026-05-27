import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const scenarios = ["mixed", "stable", "rally", "stress"];

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const severityClass = (severity) => `severity severity-${String(severity ?? "low").toLowerCase()}`;

const severityRank = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};

const getHighestSeverity = (insights) =>
  insights.reduce(
    (highest, insight) => (severityRank[insight.severity] > severityRank[highest] ? insight.severity : highest),
    "LOW"
  );

const unique = (items) => [...new Set(items.filter(Boolean))];

const consolidateClientInsights = (insights, clientId) => {
  const clientInsights = insights.filter((insight) => insight.clientId === clientId);

  if (clientInsights.length <= 1) {
    return clientInsights;
  }

  const newest = clientInsights[0];
  const providers = unique(clientInsights.map((insight) => insight.provider));
  const explanations = unique(clientInsights.map((insight) => insight.explanation)).slice(0, 3);
  const actions = unique(clientInsights.map((insight) => insight.suggestedAction)).slice(0, 3);

  return [
    {
      insightId: `consolidated-${clientId}`,
      clientId,
      provider: providers.join(" + "),
      severity: getHighestSeverity(clientInsights),
      explanation: `Consolidated ${clientInsights.length} insights for ${clientId}: ${explanations.join(" ")}`,
      suggestedAction: actions.join(" "),
      disclaimer: newest.disclaimer,
      sourceInsightCount: clientInsights.length,
      createdAt: newest.createdAt
    }
  ];
};

function EmptyState({ children }) {
  return <p className="empty-state">{children}</p>;
}

function App() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("C001");
  const [allocation, setAllocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [clientAlerts, setClientAlerts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [scenario, setScenario] = useState("stress");
  const [status, setStatus] = useState("Loading dashboard data");
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState("");

  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.clientId === selectedClientId),
    [portfolios, selectedClientId]
  );

  const fetchDashboardData = async (clientId = selectedClientId) => {
    setError("");
    setIsLoading(true);

    try {
      const portfolioResult = await api.listPortfolios();
      const allocationResult = await api.getAllocation(clientId);
      const clientAlertsResult = await api.getClientAlerts(clientId);
      const insightsResult = await api.getClientInsights(clientId);

      const nextPortfolios = portfolioResult.portfolios ?? [];
      const selectedClientAlerts = (clientAlertsResult.alerts ?? []).filter((alert) => alert.clientId === clientId);
      setPortfolios(nextPortfolios);
      setAlerts(selectedClientAlerts);
      setAllocation(allocationResult.allocation ?? null);
      setClientAlerts(selectedClientAlerts);
      setInsights(consolidateClientInsights(insightsResult.insights ?? [], clientId));

      if (!nextPortfolios.some((portfolio) => portfolio.clientId === clientId) && nextPortfolios[0]) {
        setSelectedClientId(nextPortfolios[0].clientId);
      }

      setStatus(`Updated ${new Date().toLocaleTimeString()}`);
    } catch (caughtError) {
      setError(caughtError.message);
      setStatus("API unavailable");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedClientId);
    const intervalId = window.setInterval(() => fetchDashboardData(selectedClientId), 30000);

    return () => window.clearInterval(intervalId);
  }, [selectedClientId]);

  const handleClientChange = (event) => {
    setSelectedClientId(event.target.value);
  };

  const handleSimulation = async () => {
    setIsSimulating(true);
    setError("");

    try {
      const result = await api.simulatePrices(scenario);
      setStatus(`Simulated ${result.updatedPrices} prices`);
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      await fetchDashboardData(selectedClientId);
    } catch (caughtError) {
      setError(caughtError.message);
      setStatus("Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  const portfolioValue = allocation?.portfolioValue ?? 0;
  const totalDriftAlerts = clientAlerts.filter((alert) => alert.riskType === "ALLOCATION_DRIFT").length;
  const highAlerts = clientAlerts.filter((alert) => alert.severity === "HIGH").length;

  return (
    <main className="dashboard-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Portfolio risk operations</p>
          <h1>Portfolio Risk Alerts</h1>
          <p className="status-line">{status}</p>
        </div>
        <div className="action-group">
          <label className="field-label" htmlFor="scenario">
            Scenario
          </label>
          <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value)}>
            {scenarios.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="button" className="primary-action" onClick={handleSimulation} disabled={isSimulating}>
            {isSimulating ? "Simulating" : "Simulate Prices"}
          </button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <section className="metric-grid" aria-label="Portfolio risk summary">
        <article className="metric-card">
          <span>Total Clients</span>
          <strong>{portfolios.length}</strong>
        </article>
        <article className="metric-card">
          <span>Selected Value</span>
          <strong>{currency.format(portfolioValue)}</strong>
        </article>
        <article className="metric-card">
          <span>Client Alerts</span>
          <strong>{clientAlerts.length}</strong>
        </article>
        <article className="metric-card">
          <span>High Severity</span>
          <strong>{highAlerts}</strong>
        </article>
      </section>

      <section className="control-band">
        <label className="field-label" htmlFor="client">
          Client
        </label>
        <select id="client" value={selectedClientId} onChange={handleClientChange}>
          {portfolios.length === 0 && <option value={selectedClientId}>{selectedClientId}</option>}
          {portfolios.map((portfolio) => (
            <option key={portfolio.clientId} value={portfolio.clientId}>
              {portfolio.clientName} - {portfolio.clientId}
            </option>
          ))}
        </select>
        <dl className="client-summary">
          <div>
            <dt>Client</dt>
            <dd>{selectedPortfolio?.clientName ?? selectedClientId}</dd>
          </div>
          <div>
            <dt>Day Start</dt>
            <dd>{currency.format(allocation?.dayStartValue ?? selectedPortfolio?.dayStartValue ?? 0)}</dd>
          </div>
          <div>
            <dt>Drift Alerts</dt>
            <dd>{totalDriftAlerts}</dd>
          </div>
        </dl>
      </section>

      <section className="content-grid content-grid-main">
        <article className="panel">
          <div className="panel-header">
            <h2>Allocation</h2>
            <span>{allocation?.allocation?.length ?? 0} holdings</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Value</th>
                  <th>Model</th>
                  <th>Actual</th>
                  <th>Drift</th>
                </tr>
              </thead>
              <tbody>
                {(allocation?.allocation ?? []).map((holding) => (
                  <tr key={holding.symbol}>
                    <td>{holding.symbol}</td>
                    <td>{currency.format(holding.value)}</td>
                    <td>{percent.format(holding.modelWeight)}</td>
                    <td>{percent.format(holding.actualWeight)}</td>
                    <td className={Math.abs(holding.drift) > 0.05 ? "text-warn" : ""}>
                      {percent.format(holding.drift)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && !allocation && <EmptyState>No allocation data.</EmptyState>}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Client Alerts</h2>
            <span>{clientAlerts.length}</span>
          </div>
          <div className="stack-list">
            {clientAlerts.map((alert) => (
              <div className="list-item" key={alert.alertId}>
                <div className="item-line">
                  <strong>{alert.riskType.replaceAll("_", " ")}</strong>
                  <span className={severityClass(alert.severity)}>{alert.severity}</span>
                </div>
                <p>{alert.details?.symbol ?? "Portfolio"} at {currency.format(alert.portfolioValue)}</p>
                <time>{formatDateTime(alert.createdAt)}</time>
              </div>
            ))}
            {!isLoading && clientAlerts.length === 0 && <EmptyState>No client alerts.</EmptyState>}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Recent Client Alerts</h2>
            <span>{alerts.length}</span>
          </div>
          <div className="stack-list compact">
            {alerts.slice(0, 8).map((alert) => (
              <div className="list-item" key={alert.alertId}>
                <div className="item-line">
                  <strong>{alert.clientId}</strong>
                  <span className={severityClass(alert.severity)}>{alert.severity}</span>
                </div>
                <p>{alert.riskType.replaceAll("_", " ")}</p>
              </div>
            ))}
            {!isLoading && alerts.length === 0 && <EmptyState>No alerts.</EmptyState>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>AI Insights</h2>
            <span>{selectedClientId}</span>
          </div>
          <div className="stack-list">
            {insights.map((insight) => (
              <div className="list-item" key={insight.insightId}>
                <div className="item-line">
                  <strong>{insight.provider}</strong>
                  <span className={severityClass(insight.severity)}>{insight.severity}</span>
                </div>
                {insight.sourceInsightCount > 1 && (
                  <time>{insight.sourceInsightCount} selected-client insights consolidated</time>
                )}
                <p>{insight.explanation}</p>
                <p className="suggested-action">{insight.suggestedAction}</p>
                <small>{insight.disclaimer}</small>
              </div>
            ))}
            {!isLoading && insights.length === 0 && <EmptyState>No insights.</EmptyState>}
          </div>
        </article>
      </section>

    </main>
  );
}

export default App;

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const sleep = (durationMs) => new Promise((resolve) => window.setTimeout(resolve, durationMs));

const requestJson = async (path, options = {}) => {
  const retries = options.retries ?? 2;
  const requestOptions = { ...options };
  delete requestOptions.retries;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "content-type": "application/json",
        ...(requestOptions.headers ?? {})
      },
      ...requestOptions
    });

    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
      return payload;
    }

    if ([502, 503, 504].includes(response.status) && attempt < retries) {
      await sleep(800 * (attempt + 1));
      continue;
    }

    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  throw new Error("Request failed");
};

export const api = {
  listPortfolios: () => requestJson("/portfolios"),
  getAllocation: (clientId) => requestJson(`/portfolios/${clientId}/allocation`),
  listAlerts: () => requestJson("/alerts"),
  getClientAlerts: (clientId) => requestJson(`/alerts/${clientId}`),
  getClientInsights: (clientId) => requestJson(`/insights/${clientId}`),
  simulatePrices: (scenario) =>
    requestJson("/simulate-prices", {
      method: "POST",
      body: JSON.stringify({ scenario })
    })
};

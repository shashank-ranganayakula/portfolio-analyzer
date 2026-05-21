const requireEnv = (name, fallback = undefined) => {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const optionalEnv = (name, fallback = "") => process.env[name] ?? fallback;

// Centralized runtime configuration keeps Lambda handlers small and easy to test.
export const config = {
  awsRegion: optionalEnv("AWS_REGION", "us-east-1"),
  eventBusName: optionalEnv("EVENT_BUS_NAME", "portfolio-risk-alert-bus"),
  tables: {
    portfolios: optionalEnv("PORTFOLIOS_TABLE", "portfolio-risk-alert-portfolios"),
    marketPrices: optionalEnv("MARKET_PRICES_TABLE", "portfolio-risk-alert-market-prices"),
    riskAlerts: optionalEnv("RISK_ALERTS_TABLE", "portfolio-risk-alert-risk-alerts"),
    aiInsights: optionalEnv("AI_INSIGHTS_TABLE", "portfolio-risk-alert-ai-insights")
  },
  queues: {
    riskAlertQueueUrl: optionalEnv("RISK_ALERT_QUEUE_URL")
  },
  ai: {
    provider: optionalEnv("AI_PROVIDER", "groq"),
    apiKey: optionalEnv("AI_API_KEY"),
    model: optionalEnv("AI_MODEL", "llama-3.1-8b-instant"),
    apiUrl: optionalEnv("AI_API_URL"),
    throttleMs: Number(optionalEnv("AI_THROTTLE_MS", "2500")),
    maxRetries: Number(optionalEnv("AI_MAX_RETRIES", "2"))
  },
  cors: {
    origin: optionalEnv("CORS_ORIGIN", "*")
  }
};

// Useful for future startup checks and local invoke tests.
export const assertRuntimeConfig = () => {
  requireEnv("PORTFOLIOS_TABLE", config.tables.portfolios);
  requireEnv("MARKET_PRICES_TABLE", config.tables.marketPrices);
  requireEnv("RISK_ALERTS_TABLE", config.tables.riskAlerts);
  requireEnv("AI_INSIGHTS_TABLE", config.tables.aiInsights);
  return config;
};

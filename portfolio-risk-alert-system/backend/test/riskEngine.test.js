import test from "node:test";
import assert from "node:assert/strict";
import { detectRiskBreaches } from "../src/risk-service/riskEngine.js";

const now = new Date("2026-05-13T10:00:00Z");

test("detectRiskBreaches creates high daily drop alert", () => {
  const portfolio = {
    clientId: "C001",
    dayStartValue: 1000,
    holdings: [{ symbol: "AAPL", quantity: 10, modelWeight: 1 }]
  };

  const alerts = detectRiskBreaches({
    portfolio,
    prices: [{ symbol: "AAPL", price: 90 }],
    now
  });

  const dailyDropAlert = alerts.find((alert) => alert.riskType === "DAILY_PORTFOLIO_DROP");

  assert.equal(dailyDropAlert.severity, "HIGH");
  assert.equal(dailyDropAlert.alertId, "alert-2026-05-13-C001-DAILY-PORTFOLIO-DROP-PORTFOLIO");
  assert.equal(dailyDropAlert.portfolioValue, 900);
  assert.equal(dailyDropAlert.details.dropPercent, 10);
});

test("detectRiskBreaches creates single stock exposure alerts with expected severity", () => {
  const portfolio = {
    clientId: "C002",
    dayStartValue: 1000,
    holdings: [
      { symbol: "AAPL", quantity: 4, modelWeight: 0.2 },
      { symbol: "MSFT", quantity: 6, modelWeight: 0.8 }
    ]
  };

  const alerts = detectRiskBreaches({
    portfolio,
    prices: [
      { symbol: "AAPL", price: 100 },
      { symbol: "MSFT", price: 100 }
    ],
    now
  });

  const exposureAlert = alerts.find((alert) => alert.riskType === "SINGLE_STOCK_EXPOSURE" && alert.details.symbol === "AAPL");

  assert.equal(exposureAlert.severity, "HIGH");
  assert.equal(exposureAlert.details.actualWeight, 0.4);
});

test("detectRiskBreaches creates allocation drift alert", () => {
  const portfolio = {
    clientId: "C003",
    dayStartValue: 1000,
    holdings: [
      { symbol: "AAPL", quantity: 56, modelWeight: 0.5 },
      { symbol: "MSFT", quantity: 44, modelWeight: 0.5 }
    ]
  };

  const alerts = detectRiskBreaches({
    portfolio,
    prices: [
      { symbol: "AAPL", price: 10 },
      { symbol: "MSFT", price: 10 }
    ],
    now
  });

  const driftAlert = alerts.find((alert) => alert.riskType === "ALLOCATION_DRIFT" && alert.details.symbol === "AAPL");

  assert.equal(driftAlert.severity, "LOW");
  assert.equal(driftAlert.details.drift, 0.06);
});

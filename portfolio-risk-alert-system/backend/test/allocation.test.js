import test from "node:test";
import assert from "node:assert/strict";
import { computeAllocation } from "../src/portfolio-service/allocation.js";

test("computeAllocation calculates value, weights, and drift", () => {
  const portfolio = {
    clientId: "C001",
    clientName: "Client 001",
    dayStartValue: 1000,
    holdings: [
      { symbol: "AAPL", quantity: 2, modelWeight: 0.5 },
      { symbol: "MSFT", quantity: 1, modelWeight: 0.5 }
    ]
  };
  const prices = [
    { symbol: "AAPL", price: 100 },
    { symbol: "MSFT", price: 300 }
  ];

  const result = computeAllocation({ portfolio, prices });

  assert.equal(result.portfolioValue, 500);
  assert.deepEqual(result.missingPrices, []);
  assert.equal(result.allocation[0].value, 200);
  assert.equal(result.allocation[0].actualWeight, 0.4);
  assert.equal(result.allocation[0].drift, -0.1);
  assert.equal(result.allocation[1].actualWeight, 0.6);
  assert.equal(result.allocation[1].drift, 0.1);
});

test("computeAllocation records missing prices without throwing", () => {
  const portfolio = {
    clientId: "C002",
    clientName: "Client 002",
    dayStartValue: 1000,
    holdings: [{ symbol: "AAPL", quantity: 2, modelWeight: 1 }]
  };

  const result = computeAllocation({ portfolio, prices: [] });

  assert.equal(result.portfolioValue, 0);
  assert.deepEqual(result.missingPrices, ["AAPL"]);
  assert.equal(result.allocation[0].price, null);
});


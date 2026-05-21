import test from "node:test";
import assert from "node:assert/strict";
import { parseSimulationRequest, simulatePriceUpdates } from "../src/market-data-service/simulator.js";
import { seedMarketPrices, symbols } from "../src/seed/seedData.js";

test("parseSimulationRequest defaults to mixed scenario and all symbols", () => {
  const request = parseSimulationRequest({});

  assert.equal(request.scenario, "mixed");
  assert.deepEqual(request.symbols, symbols);
});

test("parseSimulationRequest accepts known scenario and filters symbols", () => {
  const request = parseSimulationRequest({
    body: JSON.stringify({
      scenario: "stress",
      symbols: ["AAPL", "NOT_REAL"]
    })
  });

  assert.equal(request.scenario, "stress");
  assert.deepEqual(request.symbols, ["AAPL"]);
});

test("parseSimulationRequest tolerates PowerShell-escaped JSON body", () => {
  const request = parseSimulationRequest({
    body: '{\\"scenario\\":\\"stress\\"}'
  });

  assert.equal(request.scenario, "stress");
  assert.deepEqual(request.symbols, symbols);
});

test("simulatePriceUpdates creates deterministic PriceUpdated data", () => {
  const updates = simulatePriceUpdates({
    currentPrices: seedMarketPrices,
    scenario: "stress",
    requestedSymbols: ["AAPL", "NVDA"],
    now: new Date("2026-05-13T10:00:00Z")
  });

  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0], {
    symbol: "AAPL",
    price: 183.16,
    previousPrice: 192.4,
    changePercent: -4.8,
    updatedAt: "2026-05-13T10:00:00.000Z"
  });
  assert.equal(updates[1].symbol, "NVDA");
  assert.equal(updates[1].changePercent, -7.4);
});

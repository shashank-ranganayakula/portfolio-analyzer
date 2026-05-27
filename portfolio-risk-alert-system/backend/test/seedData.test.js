import test from "node:test";
import assert from "node:assert/strict";
import { seedMarketPrices, seedPortfolios, symbols } from "../src/seed/seedData.js";

test("seed data contains 100 portfolios and 20 market prices", () => {
  assert.equal(seedPortfolios.length, 100);
  assert.equal(seedMarketPrices.length, 20);
  assert.equal(symbols.length, 20);
});

test("seed portfolios are deterministic and shaped for DynamoDB", () => {
  const first = seedPortfolios[0];

  assert.equal(first.clientId, "C001");
  assert.equal(first.clientName, "Client 001");
  assert.equal(first.holdings.length, 6);
  assert.ok(first.holdings.every((holding) => symbols.includes(holding.symbol)));
  assert.ok(first.holdings.every((holding) => holding.quantity > 0));
});

test("each seeded portfolio has a unique stock mix", () => {
  const signatures = seedPortfolios.map((portfolio) =>
    portfolio.holdings.map((holding) => holding.symbol).sort().join("|")
  );

  assert.equal(new Set(signatures).size, seedPortfolios.length);
});

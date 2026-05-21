import { seedMarketPrices, symbols } from "../seed/seedData.js";

export const scenarios = {
  mixed: [-1.8, 0.9, -0.7, 1.2, -2.4, 3.1, -4.2, 0.4, -1.1, 0.7, 0.3, -0.2, 0.6, 1.5, -1.4, 0.8, -0.5, 1.1, 0.9, -2.1],
  stable: [-0.4, 0.3, -0.2, 0.5, -0.6, 0.7, -0.8, 0.2, -0.3, 0.4, 0.1, -0.1, 0.3, 0.6, -0.4, 0.5, -0.2, 0.4, 0.3, -0.5],
  rally: [2.4, 1.8, 2.1, 1.6, 2.9, 4.2, 3.7, 1.1, 0.9, 1.3, 0.8, 0.7, 1.0, 1.5, 1.4, 1.2, 0.9, 1.8, 1.9, 2.6],
  stress: [-4.8, -3.2, -3.9, -2.8, -5.1, -7.4, -8.2, -2.3, -2.7, -1.5, -1.1, -0.9, -1.4, 1.8, 1.5, -2.1, -1.7, -3.0, -3.4, -5.9]
};

export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const parseSimulationRequest = (event) => {
  if (!event?.body) {
    return {
      scenario: "mixed",
      symbols
    };
  }

  let body = event.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = JSON.parse(body.replace(/\\"/g, '"'));
    }
  }

  const scenario = scenarios[body.scenario] ? body.scenario : "mixed";
  const requestedSymbols = Array.isArray(body.symbols)
    ? body.symbols.filter((symbol) => symbols.includes(symbol))
    : symbols;

  return {
    scenario,
    symbols: requestedSymbols.length > 0 ? requestedSymbols : symbols
  };
};

export const simulatePriceUpdates = ({ currentPrices, scenario = "mixed", requestedSymbols = symbols, now = new Date() }) => {
  const priceBySymbol = new Map(currentPrices.map((item) => [item.symbol, item]));
  const seedPriceBySymbol = new Map(seedMarketPrices.map((item) => [item.symbol, item]));
  const changes = scenarios[scenario] ?? scenarios.mixed;

  return requestedSymbols.map((symbol) => {
    const symbolIndex = symbols.indexOf(symbol);
    const current = priceBySymbol.get(symbol) ?? seedPriceBySymbol.get(symbol);
    const previousPrice = current?.price ?? 100;
    const changePercent = changes[symbolIndex] ?? 0;
    const price = roundMoney(previousPrice * (1 + changePercent / 100));

    return {
      symbol,
      price,
      previousPrice: roundMoney(previousPrice),
      changePercent,
      updatedAt: now.toISOString()
    };
  });
};

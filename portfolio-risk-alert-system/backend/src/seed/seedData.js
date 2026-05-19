import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { fileURLToPath } from "node:url";
import { documentClient, getTableName } from "../shared/dynamodb.js";

export const symbols = [
  "AAPL",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "NVDA",
  "TSLA",
  "JPM",
  "BAC",
  "WMT",
  "PG",
  "KO",
  "PEP",
  "XOM",
  "CVX",
  "UNH",
  "JNJ",
  "V",
  "MA",
  "NFLX"
];

export const initialPrices = {
  AAPL: 192.4,
  MSFT: 421.7,
  AMZN: 184.2,
  GOOGL: 171.9,
  META: 498.3,
  NVDA: 924.5,
  TSLA: 179.8,
  JPM: 198.1,
  BAC: 39.4,
  WMT: 64.8,
  PG: 163.2,
  KO: 62.3,
  PEP: 178.6,
  XOM: 116.9,
  CVX: 161.2,
  UNH: 518.4,
  JNJ: 151.1,
  V: 276.5,
  MA: 456.7,
  NFLX: 612.8
};

const modelWeights = [0.22, 0.18, 0.16, 0.15, 0.14, 0.15];

const formatClientId = (index) => `C${String(index).padStart(3, "0")}`;

const buildHoldings = (clientIndex) =>
  modelWeights.map((modelWeight, holdingIndex) => {
    const symbol = symbols[(clientIndex + holdingIndex * 3) % symbols.length];
    const price = initialPrices[symbol];
    const targetPortfolioValue = 85000 + clientIndex * 850;
    const targetHoldingValue = targetPortfolioValue * modelWeight;

    return {
      symbol,
      quantity: Math.max(1, Math.round(targetHoldingValue / price)),
      modelWeight
    };
  });

export const seedPortfolios = Array.from({ length: 100 }, (_, index) => {
  const clientNumber = index + 1;
  const createdAt = new Date("2026-05-13T10:00:00Z").toISOString();

  return {
    clientId: formatClientId(clientNumber),
    clientName: `Client ${String(clientNumber).padStart(3, "0")}`,
    dayStartValue: 85000 + clientNumber * 850,
    holdings: buildHoldings(clientNumber),
    createdAt,
    updatedAt: createdAt
  };
});

export const seedMarketPrices = symbols.map((symbol) => ({
  symbol,
  price: initialPrices[symbol],
  previousPrice: initialPrices[symbol],
  updatedAt: new Date("2026-05-13T10:00:00Z").toISOString()
}));

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const batchWriteAll = async (tableName, items) => {
  for (const batch of chunk(items, 25)) {
    let requestItems = {
      [tableName]: batch.map((item) => ({
        PutRequest: {
          Item: item
        }
      }))
    };

    do {
      const result = await documentClient.send(
        new BatchWriteCommand({
          RequestItems: requestItems
        })
      );

      requestItems = result.UnprocessedItems ?? {};
    } while (Object.keys(requestItems).length > 0);
  }
};

export const loadSeedData = async () => {
  await batchWriteAll(getTableName("portfolios"), seedPortfolios);
  await batchWriteAll(getTableName("marketPrices"), seedMarketPrices);

  return {
    portfolios: seedPortfolios.length,
    marketPrices: seedMarketPrices.length
  };
};

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  loadSeedData()
    .then((result) => {
      console.log(JSON.stringify({ message: "Seed data loaded", ...result }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

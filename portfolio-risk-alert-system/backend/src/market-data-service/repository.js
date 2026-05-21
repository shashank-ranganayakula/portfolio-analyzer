import { BatchGetCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName } from "../shared/dynamodb.js";

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const getMarketPrices = async (symbols) => {
  const marketPricesTable = getTableName("marketPrices");
  const prices = [];

  for (const batch of chunk([...new Set(symbols)], 100)) {
    let requestItems = {
      [marketPricesTable]: {
        Keys: batch.map((symbol) => ({ symbol }))
      }
    };

    do {
      const result = await documentClient.send(
        new BatchGetCommand({
          RequestItems: requestItems
        })
      );

      prices.push(...(result.Responses?.[marketPricesTable] ?? []));
      requestItems = result.UnprocessedKeys ?? {};
    } while (Object.keys(requestItems).length > 0);
  }

  return prices;
};

export const saveMarketPrices = async (updates) => {
  const marketPricesTable = getTableName("marketPrices");

  for (const batch of chunk(updates, 25)) {
    let requestItems = {
      [marketPricesTable]: batch.map((item) => ({
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


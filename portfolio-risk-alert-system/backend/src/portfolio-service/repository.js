import { BatchGetCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName } from "../shared/dynamodb.js";

export const listPortfolioSummaries = async () => {
  const items = [];
  let ExclusiveStartKey;

  do {
    const result = await documentClient.send(
      new ScanCommand({
        TableName: getTableName("portfolios"),
        ProjectionExpression: "clientId, clientName, dayStartValue, createdAt, updatedAt",
        ExclusiveStartKey
      })
    );

    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items.sort((left, right) => left.clientId.localeCompare(right.clientId));
};

export const getPortfolioByClientId = async (clientId) => {
  const result = await documentClient.send(
    new GetCommand({
      TableName: getTableName("portfolios"),
      Key: { clientId }
    })
  );

  return result.Item;
};

export const getPricesForSymbols = async (symbols) => {
  const uniqueSymbols = [...new Set(symbols)];
  const marketPricesTable = getTableName("marketPrices");

  if (uniqueSymbols.length === 0) {
    return [];
  }

  const prices = [];
  let requestItems = {
    [marketPricesTable]: {
      Keys: uniqueSymbols.map((symbol) => ({ symbol }))
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

  return prices;
};

import { BatchGetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName } from "../shared/dynamodb.js";

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const scanAll = async (params) => {
  const items = [];
  let ExclusiveStartKey;

  do {
    const result = await documentClient.send(
      new ScanCommand({
        ...params,
        ExclusiveStartKey
      })
    );

    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items;
};

export const listPortfoliosHoldingSymbol = async (symbol) => {
  const portfolios = await scanAll({
    TableName: getTableName("portfolios")
  });

  return portfolios.filter((portfolio) => portfolio.holdings?.some((holding) => holding.symbol === symbol));
};

export const getPricesForSymbols = async (symbols) => {
  const uniqueSymbols = [...new Set(symbols)];
  const marketPricesTable = getTableName("marketPrices");
  const prices = [];

  for (const batch of chunk(uniqueSymbols, 100)) {
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

export const saveRiskAlerts = async (alerts) => {
  if (alerts.length === 0) {
    return [];
  }

  const riskAlertsTable = getTableName("riskAlerts");
  const savedAlerts = [];

  for (const alert of alerts) {
    try {
      await documentClient.send(
        new PutCommand({
          TableName: riskAlertsTable,
          Item: alert,
          ConditionExpression: "attribute_not_exists(alertId)"
        })
      );

      savedAlerts.push(alert);
    } catch (error) {
      if (error.name !== "ConditionalCheckFailedException") {
        throw error;
      }
    }
  }

  return savedAlerts;
};

export const listRiskAlerts = async () => {
  const alerts = await scanAll({
    TableName: getTableName("riskAlerts")
  });

  return alerts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const listRiskAlertsByClient = async (clientId) => {
  const alerts = await scanAll({
    TableName: getTableName("riskAlerts"),
    FilterExpression: "clientId = :clientId",
    ExpressionAttributeValues: {
      ":clientId": clientId
    }
  });

  return alerts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

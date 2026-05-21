import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient, getTableName } from "../shared/dynamodb.js";

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

export const saveInsight = async (insight) => {
  await documentClient.send(
    new PutCommand({
      TableName: getTableName("aiInsights"),
      Item: insight
    })
  );
};

export const listInsightsByClient = async (clientId) => {
  const insights = await scanAll({
    TableName: getTableName("aiInsights"),
    FilterExpression: "clientId = :clientId",
    ExpressionAttributeValues: {
      ":clientId": clientId
    }
  });

  return insights.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};


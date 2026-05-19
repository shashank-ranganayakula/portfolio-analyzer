import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { config } from "./config.js";

const client = new DynamoDBClient({
  region: config.awsRegion
});

// The document client lets service code work with plain JavaScript objects.
export const documentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  }
});

export const tableNames = config.tables;

// Keeps table lookups consistent across handlers and tests.
export const getTableName = (logicalName) => {
  const tableName = tableNames[logicalName];

  if (!tableName) {
    throw new Error(`Unknown DynamoDB table logical name: ${logicalName}`);
  }

  return tableName;
};

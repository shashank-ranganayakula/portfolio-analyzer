import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

const eventBridgeClient = new EventBridgeClient({
  region: config.awsRegion
});

// All domain events share this envelope before being sent through EventBridge.
export const createDomainEvent = ({ eventType, source, data }) => ({
  eventType,
  eventId: randomUUID(),
  timestamp: new Date().toISOString(),
  source,
  data
});

const sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

// Business services call this helper after deterministic work is complete.
export const publishDomainEvent = async ({ eventType, source, data }) => {
  const detail = createDomainEvent({ eventType, source, data });

  const result = await eventBridgeClient.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: config.eventBusName,
          Source: source,
          DetailType: eventType,
          Detail: JSON.stringify(detail)
        }
      ]
    })
  );

  if (result.FailedEntryCount > 0) {
    throw new Error(`Failed to publish ${result.FailedEntryCount} EventBridge event(s)`);
  }

  return detail;
};

export const publishDomainEvents = async (events, { batchSize = 10, delayMs = 0 } = {}) => {
  const details = events.map(createDomainEvent);
  const entries = details.map((detail) => ({
    EventBusName: config.eventBusName,
    Source: detail.source,
    DetailType: detail.eventType,
    Detail: JSON.stringify(detail)
  }));
  const safeBatchSize = Math.max(1, Math.min(batchSize, 10));

  for (let index = 0; index < entries.length; index += safeBatchSize) {
    const result = await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: entries.slice(index, index + safeBatchSize)
      })
    );

    if (result.FailedEntryCount > 0) {
      throw new Error(`Failed to publish ${result.FailedEntryCount} EventBridge event(s)`);
    }

    if (delayMs > 0 && index + safeBatchSize < entries.length) {
      await sleep(delayMs);
    }
  }

  return details;
};

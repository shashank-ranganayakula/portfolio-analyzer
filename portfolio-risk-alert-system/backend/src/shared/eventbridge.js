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

// Business services call this helper after deterministic work is complete.
export const publishDomainEvent = async ({ eventType, source, data }) => {
  const detail = createDomainEvent({ eventType, source, data });

  await eventBridgeClient.send(
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

  return detail;
};

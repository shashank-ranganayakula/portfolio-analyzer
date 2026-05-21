import test from "node:test";
import assert from "node:assert/strict";
import { createDomainEvent, publishDomainEvents } from "../src/shared/eventbridge.js";

test("createDomainEvent wraps payload in the expected envelope", () => {
  const event = createDomainEvent({
    eventType: "PriceUpdated",
    source: "market-data-service",
    data: {
      symbol: "AAPL",
      price: 192.4
    }
  });

  assert.equal(event.eventType, "PriceUpdated");
  assert.equal(event.source, "market-data-service");
  assert.equal(event.data.symbol, "AAPL");
  assert.match(event.eventId, /^[0-9a-f-]{36}$/);
  assert.ok(Date.parse(event.timestamp));
});

test("publishDomainEvents validates paced batch options without changing event envelopes", async () => {
  const events = await publishDomainEvents([], {
    batchSize: 1,
    delayMs: 1
  });

  assert.deepEqual(events, []);
});

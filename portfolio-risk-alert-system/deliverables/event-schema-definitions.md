# Event Schema Definitions

The application uses domain events to connect the market data, risk, and AI insight services. The JSON Schema files are stored in the `schemas/` directory.

## PriceUpdated

Produced by: Market Data Service

Consumed by: Risk Service

Purpose: announces that a simulated equity price has changed.

Schema file:

```text
schemas/price-updated.schema.json
```

Example:

```json
{
  "eventType": "PriceUpdated",
  "eventId": "uuid",
  "timestamp": "2026-05-13T10:00:00Z",
  "source": "market-data-service",
  "data": {
    "symbol": "AAPL",
    "price": 192.4,
    "previousPrice": 190.1,
    "changePercent": 1.21
  }
}
```

Required fields:

| Field | Type | Description |
| --- | --- | --- |
| `eventType` | string | Must be `PriceUpdated`. |
| `eventId` | string | Unique event identifier. |
| `timestamp` | date-time string | Event creation timestamp. |
| `source` | string | Must be `market-data-service`. |
| `data.symbol` | string | Equity ticker symbol. |
| `data.price` | number | New simulated price. |
| `data.previousPrice` | number | Previous stored price. |
| `data.changePercent` | number | Percentage move from previous price. |

## RiskThresholdBreached

Produced by: Risk Service

Consumed by: EventBridge rule and SQS Risk Alert Queue

Purpose: announces that deterministic risk logic has detected a breach.

Schema file:

```text
schemas/risk-threshold-breached.schema.json
```

Example:

```json
{
  "eventType": "RiskThresholdBreached",
  "eventId": "uuid",
  "timestamp": "2026-05-13T10:00:00Z",
  "source": "risk-service",
  "data": {
    "alertId": "alert-uuid",
    "clientId": "C001",
    "riskType": "ALLOCATION_DRIFT",
    "severity": "MEDIUM",
    "portfolioValue": 104500,
    "details": {
      "symbol": "AAPL",
      "modelWeight": 0.15,
      "actualWeight": 0.22,
      "drift": 0.07
    }
  }
}
```

Required fields:

| Field | Type | Description |
| --- | --- | --- |
| `eventType` | string | Must be `RiskThresholdBreached`. |
| `eventId` | string | Unique event identifier. |
| `timestamp` | date-time string | Event creation timestamp. |
| `source` | string | Must be `risk-service`. |
| `data.alertId` | string | ID of the stored risk alert. |
| `data.clientId` | string | Client associated with the breach. |
| `data.riskType` | enum | `ALLOCATION_DRIFT`, `SINGLE_STOCK_EXPOSURE`, or `DAILY_PORTFOLIO_DROP`. |
| `data.severity` | enum | `LOW`, `MEDIUM`, or `HIGH`. |
| `data.portfolioValue` | number | Portfolio value at evaluation time. |
| `data.details` | object | Risk-specific context such as symbol, weights, or drop percent. |

## AIInsightGenerated

Produced by: AI Insight Service

Consumed by: optional downstream listeners and audit flow

Purpose: announces that an AI or fallback insight was generated and stored.

Schema file:

```text
schemas/ai-insight-generated.schema.json
```

Example:

```json
{
  "eventType": "AIInsightGenerated",
  "eventId": "uuid",
  "timestamp": "2026-05-13T10:00:00Z",
  "source": "ai-insight-service",
  "data": {
    "clientId": "C001",
    "alertId": "alert-uuid",
    "severity": "MEDIUM",
    "explanation": "The portfolio is overweight in AAPL due to recent price movement.",
    "suggestedAction": "Review the position and rebalance gradually if needed."
  }
}
```

Required fields:

| Field | Type | Description |
| --- | --- | --- |
| `eventType` | string | Must be `AIInsightGenerated`. |
| `eventId` | string | Unique event identifier. |
| `timestamp` | date-time string | Event creation timestamp. |
| `source` | string | Must be `ai-insight-service`. |
| `data.clientId` | string | Client associated with the insight. |
| `data.alertId` | string | Risk alert linked to the insight. |
| `data.severity` | enum | `LOW`, `MEDIUM`, or `HIGH`. |
| `data.explanation` | string | AI or fallback explanation. |
| `data.suggestedAction` | string | AI or fallback suggested action. |

## Schema Design Notes

- Events include `eventType`, `eventId`, `timestamp`, `source`, and `data` for consistency.
- Event schemas are strict and use `additionalProperties: false`.
- Risk events include `alertId` so AI insights can be traced back to stored alerts.
- AI output is stored in DynamoDB and also represented as an event for observability and extensibility.

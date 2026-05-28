# Submission README

## Design Decisions



### Serverless Microservices

The backend is split into Portfolio, Market Data, Risk, and AI Insight services. Each service is implemented as an AWS Lambda handler and packaged as a Lambda container image. This keeps service responsibilities clear while avoiding ECS, Fargate, and always-running compute.

### Event-Driven Flow

Market updates, risk detection, and AI insight generation are connected with EventBridge and SQS. This prevents the dashboard request from waiting for every downstream step and makes the workflow easier to explain as business events:

- `PriceUpdated`
- `RiskThresholdBreached`
- `AIInsightGenerated`

### Deterministic Risk Before AI

Risk detection is done in code with fixed thresholds and severity rules. AI is used only after a risk alert exists, and only to generate explanation and suggested action text. This makes the core business logic testable and auditable.

### Manual Price Simulation

Price updates are manually triggered from the dashboard or API. This keeps the demo predictable, avoids unnecessary scheduled invocations, and stays free-tier friendly.

### DynamoDB for Demo Data

DynamoDB stores portfolios, market prices, risk alerts, and AI insights. It fits the serverless design, avoids database server management, and works well for the small demo dataset.

### Cost-Safe AWS Choices

The project avoids ECS, Fargate, Bedrock, RDS, NAT Gateway, and always-running paid infrastructure. Lambda, API Gateway, DynamoDB, EventBridge, SQS, ECR, and CloudWatch are used in a low-volume demo configuration.

## Architectural Trade-Offs

| Choice | Benefit | Trade-Off |
| --- | --- | --- |
| Lambda instead of ECS/Fargate | No always-running containers and simpler operations. | Less control over long-running workloads and runtime tuning. |
| Lambda container images | Demonstrates containerization while staying serverless. | Requires Docker locally and ECR repositories in AWS. |
| EventBridge between services | Clean service decoupling and clear event contracts. | Adds asynchronous behavior and eventual consistency. |
| SQS before AI Insight Service | Buffers AI work and supports retries/DLQ. | AI insight may appear slightly after the risk alert. |
| DynamoDB scans for some demo reads | Simple and acceptable for 100 demo portfolios. | Larger datasets would need better indexes and pagination. |
| Manual simulation instead of live market feed | Predictable, safe, and free-tier friendly. | Not a real market data integration. |
| AI fallback output | Demo continues even if API key/rate limit fails. | Fallback text is less dynamic than live AI output. |

## Scaling Strategy

The current system is intentionally scoped for a demo with 100 clients and 20 equities. To scale it further:

- Add DynamoDB GSIs for common query patterns, such as alerts by `clientId`, severity, and timestamp.
- Add pagination for alert and insight APIs.
- Store symbol-to-client exposure mappings so Risk Service can query only portfolios affected by a symbol.
- Use idempotency keys for event processing to prevent duplicate alerts and insights.
- Increase Lambda concurrency quotas and tune function-level concurrency after load testing.
- Use SQS batch failure reporting for more efficient partial retries.
- Add CloudWatch alarms for Lambda errors, API Gateway 5xx responses, SQS queue depth, and DLQ messages.
- Add structured logs and correlation IDs across events.
- Move frontend hosting to S3 and CloudFront for a fully hosted demo.
- Replace simulated market data with a controlled external provider integration if needed.

## AI Prompt Approach

AI is intentionally separated from risk detection. The Risk Service first creates a deterministic alert. The AI Insight Service then receives structured alert context and asks the configured provider to explain the already-detected risk.

The AI prompt requires strict JSON only with these fields:

- `severity`
- `explanation`
- `suggestedAction`
- `disclaimer`

The prompt also instructs the model to:

- avoid financial guarantees
- avoid claiming to provide financial advice
- include a disclaimer
- explain the deterministic risk event rather than inventing new risk logic
- keep the output concise and suitable for a dashboard

If Groq or NVIDIA is unavailable, missing, misconfigured, or rate-limited, the service stores a deterministic fallback insight. This keeps the demo reliable while still showing where AI fits in the architecture.



## Services And Seed Data

### Portfolio Service

The Portfolio Service owns client portfolio read operations. It lists all demo clients, returns one selected client portfolio, and computes allocation breakdown using current market prices. The dashboard uses this service to populate the client selector and allocation table.

### Market Data Service

The Market Data Service simulates price movement for the supported equities. It updates the latest prices in DynamoDB and publishes `PriceUpdated` events to EventBridge. Price simulation is manually triggered so the demo stays predictable and cost-safe.

### Risk Service

The Risk Service consumes `PriceUpdated` events, revalues affected portfolios, applies deterministic risk rules, stores risk alerts, and publishes `RiskThresholdBreached` events. It also exposes alert APIs used by the dashboard.

### AI Insight Service

The AI Insight Service consumes risk breach events through SQS. It calls Groq or NVIDIA to generate a strict JSON explanation and suggested action, stores the result in DynamoDB, and falls back to deterministic text if the provider is unavailable.

### Seed Data

The seed script creates the demo dataset in DynamoDB. It loads 100 unique client portfolios and initial prices for 20 equities:

```text
AAPL, MSFT, AMZN, GOOGL, META, NVDA, TSLA, JPM, BAC, WMT,
PG, KO, PEP, XOM, CVX, UNH, JNJ, V, MA, NFLX
```

Each seeded portfolio has a unique six-stock combination, quantities, model weights, and a day-start value. This gives the dashboard enough variation to show client-specific allocation, alert, and AI insight behavior.
  
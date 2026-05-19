# AI-Driven Real-Time Portfolio Risk Alert System

Cloud-native demo application for a digital wealth management risk alert workflow.

This is not a production trading platform and does not provide financial advice. The goal is to demonstrate an event-driven AWS architecture, deterministic risk logic, AI-assisted explanations, and a working dashboard.

## Architecture

- React + Vite dashboard
- Amazon API Gateway HTTP API
- AWS Lambda services on Node.js 24
- DynamoDB tables for portfolios, prices, alerts, and AI insights
- EventBridge custom event bus
- SQS risk alert queue with DLQ
- Groq or NVIDIA API for AI explanations through environment variables

## Cost Safety

- No ECS, Fargate, Bedrock, RDS, NAT Gateway, or paid always-running infrastructure.
- DynamoDB uses on-demand billing.
- Price simulation is manually triggered.
- EventBridge Scheduler is not enabled in this scaffold.
- AI API calls will be optional with deterministic fallback logic in a later phase.

## Project Layout

```text
portfolio-risk-alert-system/
  backend/
    src/
      shared/
      portfolio-service/
      market-data-service/
      risk-service/
      ai-insight-service/
      seed/
  frontend/
  infrastructure/
  schemas/
```

## Phase 1 Verification

Backend:

```bash
cd backend
npm install
npm run check
npm test
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Infrastructure:

```bash
cd infrastructure
sam validate --lint
sam build
```

SAM requires the AWS SAM CLI to be installed locally. Build artifacts are written to the project-root `.aws-sam` directory through absolute Windows paths in `infrastructure/samconfig.toml`; update those paths if the project folder moves. Later phases will add local invoke events and seeded data.

For full local tool installation, AWS CLI setup, AI provider environment variables, and first deploy guidance, see [docs/setup-installation.md](docs/setup-installation.md).

## Phase 2 Portfolio Data Verification

Backend:

```bash
cd backend
npm.cmd run check
npm.cmd test
```

Infrastructure:

```bash
cd infrastructure
sam validate --lint
sam build
```

After the SAM stack is deployed, seed the demo portfolio data:

```bash
cd backend
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
npm.cmd run seed
```

Expected seed output:

```json
{
  "message": "Seed data loaded",
  "portfolios": 100,
  "marketPrices": 20
}
```

The Portfolio Service APIs now support:

- `GET /portfolios`
- `GET /portfolios/{clientId}`
- `GET /portfolios/{clientId}/allocation`

## Environment Variables

Backend Lambda functions are configured through the SAM template:

- `PORTFOLIOS_TABLE`
- `MARKET_PRICES_TABLE`
- `RISK_ALERTS_TABLE`
- `AI_INSIGHTS_TABLE`
- `EVENT_BUS_NAME`
- `RISK_ALERT_QUEUE_URL`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_MODEL`
- `CORS_ORIGIN`

`AI_API_KEY` is intentionally not hard-coded.

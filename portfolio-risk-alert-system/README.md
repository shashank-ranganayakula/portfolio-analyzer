# AI-Driven Real-Time Portfolio Risk Alert System

Cloud-native demo application for a digital wealth management risk alert workflow.

This is not a production trading platform and does not provide financial advice. The goal is to demonstrate an event-driven AWS architecture, deterministic risk logic, AI-assisted explanations, and a working dashboard.

## Run The Project

Use [docs/run-project.md](docs/run-project.md) for the end-to-end runbook covering local checks, SAM deploy, seed data, dashboard startup, API checks, and cleanup.

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

## Phase 3 Market Data Verification

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

After deploy and seed, trigger a manual price simulation:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -ContentType "application/json" `
  -Body (@{ scenario = "stress" } | ConvertTo-Json)
```

Supported scenarios:

- `mixed`
- `stable`
- `rally`
- `stress`

Expected behavior:

- Updates latest prices in `portfolio-risk-alert-market-prices`
- Publishes one `PriceUpdated` EventBridge event per updated symbol
- Returns updated price records and `publishedEvents`

## Phase 4 Risk Service Verification

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

The Risk Service now handles `PriceUpdated` events from EventBridge:

- Revalues portfolios holding the updated symbol
- Detects allocation drift greater than 5 percentage points
- Detects single stock exposure greater than 20%
- Detects daily portfolio drop greater than 3%
- Stores alerts in `portfolio-risk-alert-risk-alerts`
- Publishes `RiskThresholdBreached` events for downstream AI insight generation

After deploy and seed, trigger a stress scenario and inspect alerts:

```powershell
$env:API_ENDPOINT = "<ApiEndpoint output from sam deploy>"
Invoke-RestMethod `
  -Method Post `
  -Uri "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -ContentType "application/json" `
  -Body (@{ scenario = "stress" } | ConvertTo-Json)

curl.exe "$env:API_ENDPOINT/alerts"
curl.exe "$env:API_ENDPOINT/alerts/C001"
```

## Phase 5 AI Insight Verification

The AI Insight Service consumes `RiskThresholdBreached` events from SQS, generates structured commentary, stores it in DynamoDB, and exposes:

- `GET /insights/{clientId}`

If `AI_API_KEY` is missing or the provider call fails, the service writes a deterministic fallback insight so the demo continues to work.

Deploy with fallback-only mode:

```powershell
cd infrastructure
sam deploy --guided
```

Deploy with Groq:

```powershell
sam deploy `
  --parameter-overrides AIProvider=groq AIModel=llama-3.1-8b-instant AIAPIKey="<your-key>"
```

Deploy with NVIDIA:

```powershell
sam deploy `
  --parameter-overrides AIProvider=nvidia AIModel=meta/llama-3.1-8b-instruct AIAPIKey="<your-key>"
```

After deploy, seed, and price simulation:

```powershell
curl.exe "$env:API_ENDPOINT/insights/C001"
```

Expected insight fields:

- `severity`
- `explanation`
- `suggestedAction`
- `disclaimer`
- `provider`
- `requestedProvider`
- `fallbackReason` when fallback is used

## Phase 6 Dashboard Verification

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

If the backend is deployed, configure the dashboard API endpoint first:

```powershell
cd frontend
"VITE_API_BASE_URL=<ApiEndpoint output from sam deploy>" | Out-File -Encoding utf8 .env.local
npm.cmd run dev -- --host 127.0.0.1
```

The dashboard now supports:

- Portfolio list loading
- Client selection
- Allocation table
- Risk alert summaries
- Client alert details
- AI insight details
- Manual price simulation by scenario

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
- `AI_API_URL`
- `CORS_ORIGIN`

`AI_API_KEY` is intentionally not hard-coded.

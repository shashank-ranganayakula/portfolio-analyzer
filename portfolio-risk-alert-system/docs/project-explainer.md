# AI-Driven Real-Time Portfolio Risk Alert System - Project Explainer

## 1. Project Overview

The AI-Driven Real-Time Portfolio Risk Alert System is a cloud-native, event-driven AWS demo application for a digital wealth management use case.

The application simulates client portfolios, market price changes, deterministic portfolio risk checks, and AI-generated risk commentary. It is designed to demonstrate architecture, correctness of risk logic, meaningful AI integration, and a working operational dashboard.

This is not a production trading platform and not a financial advisory product. It does not execute trades, does not provide guaranteed recommendations, and includes an educational disclaimer in AI-generated output.

## 2. Business Problem

Digital wealth platforms need to monitor many client portfolios as market prices move. A relationship manager or operations user may need to know:

- Which clients have risk threshold breaches.
- Whether a portfolio has drifted away from its model allocation.
- Whether a single stock has become too concentrated.
- Whether a portfolio has dropped sharply during the day.
- How to explain the alert clearly to a non-technical audience.

This project demonstrates that workflow using deterministic rules first and AI only for explanation.

## 3. Final Architecture

```text
React Dashboard
  -> API Gateway HTTP API
  -> Lambda services
  -> DynamoDB tables

Market Data Service
  -> writes MarketPrices
  -> publishes PriceUpdated events to EventBridge

Risk Service
  -> consumes PriceUpdated events
  -> reads portfolios and prices
  -> detects risk threshold breaches
  -> stores RiskAlerts
  -> publishes RiskThresholdBreached events

EventBridge
  -> routes RiskThresholdBreached events to SQS

AI Insight Service
  -> consumes SQS risk alert messages
  -> calls Groq or NVIDIA if configured
  -> falls back deterministically if needed
  -> stores AIInsights

Dashboard
  -> polls portfolio, allocation, alert, and insight APIs
```

The architecture is intentionally serverless and free-tier friendly. There is no ECS, Fargate, RDS, NAT Gateway, Bedrock, or always-running paid infrastructure.

## 4. Technology Stack

### Frontend: React + Vite

React is used for the dashboard UI. It provides stateful client selection, scenario simulation controls, alert panels, allocation tables, and AI insight display.

Vite is used as the frontend build tool because it is lightweight, fast, and simple for a demo project.

How it is used:

- `frontend/src/App.jsx` contains the dashboard flow.
- `frontend/src/api.js` wraps API Gateway calls.
- `frontend/src/styles.css` provides the professional minimal dashboard styling.
- `.env.local` stores `VITE_API_BASE_URL`, the deployed API Gateway endpoint.

Significance:

- Gives reviewers a working visual dashboard.
- Makes the project demo-friendly.
- Shows how backend event flows surface as user-facing risk operations.

### Backend: Node.js 24 + AWS Lambda

The backend uses Lambda-style handlers written in Node.js 24 with ES modules.

How it is used:

- Portfolio Service handlers expose portfolio and allocation APIs.
- Market Data Service handler simulates prices.
- Risk Service handler evaluates risk events.
- AI Insight Service handler consumes SQS and generates explanations.

Significance:

- Lambda keeps the project serverless and cost-safe.
- Separate handlers demonstrate microservice boundaries.
- Node.js keeps implementation readable and fast to iterate.

### AWS SAM

AWS SAM defines the serverless infrastructure in `infrastructure/template.yaml`.

How it is used:

- Defines Lambda functions.
- Defines API Gateway HTTP API routes.
- Defines DynamoDB tables.
- Defines EventBridge bus and rules.
- Defines SQS queue and DLQ.
- Defines IAM permissions through SAM policy templates and explicit statements.

Significance:

- Infrastructure is reproducible.
- Deployment is one command after configuration.
- The architecture is visible and reviewable as code.

### DynamoDB

DynamoDB stores all demo data.

Tables:

- `Portfolios`: one item per client portfolio.
- `MarketPrices`: latest price per equity symbol.
- `RiskAlerts`: stored deterministic risk alerts.
- `AIInsights`: AI or fallback commentary for alerts.

Significance:

- Serverless and free-tier friendly.
- No RDS or always-running database.
- Good fit for simple key-value demo data.

### EventBridge

EventBridge is the central event bus.

Events:

- `PriceUpdated`
- `RiskThresholdBreached`
- `AIInsightGenerated`

Significance:

- Decouples services.
- Demonstrates event-driven architecture.
- Allows market simulation, risk detection, and AI commentary to evolve independently.

### SQS + DLQ

SQS buffers risk breach events before AI generation.

How it is used:

- EventBridge sends `RiskThresholdBreached` events to `RiskAlertQueue`.
- AI Insight Lambda consumes the queue.
- DLQ captures messages that repeatedly fail.

Significance:

- Protects AI generation from burst traffic.
- Allows retries when Groq/NVIDIA rate limits.
- Keeps deterministic risk detection separate from slower AI work.

### Groq or NVIDIA AI API

AI is used only for explanatory commentary, not for risk detection.

How it is used:

- The AI Insight Service sends alert details to an OpenAI-compatible chat completions endpoint.
- Provider is configured through environment variables.
- Groq default endpoint:
  `https://api.groq.com/openai/v1/chat/completions`
- Default Groq model:
  `llama-3.1-8b-instant`

Significance:

- Demonstrates meaningful AI integration.
- Keeps deterministic logic authoritative.
- Supports fallback mode if API key is missing or provider fails.

## 5. Project Structure

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
    test/
    events/
    package.json
  frontend/
    src/
      App.jsx
      api.js
      styles.css
    package.json
  infrastructure/
    template.yaml
    samconfig.toml
  schemas/
  scripts/
  docs/
    setup-installation.md
    run-project.md
    project-explainer.md
  README.md
```

## 6. Data Model

### Portfolio

Each portfolio has:

- `clientId`
- `clientName`
- `dayStartValue`
- `holdings`
- timestamps

Each holding has:

- `symbol`
- `quantity`
- `modelWeight`

The seed data creates 100 portfolios. Each portfolio has a unique six-stock combination from the 20 supported equities.

### Market Price

Each market price has:

- `symbol`
- `price`
- `previousPrice`
- `updatedAt`

### Risk Alert

Each risk alert has:

- `alertId`
- `clientId`
- `riskType`
- `severity`
- `portfolioValue`
- `details`
- `createdAt`

Alert IDs are deterministic by day, client, risk type, and symbol. This prevents duplicate alerts from repeatedly triggering AI calls.

### AI Insight

Each insight has:

- `insightId`
- `alertId`
- `clientId`
- `severity`
- `explanation`
- `suggestedAction`
- `disclaimer`
- `provider`
- `requestedProvider`
- optional `fallbackReason`
- `createdAt`

## 7. Supported Equities

The simulation uses 20 equities:

```text
AAPL, MSFT, AMZN, GOOGL, META, NVDA, TSLA, JPM, BAC, WMT,
PG, KO, PEP, XOM, CVX, UNH, JNJ, V, MA, NFLX
```

## 8. Core Services

### Portfolio Service

Purpose:

- Store and serve client portfolio data.
- Compute allocation breakdowns.

APIs:

- `GET /portfolios`
- `GET /portfolios/{clientId}`
- `GET /portfolios/{clientId}/allocation`

Important logic:

- Reads portfolios from DynamoDB.
- Reads market prices for holdings.
- Calculates holding value, actual weight, and drift.

Why it matters:

- It provides the base data for the dashboard and risk calculations.

### Market Data Service

Purpose:

- Simulate price updates for demo scenarios.
- Update latest market prices.
- Publish `PriceUpdated` events.

API:

- `POST /simulate-prices`

Scenarios:

- `mixed`
- `stable`
- `rally`
- `stress`

Important implementation detail:

- The service publishes `PriceUpdated` events at a controlled pace. This avoids exhausting the demo account's low Lambda concurrency quota.

Why it matters:

- It creates the event that starts the risk workflow.

### Risk Service

Purpose:

- Consume price update events.
- Revalue affected portfolios.
- Detect deterministic risk threshold breaches.
- Store alerts.
- Publish `RiskThresholdBreached` events.

APIs:

- `GET /alerts`
- `GET /alerts/{clientId}`

Risk rules:

- Allocation drift greater than 5 percentage points.
- Single stock exposure greater than 20%.
- Daily portfolio drop greater than 3%.

Severity rules:

- `HIGH`: daily drop greater than 3%, or single stock exposure greater than 30%.
- `MEDIUM`: single stock exposure greater than 20%, or allocation drift greater than 8%.
- `LOW`: allocation drift greater than 5%.

Why it matters:

- This is the correctness core of the project.
- AI does not decide risk. Deterministic rules decide risk.

### AI Insight Service

Purpose:

- Consume risk breach messages from SQS.
- Generate educational explanation and suggested action.
- Store the insight record.
- Publish `AIInsightGenerated`.

API:

- `GET /insights/{clientId}`

AI requirements:

- Strict JSON output.
- Required fields: `severity`, `explanation`, `suggestedAction`, `disclaimer`.
- Must not make financial guarantees.
- Must include disclaimer that this is not financial advice.

Fallback behavior:

- If API key is missing, use deterministic fallback.
- If provider fails with non-rate-limit errors, use deterministic fallback.
- If provider returns persistent `429`, rethrow so SQS retries later.

Why it matters:

- Demonstrates AI integration while preserving deterministic risk logic.

## 9. Event Flow

### PriceUpdated

Published by Market Data Service after price simulation.

Used by Risk Service to identify portfolios that must be revalued.

### RiskThresholdBreached

Published by Risk Service when a new deterministic alert is stored.

Routed by EventBridge to SQS for AI processing.

### AIInsightGenerated

Published by AI Insight Service after an insight is stored.

This event is useful for auditability and future extensions.

## 10. Dashboard Behavior

The dashboard is an operations-style interface.

Current capabilities:

- Select a client.
- View selected client's portfolio value.
- View selected client's holdings and allocation drift.
- View selected client's alerts.
- View a consolidated AI insight for the selected client.
- Trigger manual price simulation.

Important UX decisions:

- The API endpoint is hidden from the UI.
- Metrics are scoped to the selected client.
- AI insights are filtered to the selected client.
- Multiple insights for the same client are consolidated into one visible summary.
- The UI retries transient `502`, `503`, and `504` responses.

## 11. Cost Safety

The project avoids:

- ECS
- Fargate
- Bedrock
- RDS
- NAT Gateway
- Always-running infrastructure
- Automatic high-frequency schedulers

Cost-safe choices:

- Lambda runs only on requests/events.
- DynamoDB uses on-demand billing.
- EventBridge and SQS are event-driven.
- Price simulation is manually triggered.
- AI provider calls are throttled and retried carefully.
- Deterministic fallback prevents the demo from depending entirely on paid/limited AI APIs.

## 12. Important Runtime Fixes

### Windows SAM Build Fix

Problem:

- `sam build` on Windows hit path-length/artifact-copy issues.

Fix:

- `samconfig.toml` was configured so build/cache artifacts go to a project-root `.aws-sam` path instead of deeply nested infrastructure paths.

### Groq 404 Fix

Problem:

- AI provider requests failed with `404`.

Cause:

- Incorrect `AI_API_URL`.

Fix:

- Use `https://api.groq.com/openai/v1/chat/completions`.

### Groq 429 Fix

Problem:

- Groq returned rate-limit errors.

Fix:

- Added AI throttling and retries.
- AI Lambda uses SQS batch size 1 and event-source maximum concurrency 2.
- Persistent 429 errors are retried through SQS.
- Duplicate alerts are skipped before AI generation.

### Lambda Concurrency 503 Fix

Problem:

- Dashboard sometimes showed API unavailable or HTTP 503 after simulation.

Cause:

- The AWS account Lambda concurrency quota was 10.
- Market simulation triggered many backend functions at once.

Fix:

- Market Data Service publishes price events one at a time with a short delay.
- Dashboard API calls are sequential.
- Dashboard retries transient gateway errors.
- Polling interval was reduced to 30 seconds.

## 13. Testing and Verification

Backend checks:

```powershell
cd backend
npm.cmd run check
npm.cmd test
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

SAM validation/build:

```powershell
cd infrastructure
sam validate --lint
sam build
```

Seed data:

```powershell
cd backend
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
npm.cmd run seed
```

Diagnostics:

```powershell
.\scripts\diagnose-ai-insights.ps1
```

The AI insight diagnostic script confirms:

- Lambda provider configuration.
- Whether API key is set.
- Whether latest insights are `groq`, `nvidia`, or `fallback`.
- Recent fallback reasons.

## 14. What Has Been Completed

Completed:

- Full project structure.
- AWS SAM infrastructure.
- Portfolio data model and APIs.
- Deterministic seed data for 100 unique portfolios and 20 equities.
- Market price simulation.
- EventBridge custom bus and event publishing.
- Deterministic risk engine.
- Risk alert persistence.
- SQS + DLQ for AI work.
- AI insight generation with Groq/NVIDIA support.
- Deterministic fallback insights.
- Dashboard integration.
- Client-scoped alert and insight display.
- Consolidated AI insight display.
- Professional minimal UI refresh.
- Windows SAM build fixes.
- Groq diagnostics and rate-limit handling.
- Runtime concurrency mitigation.

## 15. What Is Pending

Pending or not implemented:

- Authentication and authorization.
- Real market data integration.
- Production-grade portfolio ingestion.
- Full observability dashboards.
- Fine-grained DynamoDB indexes.
- Historical time-series charting.
- User roles and access control.
- CI/CD pipeline.
- Automated end-to-end browser tests.
- Alert acknowledgement workflow.
- Notification delivery through email, SMS, or Slack.
- Production security hardening.
- Multi-environment deployment strategy.

These are intentionally out of scope for the demo.

## 16. How To Explain The Project In A Demo

Suggested demo story:

1. Start with the business problem:
   Wealth managers need to monitor client portfolios as prices move.

2. Explain the architecture:
   The dashboard calls API Gateway. Lambda services handle portfolios, market data, risk, and AI insights. EventBridge and SQS decouple the workflow.

3. Explain deterministic risk:
   The system first calculates portfolio values and risk breaches using explicit rules. AI is not used to decide risk.

4. Trigger simulation:
   Use the dashboard to run `stress` or another scenario.

5. Show alerts:
   The selected client may show allocation drift, concentration, or daily drop alerts.

6. Show AI insight:
   The dashboard displays one consolidated selected-client insight with explanation, suggested action, and disclaimer.

7. Explain cost safety:
   The project uses Lambda, DynamoDB, EventBridge, and SQS. There is no NAT Gateway, ECS, RDS, or always-running paid service.

8. Explain fallback:
   If Groq/NVIDIA is unavailable, the demo still works through deterministic fallback commentary.

## 17. Technical Talking Points

Key points to emphasize:

- Event-driven architecture reduces coupling.
- Deterministic risk logic ensures correctness and explainability.
- AI is scoped to natural-language explanation.
- SQS protects the system from provider rate limits.
- DynamoDB supports simple serverless persistence.
- AWS SAM makes infrastructure repeatable.
- React dashboard turns backend workflows into a tangible demo.
- Cost safety was a design requirement, not an afterthought.

## 18. Improvement Roadmap

Short-term improvements:

- Add a "last simulation result" panel.
- Add filter controls for severity and risk type.
- Add a "clear demo data" script.
- Add end-to-end Playwright tests.
- Add a small chart for portfolio value and drift.

Medium-term improvements:

- Add DynamoDB GSIs for client-based alert and insight queries.
- Add alert acknowledgement and status workflow.
- Add CloudWatch dashboard widgets.
- Add structured access logs for API Gateway.
- Add CI pipeline for test/build/SAM validate.

Long-term improvements:

- Integrate real market data safely.
- Add authentication through Cognito.
- Add multi-tenant isolation.
- Add notification channels.
- Add richer AI prompt evaluation tests.
- Add blue/green or multi-environment deployments.

## 19. Limitations

Current limitations:

- Market prices are simulated.
- Portfolio data is seeded, not ingested from a real system.
- DynamoDB scans are acceptable for 100 demo clients but not for large production datasets.
- AI responses depend on external provider availability and rate limits.
- The dashboard is for demo operations, not a production advisor workstation.
- No authentication is currently implemented.

## 20. Final Summary

This project demonstrates a complete serverless risk-alert workflow:

- React dashboard for operations.
- API Gateway for HTTP access.
- Lambda microservices for backend logic.
- DynamoDB for persistence.
- EventBridge for event-driven decoupling.
- SQS for reliable AI processing.
- Groq/NVIDIA for AI explanations.
- Deterministic fallback for demo resilience.

The most important design principle is separation of responsibility:

- Deterministic code detects risk.
- Events move facts between services.
- AI explains the alert.
- The dashboard presents a clean client-specific view.

## 21. Command Reference

This section lists the main commands used during setup, development, deployment, debugging, and verification, plus why each command was used.

### Tool Version Checks

```powershell
node --version
```

Why used:

- Confirms Node.js is installed.
- Confirms the local runtime matches the project runtime expectation.

```powershell
npm --version
```

Why used:

- Confirms npm is installed for backend and frontend package scripts.

```powershell
git --version
```

Why used:

- Confirms Git is available for source control and repository inspection.

```powershell
aws --version
```

Why used:

- Confirms AWS CLI v2 is installed for AWS identity checks, deployment diagnostics, DynamoDB scans, CloudWatch metrics, and stack inspection.

```powershell
sam --version
```

Why used:

- Confirms AWS SAM CLI is installed for serverless validation, build, and deployment.

### AWS Identity and Profile Checks

```powershell
aws sts get-caller-identity --profile portfolio-risk-demo
```

Why used:

- Verifies that the AWS CLI profile works.
- Confirms the active AWS account and IAM user before deployment.
- Prevents accidental deployment to the wrong account.

```powershell
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
```

Why used:

- Sets the AWS profile and region for the current PowerShell session.
- Avoids repeating `--profile` and `--region` on every command.

### Backend Dependency and Verification Commands

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\backend"
npm.cmd install
```

Why used:

- Installs backend dependencies, including AWS SDK v3 packages.

```powershell
npm.cmd run check
```

Why used:

- Runs Node.js syntax checks across backend source files.
- Catches JavaScript syntax errors before tests, SAM build, or deployment.

```powershell
npm.cmd test
```

Why used:

- Runs backend unit tests.
- Verifies allocation logic, market simulation parsing, risk detection, AI fallback/retry behavior, event envelopes, and seed data consistency.

```powershell
npm.cmd test -- --test-name-pattern seed
```

Why used:

- Runs only seed-related tests.
- Used when validating that all 100 seeded portfolios have unique stock mixes.

### Frontend Dependency and Verification Commands

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\frontend"
npm.cmd install
```

Why used:

- Installs React/Vite frontend dependencies.

```powershell
npm.cmd run build
```

Why used:

- Builds the React app for production.
- Confirms JSX, imports, and CSS compile correctly.
- Used after every frontend change.

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Why used:

- Starts the local Vite development server.
- Makes the dashboard available at `http://127.0.0.1:5173`.

### Frontend API Configuration

```powershell
"VITE_API_BASE_URL=<ApiEndpoint output from sam deploy>" | Out-File -Encoding utf8 .env.local
```

Why used:

- Creates or updates the frontend environment file.
- Points the React dashboard to the deployed API Gateway endpoint.

Example `.env.local`:

```text
VITE_API_BASE_URL=https://n1mf9xky84.execute-api.us-east-1.amazonaws.com
```

Why used:

- Vite exposes variables prefixed with `VITE_` to the frontend.
- The dashboard reads this value in `frontend/src/api.js`.

### SAM Validation, Build, and Deploy

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\infrastructure"
sam validate --lint
```

Why used:

- Validates the SAM/CloudFormation template.
- Catches infrastructure syntax and linting problems before deployment.

```powershell
sam build
```

Why used:

- Builds Lambda deployment artifacts.
- Installs production dependencies into the SAM build output.
- Confirms the backend can be packaged for deployment.

```powershell
sam deploy --guided
```

Why used:

- Performs first-time guided deployment.
- Saves deploy settings into `samconfig.toml`.
- Creates or updates the CloudFormation stack.

```powershell
sam deploy `
  --parameter-overrides AIProvider=groq AIModel=llama-3.1-8b-instant AIAPIKey="<your-groq-key>" AIAPIUrl=https://api.groq.com/openai/v1/chat/completions AIThrottleMs=2500 AIMaxRetries=2
```

Why used:

- Deploys the stack with Groq enabled.
- Sets AI provider, model, API key, endpoint, throttle, and retry behavior.
- Keeps the key out of source code.

```powershell
sam deploy `
  --parameter-overrides AIProvider=nvidia AIModel=meta/llama-3.1-8b-instruct AIAPIKey="<your-nvidia-key>" AIThrottleMs=2500 AIMaxRetries=2
```

Why used:

- Deploys the stack with NVIDIA API configuration instead of Groq.

### DynamoDB Seed Commands

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\backend"
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
npm.cmd run seed
```

Why used:

- Loads 100 demo portfolios into DynamoDB.
- Loads 20 market price records into DynamoDB.
- Must be rerun after changing seed data, such as when unique portfolio stock mixes were added.

Expected output:

```json
{
  "message": "Seed data loaded",
  "portfolios": 100,
  "marketPrices": 20
}
```

### Manual API Test Commands

```powershell
$env:API_ENDPOINT = "<ApiEndpoint output from sam deploy>"
```

Why used:

- Stores the API Gateway endpoint for manual API calls.

```powershell
curl.exe "$env:API_ENDPOINT/portfolios"
```

Why used:

- Tests portfolio list API.

```powershell
curl.exe "$env:API_ENDPOINT/portfolios/C001"
```

Why used:

- Tests individual portfolio lookup.

```powershell
curl.exe "$env:API_ENDPOINT/portfolios/C001/allocation"
```

Why used:

- Tests allocation calculation API for one client.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -ContentType "application/json" `
  -Body (@{ scenario = "stress" } | ConvertTo-Json)
```

Why used:

- Triggers manual market price simulation.
- Starts the end-to-end event flow from price update to risk alert to AI insight.
- Preferred in PowerShell because it handles JSON quoting cleanly.

```powershell
curl.exe -X POST "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -H "content-type: application/json" `
  --data-raw '{"scenario":"stress"}'
```

Why used:

- Alternative manual test for `POST /simulate-prices`.
- Used after fixing PowerShell/curl JSON quoting issues.

```powershell
curl.exe "$env:API_ENDPOINT/alerts"
```

Why used:

- Tests global risk alert API.

```powershell
curl.exe "$env:API_ENDPOINT/alerts/C001"
```

Why used:

- Tests selected-client alert API.

```powershell
curl.exe "$env:API_ENDPOINT/insights/C001"
```

Why used:

- Tests selected-client AI insight API.

### AI Insight Diagnostic Commands

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project"
.\portfolio-risk-alert-system\scripts\diagnose-ai-insights.ps1
```

Why used:

- Checks AWS identity.
- Finds the deployed AI Insight Lambda.
- Prints non-secret AI configuration.
- Shows latest insight records sorted by `createdAt`.
- Helps determine whether insights are `groq`, `nvidia`, or `fallback`.

```powershell
.\portfolio-risk-alert-system\scripts\diagnose-ai-insights.ps1 -MaxItems 5
```

Why used:

- Shows only the five newest insight records.
- Useful when old fallback records are still present in DynamoDB.

### CloudFormation Diagnostic Commands

```powershell
aws cloudformation describe-stack-events `
  --stack-name portfolio-risk-alert-system `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Diagnoses failed deployments.
- Used to identify the `ReservedConcurrentExecutions` deployment failure.

```powershell
aws cloudformation list-stack-resources `
  --stack-name portfolio-risk-alert-system `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Lists physical resource names created by the stack.
- Used to find Lambda function names, SQS queue URLs, and API IDs for diagnostics.

```powershell
aws cloudformation describe-stacks `
  --stack-name portfolio-risk-alert-system `
  --profile portfolio-risk-demo `
  --region us-east-1 `
  --query "Stacks[0].Outputs"
```

Why used:

- Retrieves stack outputs such as `ApiEndpoint`.

### Lambda Diagnostic Commands

```powershell
aws lambda get-function-configuration `
  --function-name <AIInsightFunction physical name> `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Checks Lambda runtime, timeout, and environment variables.
- Used to verify `AI_PROVIDER`, `AI_MODEL`, `AI_API_URL`, `AI_THROTTLE_MS`, and `AI_MAX_RETRIES`.

```powershell
aws lambda list-event-source-mappings `
  --function-name <AIInsightFunction physical name> `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Verifies SQS event source settings.
- Confirms `BatchSize = 1` and `MaximumConcurrency = 2`.

```powershell
aws lambda get-account-settings `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Checks account-level Lambda concurrency.
- Used to diagnose dashboard `503` errors when account concurrency reached 10.

### SQS Diagnostic Commands

```powershell
aws sqs get-queue-attributes `
  --queue-url <RiskAlertQueue URL> `
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible ApproximateNumberOfMessagesDelayed `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Checks visible, in-flight, and delayed AI queue messages.
- Used to determine whether AI processing was currently active or idle.

### CloudWatch Metric Commands

```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Invocations `
  --dimensions Name=FunctionName,Value=<function-name> `
  --start-time <start-time> `
  --end-time <end-time> `
  --period 60 `
  --statistics Sum `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Counts Lambda invocations over time.
- Used to estimate AI call volume.

```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Errors `
  --dimensions Name=FunctionName,Value=<function-name> `
  --start-time <start-time> `
  --end-time <end-time> `
  --period 60 `
  --statistics Sum `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Checks Lambda errors.
- Used to determine whether API issues came from handler failures.

```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name ConcurrentExecutions `
  --start-time <start-time> `
  --end-time <end-time> `
  --period 60 `
  --statistics Maximum `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Checks account-level concurrency usage.
- Used to prove that API Gateway `503` errors aligned with Lambda concurrency reaching the account limit.

```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/ApiGateway `
  --metric-name 5xx `
  --dimensions Name=ApiId,Value=<api-id> `
  --start-time <start-time> `
  --end-time <end-time> `
  --period 60 `
  --statistics Sum `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Checks API Gateway server-side errors.
- Used to correlate dashboard `503` reports with backend concurrency pressure.

### CloudWatch Logs Commands

```powershell
aws logs tail /aws/lambda/<function-name> `
  --since 30m `
  --profile portfolio-risk-demo `
  --region us-east-1 `
  --format short
```

Why used:

- Reads recent Lambda logs.
- Used to confirm Market Data simulations completed successfully.
- Used to confirm AI insights were stored with provider `groq`.

### DynamoDB Diagnostic Commands

```powershell
aws dynamodb scan `
  --table-name portfolio-risk-alert-ai-insights `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Reads AI insight records for diagnostics.
- Used to inspect provider, fallback reason, and creation timestamps.

```powershell
aws dynamodb scan `
  --table-name portfolio-risk-alert-risk-alerts `
  --profile portfolio-risk-demo `
  --region us-east-1
```

Why used:

- Reads risk alert records for diagnostics.
- Used to verify AI insight `clientId` values matched source alert `clientId` values.

### Cleanup Command

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\infrastructure"
sam delete
```

Why used:

- Deletes the deployed CloudFormation stack.
- Cleans up AWS resources when the demo is finished.
- Helps avoid ongoing accidental cost.

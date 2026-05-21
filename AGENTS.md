# AI-Driven Real-Time Portfolio Risk Alert System

## Project Memory

This file tracks implementation progress, assumptions, and verification notes across phases.

## Constraints

- Demo/submission project only; not a production trading or advisory product.
- Keep the architecture AWS free-tier friendly.
- Use Lambda, API Gateway HTTP API, DynamoDB, EventBridge, SQS, and CloudWatch.
- Do not use ECS, Fargate, Bedrock, RDS, NAT Gateway, or paid always-running infrastructure.
- Price simulation is manually triggered for the demo.
- EventBridge Scheduler remains disabled/commented out by default if added later.
- AI insight generation uses Groq or NVIDIA via environment variables.
- AI failures must fall back to deterministic template output in a later phase.

## Phase Log

### Phase 1 - Project Setup

Status: Complete and verified

Scope:
- Create initial full-stack repository structure.
- Add backend Node.js 20 Lambda-style placeholder handlers.
- Add shared AWS SDK v3 utilities.
- Add AWS SAM infrastructure skeleton.
- Add React + Vite frontend shell.
- Add event schemas and README.

Verification:
- File layout verified with PowerShell.
- JSON package/schema files parsed successfully with `ConvertFrom-Json`.
- SAM template scanned for banned paid services; none found.
- User confirmed local toolchain installation.
- User confirmed `sam validate --lint` passes.
- User confirmed `sam build` succeeds and writes artifacts to `../.aws-sam/build`.

Next required local verification when tooling is installed:
- Backend: `cd portfolio-risk-alert-system/backend && npm install && npm run check && npm test`
- Frontend: `cd portfolio-risk-alert-system/frontend && npm install && npm run build`
- Infrastructure: `cd portfolio-risk-alert-system/infrastructure && sam validate --lint && sam build`

### Setup Documentation

Added `portfolio-risk-alert-system/docs/setup-installation.md` with Windows tool installation, AWS CLI profile setup, IAM permission guidance, AI provider environment variables, SAM validation/build/deploy commands, frontend API configuration, and cost-safety checks.

### Windows SAM Build Fix

Observed `sam build` path-length risk on Windows:
- Default `infrastructure/.aws-sam/build/...` artifact paths reached 263 characters inside AWS SDK dependency files.
- No symlinks/reparse points were found under backend dependencies.
- SAM skips npm tests during build unless `SAM_NPM_RUN_TEST_WITH_BUILD=true` is set.
- Validated that `sam build --build-dir ../.aws-sam/build --cache-dir ../.aws-sam/cache` succeeds.

Added `infrastructure/samconfig.toml` so `sam build` from the infrastructure directory uses absolute project-root `.aws-sam` build/cache paths by default. Relative `../.aws-sam` paths fixed the first build but failed on repeat cleanup; absolute paths were validated twice.

Added `.gitignore` entries for generated dependency/build artifacts.

### Local Toolchain Confirmation

User confirmed setup on Windows/PowerShell:
- Node.js: `v24.15.0`
- npm: `11.12.1`
- Git: `2.54.0.windows.1`
- AWS CLI: `2.34.47`
- SAM CLI: `1.160.1`

AWS profile confirmed:
- Profile: `portfolio-risk-demo`
- Account: `394281571047`
- Arn: `arn:aws:iam::394281571047:user/shashank-ranganayakula`

### Phase 2 - Portfolio Data Foundation

Status: Complete and verified locally

Scope:
- Implemented Portfolio Service data reads for `GET /portfolios`, `GET /portfolios/{clientId}`, and `GET /portfolios/{clientId}/allocation`.
- Added deterministic seed data for 100 client portfolios and 20 market prices.
- Added DynamoDB seed script: `cd backend && npm.cmd run seed`.
- Added pure allocation calculator with value, actual weight, and drift output.
- Added explicit demo DynamoDB table names for easy seeding.
- Added local Lambda event examples for portfolio and allocation requests.

Verification:
- `npm.cmd run check` passed.
- `npm.cmd test` passed with 5 tests.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.
- Seed data smoke check returned 100 portfolios, 20 prices, first client `C001`, and 6 holdings.
- Follow-up verification requested by user:
  - Backend syntax check passed.
  - Backend tests passed with 5 tests.
  - Frontend `npm.cmd run build` passed.
  - SAM validation passed.
  - SAM build passed.
  - Seed consistency check confirmed 100 portfolios, 20 prices, model weights sum to 1, and all 20 expected symbols are covered.
- Added DynamoDB pagination/retry robustness:
  - Portfolio listing now paginates `Scan` results.
  - Market price `BatchGet` retries `UnprocessedKeys`.
  - Seed `BatchWrite` retries `UnprocessedItems`.

Assumptions:
- Phase 2 is limited to portfolio data and allocation APIs.
- Market price simulation, risk evaluation, alert storage, AI insight generation, and dashboard API wiring remain for later phases.
- Fixed DynamoDB table names are acceptable for this single demo stack.

### Phase 3 - Market Data Simulation

Status: Complete and verified locally

Scope:
- Implemented `POST /simulate-prices`.
- Added deterministic market simulation scenarios: `mixed`, `stable`, `rally`, and `stress`.
- Market Data Service reads current DynamoDB prices, falls back to seeded prices when needed, writes updated prices, and publishes `PriceUpdated` events.
- Added batched EventBridge publishing with failure detection.
- Added local Lambda event example: `backend/events/simulate-prices.json`.
- Added unit tests for request parsing, price simulation, and EventBridge event envelopes.

Verification:
- `npm.cmd run check` passed.
- `npm.cmd test` passed with 9 tests.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.
- `npm.cmd run build` passed for frontend.
- Simulation smoke check for `stress` scenario returned expected AAPL and NVDA price updates.

Assumptions:
- Price simulation is manually triggered only.
- Simulation remains deterministic for demo repeatability.
- Risk Service subscription receives events, but actual risk evaluation remains for Phase 4.

### Phase 4 - Risk Service

Status: Complete and verified locally

Scope:
- Implemented Risk Service handling for `PriceUpdated` EventBridge events.
- Revalues affected portfolios that hold the updated symbol.
- Detects deterministic risk breaches:
  - `ALLOCATION_DRIFT` when absolute drift is greater than 5 percentage points.
  - `SINGLE_STOCK_EXPOSURE` when actual holding weight is greater than 20%.
  - `DAILY_PORTFOLIO_DROP` when current value falls more than 3% below `dayStartValue`.
- Applies severity rules:
  - `HIGH` for daily drop > 3% or single stock exposure > 30%.
  - `MEDIUM` for single stock exposure > 20% or allocation drift > 8%.
  - `LOW` for allocation drift > 5%.
- Stores risk alerts in DynamoDB.
- Publishes `RiskThresholdBreached` events to EventBridge.
- Implemented `GET /alerts` and `GET /alerts/{clientId}` from DynamoDB.
- Added `alertId` to `RiskThresholdBreached` event schema so AI insight records can link back to stored alerts.

Verification:
- `npm.cmd run check` passed.
- `npm.cmd test` passed with 12 tests.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.
- `npm.cmd run build` passed for frontend.
- JSON schema parse check passed for all schemas.
- Risk smoke check produced expected `HIGH` daily drop alert.

Assumptions:
- Scanning portfolios and alerts is acceptable for the 100-client demo scale.
- Risk alerts are generated per processed `PriceUpdated` event; later phases may add idempotency if demo output becomes too noisy.
- AI insight generation remains for Phase 5.

### Phase 5 - AI Insight Service

Status: Complete and verified locally

Scope:
- Implemented SQS consumer for `RiskThresholdBreached` messages.
- Added robust parsing for EventBridge events delivered through SQS.
- Added AI insight generation with Groq or NVIDIA using OpenAI-compatible chat completions.
- Added optional AI provider SAM parameters:
  - `AIProvider`
  - `AIModel`
  - `AIAPIKey`
  - `AIAPIUrl`
- Added deterministic fallback insight generation when API key is missing or provider call fails.
- Stored AI insight records in DynamoDB.
- Published `AIInsightGenerated` events after storing insights.
- Implemented `GET /insights/{clientId}`.
- Added local SQS event example: `backend/events/risk-alert-sqs.json`.

Verification:
- `npm.cmd run check` passed.
- `npm.cmd test` passed with 18 tests.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.
- `npm.cmd run build` passed for frontend.
- JSON schema parse check passed for all schemas.

Assumptions:
- Provider calls use OpenAI-compatible chat completion endpoints.
- `AI_API_URL` remains optional because the code provides defaults for Groq and NVIDIA.
- Deterministic fallback mode is acceptable and expected for demos without an AI key.

### Phase 6 - Dashboard Integration

Status: Complete and verified locally

Scope:
- Replaced placeholder React dashboard with API-driven operational dashboard.
- Added frontend API helper for:
  - `GET /portfolios`
  - `GET /portfolios/{clientId}/allocation`
  - `GET /alerts`
  - `GET /alerts/{clientId}`
  - `GET /insights/{clientId}`
  - `POST /simulate-prices`
- Added client selector, allocation table, risk metrics, alert lists, AI insight panel, and scenario simulation control.
- Added polling refresh every 15 seconds and refresh after simulation.
- Added generated frontend `dist` output to `.gitignore`.

Verification:
- `npm.cmd run build` passed for frontend.
- `npm.cmd run check` passed for backend.
- `npm.cmd test` passed with 18 tests.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.
- Vite dev server started at `http://127.0.0.1:5173`.
- HTTP check against local Vite server returned `200 OK`.

Assumptions:
- Dashboard expects `VITE_API_BASE_URL` to point to the deployed API Gateway endpoint for end-to-end AWS data.
- Browser automation was not callable in the current tool session, so visual verification used Vite build plus HTTP response checks.

### Run Guide

Added `portfolio-risk-alert-system/docs/run-project.md` with the end-to-end runbook:
- Local backend/frontend/infrastructure verification.
- SAM deploy.
- DynamoDB seed.
- Frontend `.env.local` setup.
- Dashboard run command.
- Manual API checks.
- Optional AI provider deploy.
- Cost-safety notes.
- Stack deletion.

### Documentation Fix

Updated PowerShell `curl.exe` examples for `POST /simulate-prices` to use single-quoted JSON and `$($env:API_ENDPOINT.TrimEnd('/'))` so PowerShell does not pass escaped quotes literally and trailing slashes do not break the URL.

Added a tolerant parser for accidentally PowerShell-escaped simulation request bodies and documented `Invoke-RestMethod` as the preferred PowerShell command.

### AI Insight Diagnostics

Added `requestedProvider` and optional `fallbackReason` to stored AI insight records. This clarifies whether fallback happened because `AIAPIKey` was missing or because the configured provider request failed.

Tightened the DynamoDB AI insight diagnostic command to use expression attribute names for projected fields.

Added `scripts/diagnose-ai-insights.ps1` to avoid fragile AWS CLI inline JSON quoting and print AI Lambda environment plus recent insight provider/fallback diagnostics.

Diagnosed AI fallback from user output: deployed Lambda has `AI_API_URL_Set: True` and new fallback records show `AI provider request failed with status 404`, indicating an incorrect Groq endpoint override. Updated diagnostics to print non-secret `AI_API_URL`.

Follow-up diagnostics showed new records using `requestedProvider: groq` with `fallbackReason: AI provider request failed with status 429`, confirming provider rate limiting rather than missing configuration.

Implemented free-tier-safe rate-limit mitigation without switching to Bedrock:
- Added AI throttle/retry configuration (`AI_THROTTLE_MS`, `AI_MAX_RETRIES`) and SAM parameters (`AIThrottleMs`, `AIMaxRetries`).
- AI provider calls retry transient `429` responses and rethrow persistent `429` errors so SQS can retry later instead of immediately storing fallback insight records.
- AI Insight Lambda now uses `BatchSize: 1`, SQS event-source `MaximumConcurrency: 2`, `Timeout: 60`, and the queue visibility timeout is 120 seconds.
- Risk alerts now use deterministic daily alert IDs by client, risk type, and symbol.
- Risk alert writes are conditional and only newly stored alerts publish `RiskThresholdBreached`, sharply reducing duplicate AI calls from repeated price simulations.
- Updated `docs/run-project.md` with Groq endpoint, 429 diagnosis, and rate-limit behavior.

Verification:
- Backend `npm.cmd run check` passed.
- Backend `npm.cmd test` passed with 21 tests.
- Frontend `npm.cmd run build` passed.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.

Decision:
- Do not switch to Bedrock for this issue. Reducing duplicate AI calls and serializing the asynchronous AI commentary path preserves the real-time risk demo while staying aligned with the original free-tier/cost-safety rule.
- Removed `ReservedConcurrentExecutions: 1` after CloudFormation rejected it in the user's account because it would reduce unreserved Lambda concurrency below AWS's minimum of 10.
- The diagnostics script now scans AI insight records and sorts by `createdAt` descending before showing rows, because DynamoDB scan order made old fallback records look like the latest failures.

### Runtime Concurrency Fix

Diagnosed dashboard `503` responses after simulation:
- User's Lambda account concurrency quota is 10.
- API Gateway 5xx spikes aligned with account-level Lambda concurrency reaching 10.
- MarketDataFunction logs showed simulate requests completing successfully, so the visible dashboard error was caused by follow-up dashboard API calls during backend fan-out rather than a broken simulation handler.

Mitigation:
- Market Data Service still updates all 20 equities but publishes `PriceUpdated` events one at a time with a short delay to reduce RiskService concurrency bursts.
- MarketDataFunction timeout increased to 30 seconds.
- Frontend API helper retries transient `502`, `503`, and `504` responses.
- Dashboard refresh now fetches APIs sequentially, polls every 30 seconds instead of 15 seconds, waits briefly after simulation, and displays only the latest 8 insights for the selected client so old fallback records do not dominate the demo panel.

Verification:
- Backend `npm.cmd run check` passed.
- Backend `npm.cmd test` passed with 22 tests.
- Frontend `npm.cmd run build` passed.
- `sam validate --lint` passed.
- `sam build` passed and generated `../.aws-sam/build`.

### Dashboard Insight Display Adjustment

Changed frontend AI Insights panel to display only the newest single insight for the currently selected client. The dashboard now defensively filters insight records by `selectedClientId` and slices to one record before rendering.

Verification:
- Frontend `npm.cmd run build` passed.

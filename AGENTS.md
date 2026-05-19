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

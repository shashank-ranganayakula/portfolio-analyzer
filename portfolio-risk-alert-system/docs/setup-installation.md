# Setup and Installation Guide

This guide prepares a local Windows/PowerShell environment for the AI-Driven Real-Time Portfolio Risk Alert System demo.

The project is intentionally free-tier friendly. The AWS stack creates Lambda, API Gateway HTTP API, DynamoDB, EventBridge, SQS, and CloudWatch Logs resources. It does not require ECS, Fargate, Bedrock, RDS, NAT Gateway, or always-running infrastructure.

## 1. Required Local Tools

Install these tools before running project commands:

| Tool | Required For | Recommended Version |
| --- | --- | --- |
| Node.js + npm | Backend and frontend development | Node.js 24 |
| Git | Source control and status checks | Current stable |
| AWS CLI | AWS credentials and account access | AWS CLI v2 |
| AWS SAM CLI | Local SAM validation/build/deploy | Current stable |
| Docker Desktop | Optional SAM local invoke/build container testing | Current stable |
| VS Code | Editing and terminal workflow | Current stable |

Docker is helpful for `sam local invoke` and container-based builds. It is not an AWS service and does not create paid cloud resources.

## 2. Windows Installation Commands

Open PowerShell as your normal user and run:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Amazon.AWSCLI
winget install Amazon.SAM-CLI
winget install Docker.DockerDesktop
```

Close and reopen PowerShell after installation so PATH updates are loaded.

Verify:

```powershell
node --version
npm --version
git --version
aws --version
sam --version
docker --version
```

Expected:

- `node --version` starts with `v24`.
- `npm`, `git`, `aws`, and `sam` all print versions.
- Docker may require Docker Desktop to be opened once before `docker --version` or SAM local commands work cleanly.

## 3. AWS Account Setup

Use a personal AWS account or sandbox account for this demo.

Recommended region:

```text
us-east-1
```

Any region that supports Lambda Node.js 20, API Gateway HTTP API, DynamoDB, EventBridge, and SQS is fine, but use one region consistently.

## 4. AWS IAM Setup

For the simplest demo workflow, create or use an IAM identity with permissions to deploy this SAM stack.

Required AWS permission areas:

- CloudFormation stack create/update/delete
- IAM role creation for Lambda execution roles
- Lambda create/update/invoke
- API Gateway HTTP API management
- DynamoDB table management
- EventBridge bus/rule/target management
- SQS queue and queue policy management
- CloudWatch Logs management

For a controlled demo account, `AdministratorAccess` is the quickest setup. For a stricter account, use a deployment role that covers the service areas above.

Do not commit AWS access keys or AI provider keys to the repository.

## 5. Configure AWS CLI

Configure an AWS profile:

```powershell
aws configure --profile portfolio-risk-demo
```

Enter:

```text
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: us-east-1
Default output format: json
```

Verify identity:

```powershell
aws sts get-caller-identity --profile portfolio-risk-demo
```

Expected:

- AWS account id
- User or role ARN
- No authentication error

Set the profile for the current terminal session:

```powershell
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
```

## 6. AI Provider Setup

The project supports Groq or NVIDIA through environment variables. AI is used only for explanations and suggested actions. Deterministic risk logic must work without AI.

Choose one provider:

```powershell
$env:AI_PROVIDER = "groq"
$env:AI_API_KEY = "<your-groq-api-key>"
$env:AI_MODEL = "llama-3.1-8b-instant"
$env:AI_API_URL = "https://api.groq.com/openai/v1/chat/completions"
```

or:

```powershell
$env:AI_PROVIDER = "nvidia"
$env:AI_API_KEY = "<your-nvidia-api-key>"
$env:AI_MODEL = "meta/llama-3.1-8b-instruct"
$env:AI_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
```

The key is optional for the demo. If it is blank, missing, or the provider call fails, the AI Insight Service stores deterministic fallback commentary.

## 7. Install Project Dependencies

From the repository root:

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system"
```

Backend:

```powershell
cd backend
npm install
npm run check
npm test
cd ..
```

Frontend:

```powershell
cd frontend
npm install
npm run build
cd ..
```

## 8. SAM Validation and Build

From the project root:

```powershell
cd infrastructure
sam validate --lint
sam build
cd ..
```

Expected:

- `sam validate --lint` reports the template is valid.
- `sam build` creates a project-root `.aws-sam` build directory.

The SAM config keeps build artifacts in the project-root `.aws-sam/build` directory instead of `infrastructure/.aws-sam/build`. It uses absolute Windows paths because SAM CLI cleanup can fail on repeated builds when `..` relative paths are used with nested Node.js dependencies. If you move the project folder, update `infrastructure/samconfig.toml` to the new absolute project path.

If Docker is not running, basic validation should still work, but some local SAM workflows may fail until Docker Desktop is running.

## 9. First SAM Deploy Setup

Only deploy after local checks pass.

From `portfolio-risk-alert-system/infrastructure`:

```powershell
sam deploy --guided
```

Suggested guided deploy answers:

```text
Stack Name: portfolio-risk-alert-system
AWS Region: us-east-1
Confirm changes before deploy: Y
Allow SAM CLI IAM role creation: Y
Disable rollback: N
Save arguments to configuration file: Y
SAM configuration file: samconfig.toml
SAM configuration environment: default
```

The stack creates:

- HTTP API
- Lambda functions
- DynamoDB tables
- EventBridge custom bus
- SQS queue and DLQ
- CloudWatch log groups created automatically by Lambda

After deploy, note the `ApiEndpoint` output. The frontend will use this as `VITE_API_BASE_URL`.

## 10. Frontend API Configuration

For local dashboard development, create this file later if needed:

```text
frontend/.env.local
```

Example:

```text
VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
```

Then run:

```powershell
cd frontend
npm run dev
```

Expected:

- Vite prints a local URL, usually `http://localhost:5173`.
- The dashboard opens and points at the configured API endpoint.

## 11. Seed Portfolio Data

After the stack is deployed, load deterministic demo data into DynamoDB:

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\backend"
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
npm.cmd run seed
```

Expected:

```json
{
  "message": "Seed data loaded",
  "portfolios": 100,
  "marketPrices": 20
}
```

The seed script writes:

- 100 client portfolios to `portfolio-risk-alert-portfolios`
- 20 market price records to `portfolio-risk-alert-market-prices`

Use `npm.cmd` on PowerShell if `npm.ps1` is blocked by execution policy.

## 12. Trigger Manual Price Simulation

After the stack is deployed and the seed data is loaded, call the market data simulation endpoint:

```powershell
$env:API_ENDPOINT = "<ApiEndpoint output from sam deploy>"
Invoke-RestMethod `
  -Method Post `
  -Uri "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -ContentType "application/json" `
  -Body (@{ scenario = "stress" } | ConvertTo-Json)
```

PowerShell note: `Invoke-RestMethod` avoids JSON quoting issues. If you use `curl.exe`, wrap JSON in single quotes: `'{"scenario":"stress"}'`.

Available scenarios:

- `mixed`
- `stable`
- `rally`
- `stress`

Expected:

- 20 market prices are updated by default.
- One `PriceUpdated` event is published per updated symbol.
- The response includes `scenario`, `updatedPrices`, `publishedEvents`, and `prices`.

## 13. Inspect Risk Alerts

After price simulation runs, the Risk Service evaluates affected portfolios and stores deterministic alerts.

```powershell
curl.exe "$env:API_ENDPOINT/alerts"
curl.exe "$env:API_ENDPOINT/alerts/C001"
```

Expected:

- `/alerts` returns `count` and an `alerts` array.
- `/alerts/C001` returns alerts only for client `C001`.
- Alert records include `alertId`, `clientId`, `riskType`, `severity`, `portfolioValue`, `details`, and `createdAt`.

## 14. Inspect AI Insights

Risk alerts are routed through SQS to the AI Insight Service. The service stores AI-generated or fallback commentary in DynamoDB.

```powershell
curl.exe "$env:API_ENDPOINT/insights/C001"
```

Expected:

- `/insights/C001` returns `count` and an `insights` array.
- Insight records include `insightId`, `alertId`, `clientId`, `severity`, `explanation`, `suggestedAction`, `disclaimer`, `provider`, and `createdAt`.
- `provider` is `fallback` when no AI key is configured or an AI provider call fails.
- Fallback records may include `fallbackReason` and `requestedProvider` for troubleshooting.

## 15. Run The Dashboard

Configure the API endpoint returned by `sam deploy`:

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\frontend"
"VITE_API_BASE_URL=<ApiEndpoint output from sam deploy>" | Out-File -Encoding utf8 .env.local
npm.cmd run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

Expected:

- Portfolio count loads from `/portfolios`.
- Client selector lists seeded clients.
- Allocation table loads from `/portfolios/{clientId}/allocation`.
- Risk alerts load from `/alerts` and `/alerts/{clientId}`.
- AI insights load from `/insights/{clientId}`.
- The simulation button calls `POST /simulate-prices`.

## 16. Cost Safety Checklist

Before deploy, confirm:

- No NAT Gateway in the SAM template.
- No ECS or Fargate.
- No Bedrock.
- No RDS.
- DynamoDB uses `PAY_PER_REQUEST`.
- Price simulation is manually triggered with `POST /simulate-prices`.
- No EventBridge Scheduler is enabled by default.
- CloudWatch logging stays basic.

After a demo, delete the stack if you no longer need it:

```powershell
cd infrastructure
sam delete
```

## 17. Useful Verification Commands

Check current AWS caller:

```powershell
aws sts get-caller-identity
```

List deployed stacks:

```powershell
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

Check DynamoDB tables:

```powershell
aws dynamodb list-tables
```

Check SQS queues:

```powershell
aws sqs list-queues
```

Check EventBridge buses:

```powershell
aws events list-event-buses
```

Check insight records:

```powershell
aws dynamodb scan --table-name portfolio-risk-alert-ai-insights --max-items 5
```

## 18. What To Tell Codex After Setup

After installing tools, send the command output for:

```powershell
node --version
npm --version
git --version
aws --version
sam --version
aws sts get-caller-identity --profile portfolio-risk-demo
```

Then ask Codex to continue with the next phase or to run Phase 1 verification.

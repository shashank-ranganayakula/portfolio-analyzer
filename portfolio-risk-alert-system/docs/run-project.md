# Run Project Guide

This guide explains how to run the AI-Driven Real-Time Portfolio Risk Alert System end to end.

## 1. Prerequisites

Complete the setup guide first:

```text
docs/setup-installation.md
```

Required tools:

- Node.js 24
- npm
- AWS CLI v2
- AWS SAM CLI
- AWS profile: `portfolio-risk-demo`

Verify:

```powershell
node --version
npm --version
aws sts get-caller-identity --profile portfolio-risk-demo
sam --version
```

## 2. Verify Local Code

From the project root:

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system"
```

Backend:

```powershell
cd backend
npm.cmd install
npm.cmd run check
npm.cmd test
cd ..
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
cd ..
```

Infrastructure:

```powershell
cd infrastructure
sam validate --lint
sam build
cd ..
```

Expected:

- Backend syntax check passes.
- Backend tests pass.
- Frontend build succeeds.
- SAM validates and builds successfully.

## 3. Deploy AWS Backend

From the infrastructure directory:

```powershell
cd infrastructure
$env:AWS_PROFILE = "portfolio-risk-demo"
$env:AWS_REGION = "us-east-1"
sam deploy --guided
```

Recommended guided values:

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

AI key is optional. Leave it blank for deterministic fallback insights.

After deploy, copy the `ApiEndpoint` output.

## 4. Seed DynamoDB Data

From the backend directory:

```powershell
cd ..\backend
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

## 5. Configure Frontend

Create or update:

```text
frontend/.env.local
```

Content:

```text
VITE_API_BASE_URL=<ApiEndpoint output from sam deploy>
```

Example:

```text
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com
```

## 6. Run Dashboard

From the frontend directory:

```powershell
cd ..\frontend
npm.cmd run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

Expected:

- Client count loads.
- Client selector lists seeded clients.
- Allocation table loads for the selected client.
- Alerts and insights sections load.
- API target in the footer matches your API Gateway endpoint.

## 7. Run Demo Flow

Use the dashboard:

1. Select client `C001`.
2. Choose scenario `stress`.
3. Click `Simulate Prices`.
4. Wait for alerts to appear.
5. Wait for AI insights to appear.

The dashboard polls every 15 seconds. You can also refresh the browser.

## 8. Manual API Checks

Set the API endpoint:

```powershell
$env:API_ENDPOINT = "<ApiEndpoint output from sam deploy>"
```

Check portfolios:

```powershell
curl.exe "$env:API_ENDPOINT/portfolios"
curl.exe "$env:API_ENDPOINT/portfolios/C001"
curl.exe "$env:API_ENDPOINT/portfolios/C001/allocation"
```

Trigger price simulation:

Preferred PowerShell command:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -ContentType "application/json" `
  -Body (@{ scenario = "stress" } | ConvertTo-Json)
```

`curl.exe` version:

```powershell
curl.exe -X POST "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" `
  -H "content-type: application/json" `
  --data-raw '{"scenario":"stress"}'
```

PowerShell note: keep the backtick as the final character on each continued line. If quoting gets awkward, use the one-line version:

```powershell
curl.exe -X POST "$($env:API_ENDPOINT.TrimEnd('/'))/simulate-prices" -H "content-type: application/json" --data-raw '{"scenario":"stress"}'
```

Check alerts:

```powershell
curl.exe "$env:API_ENDPOINT/alerts"
curl.exe "$env:API_ENDPOINT/alerts/C001"
```

Check AI insights:

```powershell
curl.exe "$env:API_ENDPOINT/insights/C001"
```

If every insight has `"provider":"fallback"`, the deployed Lambda is not successfully using Groq/NVIDIA. Check:

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system"
.\scripts\diagnose-ai-insights.ps1
```

Common causes:

- `fallbackReason` is `missing-api-key`: redeploy with `AIAPIKey`.
- `fallbackReason` contains an HTTP status: verify the key, model, provider, and optional `AIAPIUrl`.
- `fallbackReason` contains status `404` and `AI_API_URL_Set` is true: redeploy with `AIAPIUrl=https://api.groq.com/openai/v1/chat/completions` or clear the override.
- `fallbackReason` contains status `429`: the provider rate limit was hit. Redeploy the latest template so AI calls run one at a time with retry/backoff, then trigger a new simulation.
- Existing old records remain fallback; trigger a new simulation after redeploy to create new provider-backed insights.

Rate-limit behavior:

- Risk detection and alert storage remain immediate.
- AI commentary is asynchronous through SQS and may arrive more slowly.
- The AI Lambda reads one SQS message per invocation and caps SQS-triggered concurrency at 2 to stay friendly to free-tier provider limits without using reserved Lambda concurrency.
- Repeated alerts for the same day, client, risk type, and symbol are skipped before they reach the AI queue.
- If Groq/NVIDIA still returns `429` after retries, the message is retried by SQS instead of immediately storing a fallback record.
- The demo AWS account currently has a Lambda concurrency quota of 10. To avoid API Gateway `503` responses during simulations, price update events are published at a controlled pace and the dashboard retries transient `502`/`503`/`504` responses.
- Old fallback insight records remain in DynamoDB history. The dashboard shows the newest insights first and limits the panel to the latest records for the selected client.

## 9. Optional AI Provider Deploy

Fallback mode works without an AI key.

To deploy with Groq:

```powershell
cd ..\infrastructure
sam deploy `
  --parameter-overrides AIProvider=groq AIModel=llama-3.1-8b-instant AIAPIKey="<your-groq-key>" AIAPIUrl=https://api.groq.com/openai/v1/chat/completions AIThrottleMs=2500 AIMaxRetries=2
```

To deploy with NVIDIA:

```powershell
cd ..\infrastructure
sam deploy `
  --parameter-overrides AIProvider=nvidia AIModel=meta/llama-3.1-8b-instruct AIAPIKey="<your-nvidia-key>" AIThrottleMs=2500 AIMaxRetries=2
```

## 10. Cost Safety

The stack uses:

- Lambda
- API Gateway HTTP API
- DynamoDB on-demand tables
- EventBridge custom bus
- SQS queue and DLQ
- CloudWatch logs

The stack does not use:

- ECS
- Fargate
- Bedrock
- RDS
- NAT Gateway
- EventBridge Scheduler

Price simulation is manually triggered only.

Bedrock note: this demo keeps AI explanations on Groq/NVIDIA plus deterministic fallback. Bedrock is not required for the current rate-limit issue because the app reduces duplicate AI work, serializes AI calls, and lets SQS retry transient `429` responses without adding another paid AWS inference surface.

## 11. Stop Local Dashboard

In the terminal running Vite, press:

```text
Ctrl+C
```

## 12. Delete AWS Stack

When the demo is finished:

```powershell
cd "C:\Users\Admin\Desktop\Incedo\AI Mini Project\portfolio-risk-alert-system\infrastructure"
$env:AWS_PROFILE = "portfolio-risk-demo"
sam delete
```

Confirm deletion when prompted.

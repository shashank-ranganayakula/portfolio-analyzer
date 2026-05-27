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

```powershell
curl.exe -X POST "$env:API_ENDPOINT/simulate-prices" `
  -H "content-type: application/json" `
  -d "{\"scenario\":\"stress\"}"
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

## 9. Optional AI Provider Deploy

Fallback mode works without an AI key.

To deploy with Groq:

```powershell
cd ..\infrastructure
sam deploy `
  --parameter-overrides AIProvider=groq AIModel=llama-3.1-8b-instant AIAPIKey="<your-groq-key>"
```

To deploy with NVIDIA:

```powershell
cd ..\infrastructure
sam deploy `
  --parameter-overrides AIProvider=nvidia AIModel=meta/llama-3.1-8b-instruct AIAPIKey="<your-nvidia-key>"
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


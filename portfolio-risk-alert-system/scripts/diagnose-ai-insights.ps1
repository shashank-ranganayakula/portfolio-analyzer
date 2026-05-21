param(
  [string]$Profile = "portfolio-risk-demo",
  [string]$Region = "us-east-1",
  [string]$StackName = "portfolio-risk-alert-system",
  [string]$InsightsTable = "portfolio-risk-alert-ai-insights",
  [int]$MaxItems = 10
)

$ErrorActionPreference = "Stop"

function Get-DdbString {
  param(
    [object]$Item,
    [string]$Name
  )

  if ($null -eq $Item.$Name -or $null -eq $Item.$Name.S) {
    return $null
  }

  return $Item.$Name.S
}

Write-Host "Checking AWS identity..."
aws sts get-caller-identity --profile $Profile --region $Region

Write-Host ""
Write-Host "Finding AI Insight Lambda..."
$functionName = aws cloudformation describe-stack-resource `
  --stack-name $StackName `
  --logical-resource-id AIInsightFunction `
  --profile $Profile `
  --region $Region `
  --query "StackResourceDetail.PhysicalResourceId" `
  --output text

Write-Host "AIInsightFunction: $functionName"

Write-Host ""
Write-Host "Checking AI Lambda environment..."
$config = aws lambda get-function-configuration `
  --function-name $functionName `
  --profile $Profile `
  --region $Region | ConvertFrom-Json

$envVars = $config.Environment.Variables
[PSCustomObject]@{
  AI_PROVIDER = $envVars.AI_PROVIDER
  AI_MODEL = $envVars.AI_MODEL
  AI_API_URL = $envVars.AI_API_URL
  AI_API_URL_Set = -not [string]::IsNullOrWhiteSpace($envVars.AI_API_URL)
  AI_API_KEY_Set = -not [string]::IsNullOrWhiteSpace($envVars.AI_API_KEY)
} | Format-List

Write-Host ""
Write-Host "Scanning AI insight records and sorting by createdAt..."
$scan = aws dynamodb scan `
  --table-name $InsightsTable `
  --profile $Profile `
  --region $Region `
  --output json | ConvertFrom-Json

if ($scan.Items.Count -eq 0) {
  Write-Host "No insight records found."
} else {
  $scan.Items | ForEach-Object {
    [PSCustomObject]@{
      insightId = Get-DdbString $_ "insightId"
      clientId = Get-DdbString $_ "clientId"
      provider = Get-DdbString $_ "provider"
      requestedProvider = Get-DdbString $_ "requestedProvider"
      fallbackReason = Get-DdbString $_ "fallbackReason"
      createdAt = Get-DdbString $_ "createdAt"
      explanation = Get-DdbString $_ "explanation"
    }
  } | Sort-Object createdAt -Descending | Select-Object -First $MaxItems | Format-Table -Wrap
}

Write-Host ""
Write-Host "If provider is 'fallback':"
Write-Host "- fallbackReason 'missing-api-key' means redeploy with AIAPIKey."
Write-Host "- fallbackReason with an HTTP status means the Groq request failed."
Write-Host "- blank fallbackReason usually means these are old records from before diagnostics were deployed."

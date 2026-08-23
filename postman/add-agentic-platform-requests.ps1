#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Adds all CRUD requests for the 9 new agentic platform tables to the
  Edeviser API Postman collection, organised in per-table folders.

.DESCRIPTION
  Reads agentic-platform-tables.collection.json, creates one folder per
  table inside the existing "Edeviser API" collection, then POSTs each
  request definition under its folder.

  Tables covered (migration 20260831000002_agentic_platform_tables.sql):
    agent_conversations  agent_messages       agent_tasks
    agent_feedback       agent_evaluations    learning_interventions
    intervention_outcomes  learning_state_events  student_support_states
    agent_tool_calls (view – read-only)

.PARAMETER PostmanApiKey
  Your Postman personal API key (Settings → API Keys at postman.com).
  Alternatively, set the POSTMAN_API_KEY environment variable.

.EXAMPLE
  pwsh postman/add-agentic-platform-requests.ps1 -PostmanApiKey "PMAK-..."
  $env:POSTMAN_API_KEY = "PMAK-..."; pwsh postman/add-agentic-platform-requests.ps1
#>
param(
  [string]$PostmanApiKey = $env:POSTMAN_API_KEY
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Config ────────────────────────────────────────────────────────────────────
$collectionId  = "547902a2-8435-44c1-b295-cdea74dcbe5b"   # bare UUID
$collectionUid = "52595471-547902a2-8435-44c1-b295-cdea74dcbe5b"
$postmanBase   = "https://api.getpostman.com"

if (-not $PostmanApiKey) {
  Write-Error "PostmanApiKey is required. Pass -PostmanApiKey or set POSTMAN_API_KEY env var."
  exit 1
}

$headers = @{
  "X-Api-Key"    = $PostmanApiKey
  "Content-Type" = "application/json"
}

# ── Load source JSON ──────────────────────────────────────────────────────────
$scriptDir  = Split-Path $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $scriptDir "agentic-platform-tables.collection.json"
if (-not (Test-Path $sourceFile)) {
  Write-Error "Source file not found: $sourceFile"
  exit 1
}
$source = Get-Content $sourceFile -Raw | ConvertFrom-Json

# ── Helper: create folder ─────────────────────────────────────────────────────
function New-CollectionFolder($name, $description) {
  $body = @{ name = $name; description = $description } | ConvertTo-Json
  $resp = Invoke-RestMethod `
    -Uri "$postmanBase/collections/$collectionId/folders" `
    -Method POST -Headers $headers -Body $body
  return $resp.data.id
}

# ── Helper: add request to folder ─────────────────────────────────────────────
function Add-Request($folderItem, $folderId) {
  $req     = $folderItem.request
  $method  = $req.method
  $rawUrl  = $req.url.raw
  $headers_data = $req.header
  $body    = $req.body
  $events  = $folderItem.event

  $payload = @{
    name        = $folderItem.name
    description = if ($req.PSObject.Properties['description']) { $req.description } else { "" }
    method      = $method
    url         = $rawUrl
    headerData  = $headers_data
    events      = $events
  }

  if ($body -and $body.mode -eq "raw") {
    $payload.dataMode    = "raw"
    $payload.rawModeData = $body.raw
    $payload.dataOptions = $body.options
  }

  $jsonPayload = $payload | ConvertTo-Json -Depth 10
  $resp = Invoke-RestMethod `
    -Uri "$postmanBase/collections/$collectionId/requests?folder=$folderId" `
    -Method POST -Headers $headers -Body $jsonPayload
  return $resp.data.id
}

# ── Main loop ─────────────────────────────────────────────────────────────────
$totalRequests = 0
$allCreated    = @()

foreach ($folder in $source.item) {
  Write-Host ""
  Write-Host "Creating folder: '$($folder.name)' …"
  $folderId = New-CollectionFolder $folder.name $folder.description
  Write-Host "  Folder id: $folderId"

  foreach ($item in $folder.item) {
    Write-Host "  Adding request: $($item.name) …"
    $reqId = Add-Request $item $folderId
    $allCreated += @{ folder = $folder.name; request = $item.name; id = $reqId }
    $totalRequests++
    Write-Host "    Request id: $reqId"
  }
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Done. $totalRequests requests added across $($source.item.Count) folders."
Write-Host "Open: https://go.postman.co/collection/$collectionUid"
Write-Host ""
Write-Host "Created request IDs:"
$allCreated | ForEach-Object {
  Write-Host "  [$($_.folder)] $($_.request): $($_.id)"
}

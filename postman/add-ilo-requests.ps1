#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Adds the 9 ILO agent-tool requests to the Edeviser API Postman collection.

.DESCRIPTION
  Reads agent-ilo-tools.collection.json, then POSTs each request definition to
  the Postman REST API under a new "Agent – ILO Tools" folder inside the
  existing "Edeviser API" collection.

.PARAMETER PostmanApiKey
  Your Postman personal API key (Settings → API Keys at postman.com).
  Alternatively, set the POSTMAN_API_KEY environment variable.

.EXAMPLE
  pwsh postman/add-ilo-requests.ps1 -PostmanApiKey "PMAK-..."
  # or
  $env:POSTMAN_API_KEY = "PMAK-..."; pwsh postman/add-ilo-requests.ps1
#>
param(
  [string]$PostmanApiKey = $env:POSTMAN_API_KEY
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Config ────────────────────────────────────────────────────────────────────
$collectionId = "547902a2-8435-44c1-b295-cdea74dcbe5b"   # bare UUID (no owner prefix)
$collectionUid = "52595471-547902a2-8435-44c1-b295-cdea74dcbe5b"
$postmanBase = "https://api.getpostman.com"

if (-not $PostmanApiKey) {
  Write-Error "PostmanApiKey is required. Pass -PostmanApiKey or set POSTMAN_API_KEY env var."
  exit 1
}

$headers = @{
  "X-Api-Key"    = $PostmanApiKey
  "Content-Type" = "application/json"
}

# ── 1. Read the collection JSON source ────────────────────────────────────────
$scriptDir = Split-Path $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $scriptDir "agent-ilo-tools.collection.json"
if (-not (Test-Path $sourceFile)) {
  Write-Error "Source file not found: $sourceFile"
  exit 1
}
$source = Get-Content $sourceFile -Raw | ConvertFrom-Json

# ── 2. Create folder in the collection ────────────────────────────────────────
Write-Host "Creating folder 'Agent – ILO Tools' in collection $collectionId …"
$folderBody = @{
  name        = "Agent – ILO Tools"
  description = "9 read-tool exercisers for the ILO capability additions in registry.ts (2026-08-21)."
} | ConvertTo-Json

$folderResp = Invoke-RestMethod `
  -Uri "$postmanBase/collections/$collectionId/folders" `
  -Method POST `
  -Headers $headers `
  -Body $folderBody

$folderId = $folderResp.data.id
if (-not $folderId) {
  Write-Error "Failed to create folder. Response: $($folderResp | ConvertTo-Json)"
  exit 1
}
Write-Host "  Folder created: $folderId"

# ── 3. Common headers & test script ──────────────────────────────────────────
$commonHeaders = @(
  @{ key = "apikey";        value = "{{anon_key}}";      type = "text" },
  @{ key = "Authorization"; value = "Bearer {{access_token}}"; type = "text" },
  @{ key = "Content-Type";  value = "application/json";  type = "text" }
)

$baseTestScript = @"
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Response time < 10000ms', () => pm.expect(pm.response.responseTime).to.be.below(10000));
const body = pm.response.json();
pm.test('Has reply or error', () => {
  pm.expect(body).to.satisfy(b => b.reply !== undefined || b.error !== undefined);
});
pm.test('No unexpected 5xx error', () => {
  if (body.error) { pm.expect(body.error.code).to.not.equal('execution_failed'); }
});
"@

function New-RequestBody($message, $specialist, $contextObj) {
  $ctx = @{ route = $contextObj.route }
  if ($contextObj.programId) { $ctx.programId = $contextObj.programId }
  if ($contextObj.studentId) { $ctx.studentId = $contextObj.studentId }
  if ($contextObj.courseId)  { $ctx.courseId  = $contextObj.courseId  }
  return @{
    message    = $message
    specialist = $specialist
    context    = $ctx
    requestId  = "{{`$guid}}"
    sessionId  = "{{`$guid}}"
  } | ConvertTo-Json -Depth 4
}

# ── 4. Request definitions ─────────────────────────────────────────────────────
$requests = @(
  @{
    name        = "get_institution_ilos"
    description = "Exercises get_institution_ilos — lists ILOs with mapping counts. Role: admin."
    message     = "List all institution learning outcomes for this institution."
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos" }
  },
  @{
    name        = "get_ilo_detail"
    description = "Exercises get_ilo_detail — one ILO with canonical PLO mappings. Roles: admin, coordinator."
    message     = "Show me the detail for ILO {{ilo_id}} including its PLO mappings."
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos/{{ilo_id}}"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_ilo_attainment"
    description = "Exercises get_ilo_attainment — server-calculated ILO attainment from evidence. Roles: admin, coordinator."
    message     = "What is the current attainment level for ILO {{ilo_id}} in program {{program_id}}?"
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos/{{ilo_id}}/attainment"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_ilo_attainment_trend"
    description = "Exercises get_ilo_attainment_trend — deterministic attainment trend series. Roles: admin, coordinator."
    message     = "Show me the attainment trend over time for ILO {{ilo_id}} in program {{program_id}}."
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos/{{ilo_id}}/trend"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_ilo_mapping_coverage"
    description = "Exercises get_ilo_mapping_coverage — ILO→PLO mapping coverage and gaps. Roles: admin, coordinator."
    message     = "What is the ILO-to-PLO mapping coverage and are there any gaps for ILO {{ilo_id}} in program {{program_id}}?"
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos/{{ilo_id}}/coverage"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_ilo_program_contributions"
    description = "Exercises get_ilo_program_contributions — per-program contribution to an ILO. Roles: admin, coordinator."
    message     = "Which programs contribute to ILO {{ilo_id}} and by how much?"
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos/{{ilo_id}}/programs"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_ilo_evidence_summary"
    description = "Exercises get_ilo_evidence_summary — evidence counts and confidence for ILO attainment. Roles: admin, coordinator."
    message     = "How much evidence exists for ILO {{ilo_id}} attainment in program {{program_id}} and how confident is the calculation?"
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/ilos/{{ilo_id}}/evidence"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_unmapped_program_outcomes"
    description = "Exercises get_unmapped_program_outcomes — PLOs without a canonical ILO→PLO mapping. Roles: admin, coordinator."
    message     = "Which PLOs in program {{program_id}} are not mapped to any ILO?"
    specialist  = "institutional_outcomes"
    context     = @{ route = "/coordinator/programs/{{program_id}}/outcomes"; programId = "{{program_id}}" }
  },
  @{
    name        = "get_outcome_hierarchy_health"
    description = "Exercises get_outcome_hierarchy_health — orphans, invalid pairs, weight anomalies. Role: admin only."
    message     = "Are there any orphaned outcomes, invalid mapping pairs, or weight anomalies in the institution's outcome hierarchy?"
    specialist  = "institutional_outcomes"
    context     = @{ route = "/admin/outcomes/health" }
  }
)

# ── 5. Add each request to the folder ─────────────────────────────────────────
$created = @()
foreach ($req in $requests) {
  Write-Host "  Adding: $($req.name) …"

  $rawBody = New-RequestBody $req.message $req.specialist $req.context

  $requestPayload = @{
    name        = $req.name
    description = $req.description
    method      = "POST"
    url         = "{{base_url}}/functions/v1/agent-orchestrator"
    headerData  = $commonHeaders
    dataMode    = "raw"
    rawModeData = $rawBody
    dataOptions = @{ raw = @{ language = "json" } }
    events      = @(
      @{
        listen = "test"
        script = @{
          type = "text/javascript"
          exec = @($baseTestScript)
        }
      }
    )
  } | ConvertTo-Json -Depth 8

  $resp = Invoke-RestMethod `
    -Uri "$postmanBase/collections/$collectionId/requests?folder=$folderId" `
    -Method POST `
    -Headers $headers `
    -Body $requestPayload

  $created += @{ name = $req.name; id = $resp.data.id }
  Write-Host "    Created request id: $($resp.data.id)"
}

# ── 6. Summary ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Done. $($created.Count)/9 requests added to folder '$folderId'."
Write-Host "Open: https://go.postman.co/collection/$collectionUid"
Write-Host ""
Write-Host "Created request IDs:"
$created | ForEach-Object { Write-Host "  $($_.name): $($_.id)" }

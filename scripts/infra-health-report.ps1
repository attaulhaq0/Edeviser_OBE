# Runs scripts/infra-health-report.sql against the linked Supabase project and
# archives a timestamped JSON snapshot under audit/baselines/infra-health/.
#
# WHY THIS EXISTS: the recurring question "is the database actually the
# bottleneck, and has anything changed since last time?" needs a repeatable,
# comparable artifact, not a one-off SQL Editor paste. This is the reusable
# health-check requested alongside docs/operations/supabase-compute-tiers.md.
#
# What it captures (see infra-health-report.sql for detail on each section):
#   - compute fingerprint (shared_buffers etc. -> infers compute tier)
#   - per-role statement_timeout + connection headroom
#   - realtime publication size
#   - top queries by total time / by call count (pg_stat_statements)
#   - read amplification (rows vs scan count) per table
#   - RLS: multiple_permissive_policies + any remaining bare auth.uid() calls
#   - SECURITY DEFINER RPC exposure to anon/authenticated
#   - extensions installed in the public schema
#   - table sizes (rules out "it's just data volume")
#
# Usage:
#   pwsh scripts/infra-health-report.ps1
#   pwsh scripts/infra-health-report.ps1 -ProjectId <other-id>
#   pwsh scripts/infra-health-report.ps1 -NoSave     # print only, don't archive
#
# Requires: Supabase CLI auth (same prerequisite as scripts/regen-types.ps1 —
# `npx supabase login` or $env:SUPABASE_ACCESS_TOKEN).

[CmdletBinding()]
param(
    [string]$ProjectId,
    [switch]$NoSave
)

$ErrorActionPreference = 'Stop'

$Root = (git rev-parse --show-toplevel 2>$null)
if (-not $Root) { Write-Host 'FAIL not in a git repo' -ForegroundColor Red; exit 1 }
Set-Location $Root.Trim()

if (-not $ProjectId) {
    $ProjectId = if ($env:SUPABASE_PROJECT_ID) { $env:SUPABASE_PROJECT_ID } else { 'cdlgtbvxlxjpcddjazzx' }
}

$SqlFile = 'scripts/infra-health-report.sql'
if (-not (Test-Path $SqlFile)) {
    Write-Host "FAIL $SqlFile not found" -ForegroundColor Red
    exit 1
}

Write-Host "[infra-health] checking Supabase auth..." -ForegroundColor Cyan
$null = npx --yes -p supabase@latest supabase projects list --output json 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL Supabase CLI not authenticated." -ForegroundColor Red
    Write-Host "  fix: npx supabase login   (or set `$env:SUPABASE_ACCESS_TOKEN)"
    exit 2
}
Write-Host "OK   authenticated" -ForegroundColor Green

Write-Host "[infra-health] querying project $ProjectId..." -ForegroundColor Cyan
$errFile = Join-Path ([System.IO.Path]::GetTempPath()) "infra-health-err-$([guid]::NewGuid().ToString('N')).log"
$raw = & npx --yes -p supabase@latest supabase db query --file $SqlFile --linked --output json 2> $errFile
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "FAIL query failed (exit $exitCode)" -ForegroundColor Red
    Get-Content $errFile -ErrorAction SilentlyContinue | Write-Host
    Remove-Item $errFile -Force -ErrorAction SilentlyContinue
    exit 3
}
Remove-Item $errFile -Force -ErrorAction SilentlyContinue

# The CLI wraps the single-row result in an array: [ { "infra_health_snapshot": {...} } ]
try {
    $parsed = $raw | ConvertFrom-Json
    $snapshot = $parsed[0].infra_health_snapshot
} catch {
    Write-Host "FAIL could not parse CLI output as the expected JSON shape" -ForegroundColor Red
    Write-Host "     raw output (first 500 chars): $($raw | Out-String).Substring(0, [Math]::Min(500, ($raw | Out-String).Length))"
    exit 4
}
if (-not $snapshot -or -not $snapshot.computeFingerprint) {
    Write-Host "FAIL query returned no snapshot -- refusing to archive garbage" -ForegroundColor Red
    exit 4
}
Write-Host "OK   snapshot captured" -ForegroundColor Green

# ── Human-readable summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Infra Health Summary ===" -ForegroundColor Magenta
Write-Host ("  shared_buffers:  {0} (8kB pages) -- see docs/operations/supabase-compute-tiers.md for tier lookup" -f $snapshot.computeFingerprint.shared_buffers_8kb_pages)
Write-Host ("  max_connections: {0}" -f $snapshot.computeFingerprint.max_connections)
Write-Host ("  connections now: {0} / {1} ({2}%)" -f $snapshot.connectionHeadroom.current_connections, $snapshot.connectionHeadroom.max_connections, $snapshot.connectionHeadroom.pct_used)
Write-Host ("  realtime published tables: {0}" -f $snapshot.realtimePublishedTables.published_table_count)
Write-Host ("  tables with multiple permissive policies: {0}" -f @($snapshot.multiplePermissivePolicies).Count)
Write-Host ("  policies with a remaining bare auth call:  {0}" -f @($snapshot.bareAuthCallsInRls).Count)
Write-Host ("  SECURITY DEFINER RPCs exposed to anon/authenticated: {0}" -f @($snapshot.securityDefinerRpcExposure).Count)
Write-Host ("  extensions in public schema: {0}" -f (($snapshot.extensionsInPublicSchema | ForEach-Object { $_.extname }) -join ', '))
if (@($snapshot.topQueriesByTotalTime).Count -gt 0) {
    $top = $snapshot.topQueriesByTotalTime[0]
    Write-Host ("  hottest query (by total time): {0} calls, mean {1}ms, max {2}ms" -f $top.calls, $top.mean_exec_time_ms, $top.max_exec_time_ms)
}
Write-Host ""

if ($NoSave) {
    Write-Host "[infra-health] -NoSave set, not archiving." -ForegroundColor Yellow
    exit 0
}

# ── Archive under audit/baselines/infra-health/ ──────────────────────────────
$OutDir = 'audit/baselines/infra-health'
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$Commit = (git rev-parse HEAD 2>$null)
if (-not $Commit) { $Commit = 'unknown' }
$Timestamp = Get-Date -Format 'yyyy-MM-dd'
$OutFile = Join-Path $OutDir "$Timestamp.json"

$envelope = [ordered]@{
    createdAt      = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    lockedByCommit = $Commit.Trim()
    description    = "Point-in-time infra health snapshot (compute fingerprint, RLS multiplicity, hot queries, read amplification, security exposure). Generated by scripts/infra-health-report.ps1. Informational history, not an enforced regression gate -- compare successive files by hand or with a future diff tool."
    projectId      = $ProjectId
    snapshot       = $snapshot
}
$envelope | ConvertTo-Json -Depth 20 | Set-Content -Path $OutFile -Encoding utf8

Write-Host "OK   snapshot saved to $OutFile" -ForegroundColor Green
exit 0

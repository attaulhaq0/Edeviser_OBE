# =============================================================================
# Deploy Edge Functions with Security Fixes — Batch Script
# =============================================================================
# Deploys the 14 Edge Functions that received the substring auth pattern fix
# and the 2 functions that got ownership checks (process-streak, check-badges).
#
# Prerequisites:
#   1. Supabase CLI installed: npm install -g supabase
#   2. Authenticated: npx supabase login
#      OR set $env:SUPABASE_ACCESS_TOKEN = "sb_pat_..."
#   3. Project linked: npx supabase link --project-ref cdlgtbvxlxjpcddjazzx
#
# Usage:
#   pwsh scripts/deploy-edge-functions.ps1
#   pwsh scripts/deploy-edge-functions.ps1 -DryRun   # Preview without deploying
#   pwsh scripts/deploy-edge-functions.ps1 -Critical # Only deploy the 4 critical ones
# =============================================================================

param(
    [switch]$DryRun,
    [switch]$Critical
)

$ErrorActionPreference = "Stop"

# All 14 functions with security fixes
$AllFunctions = @(
    "award-xp",
    "check-badges",
    "process-streak",
    "send-email-notification",
    "calculate-attainment-rollup",
    "ai-at-risk-prediction",
    "ai-module-suggestion",
    "check-login-rate",
    "compute-at-risk-signals",
    "compute-habit-correlations",
    "notification-digest",
    "streak-risk-cron",
    "update-question-analytics",
    "weekly-summary-cron"
)

# The 4 most critical (auth bypass + ownership)
$CriticalFunctions = @(
    "award-xp",
    "check-badges",
    "process-streak",
    "send-email-notification"
)

$FunctionsToDeploy = if ($Critical) { $CriticalFunctions } else { $AllFunctions }

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Edeviser — Edge Function Deployment" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mode    : $(if ($DryRun) { 'DRY RUN' } else { 'DEPLOY' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })
Write-Host "Scope   : $(if ($Critical) { 'Critical only (4)' } else { 'All security fixes (14)' })" -ForegroundColor White
Write-Host "Project : cdlgtbvxlxjpcddjazzx" -ForegroundColor White
Write-Host ""

# Verify Supabase CLI is authenticated
if (-not $DryRun) {
    Write-Host "Verifying Supabase CLI authentication..." -ForegroundColor Gray
    $authCheck = npx supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Not authenticated. Run 'npx supabase login' first." -ForegroundColor Red
        Write-Host "Or set the SUPABASE_ACCESS_TOKEN env var." -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Authenticated" -ForegroundColor Green
    Write-Host ""
}

$succeeded = @()
$failed = @()
$index = 0
$total = $FunctionsToDeploy.Count

foreach ($fn in $FunctionsToDeploy) {
    $index++
    Write-Host "[$index/$total] $fn" -ForegroundColor White

    # Verify the function source exists
    $functionPath = "supabase/functions/$fn/index.ts"
    if (-not (Test-Path $functionPath)) {
        Write-Host "  ✗ Source file not found: $functionPath" -ForegroundColor Red
        $failed += $fn
        continue
    }

    if ($DryRun) {
        $size = (Get-Item $functionPath).Length
        Write-Host "  → Would deploy ($([math]::Round($size/1024, 1)) KB)" -ForegroundColor Yellow
        $succeeded += $fn
        continue
    }

    # Deploy via Supabase CLI
    $output = npx supabase functions deploy $fn --project-ref cdlgtbvxlxjpcddjazzx 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Deployed" -ForegroundColor Green
        $succeeded += $fn
    } else {
        Write-Host "  ✗ Failed: $output" -ForegroundColor Red
        $failed += $fn
    }

    # Small delay to avoid rate limits
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Succeeded : $($succeeded.Count) / $total" -ForegroundColor Green
if ($succeeded.Count -gt 0) {
    foreach ($fn in $succeeded) {
        Write-Host "  ✓ $fn" -ForegroundColor Green
    }
}

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed    : $($failed.Count) / $total" -ForegroundColor Red
    foreach ($fn in $failed) {
        Write-Host "  ✗ $fn" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "To deploy a single failed function manually:" -ForegroundColor Yellow
    Write-Host "  npx supabase functions deploy <name> --project-ref cdlgtbvxlxjpcddjazzx" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "All functions deployed successfully." -ForegroundColor Green
Write-Host ""

# Regenerate src/types/database.ts from Supabase, safely.
#
# What this prevents (the failure mode that kept corrupting database.ts):
#   1. npx preamble ("Need to install...") leaking into the file via `>` redirect
#   2. Silent auth failure producing a 0-byte / tiny file
#   3. Mid-write crash from Windows file locks (Kiro/tsserver) leaving the file truncated
#
# How it prevents them:
#   - auth-checked before generation                           -> no silent failure
#   - generated to OS temp dir, validated, THEN moved          -> never half-written
#   - move-with-retry/backoff                                  -> survives transient locks
#   - content sniff ("export type Database")                   -> refuses to install garbage
#
# Usage (PowerShell):
#   pwsh scripts/regen-types.ps1
#   pwsh scripts/regen-types.ps1 -ProjectId <other-id>

[CmdletBinding()]
param(
    [string]$ProjectId,
    [string]$Output = 'src/types/database.ts',
    [int]$MaxRetries = 6
)

$ErrorActionPreference = 'Stop'

$Root = (git rev-parse --show-toplevel 2>$null)
if (-not $Root) { Write-Host 'FAIL not in a git repo' -ForegroundColor Red; exit 1 }
Set-Location $Root.Trim()

if (-not $ProjectId) {
    $ProjectId = if ($env:SUPABASE_PROJECT_ID) { $env:SUPABASE_PROJECT_ID } else { 'cdlgtbvxlxjpcddjazzx' }
}

Write-Host "[regen-types] checking Supabase auth..." -ForegroundColor Cyan
$null = npx --yes -p supabase@latest supabase projects list --output json 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL Supabase CLI not authenticated." -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix one of:" -ForegroundColor Yellow
    Write-Host "  1) interactive login (opens browser):"
    Write-Host "       npx supabase login"
    Write-Host "  2) personal access token (recommended for scripts):"
    Write-Host "       - generate at https://supabase.com/dashboard/account/tokens"
    Write-Host '       - then: $env:SUPABASE_ACCESS_TOKEN = "sb_pat_..."'
    exit 2
}
Write-Host "OK   authenticated" -ForegroundColor Green

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "supabase-types-$([guid]::NewGuid().ToString('N')).ts"
Write-Host "[regen-types] generating types for project $ProjectId..." -ForegroundColor Cyan
& npx --yes -p supabase@latest supabase gen types --lang=typescript --project-id $ProjectId 2>$null > $tmp
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmp) -or (Get-Item $tmp).Length -lt 1000) {
    Write-Host "FAIL generation produced empty/small output (auth or project-id problem)" -ForegroundColor Red
    if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
    exit 3
}

$content = Get-Content $tmp -Raw
if ($content -notmatch 'export type Database' -or $content -notmatch 'export type Json') {
    Write-Host "FAIL output does not look like Supabase types -- refusing to overwrite $Output" -ForegroundColor Red
    Write-Host "first 300 bytes received:" -ForegroundColor Yellow
    Write-Host ($content.Substring(0, [Math]::Min(300, $content.Length)))
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    exit 4
}
Write-Host "OK   output validated ($((Get-Item $tmp).Length) bytes)" -ForegroundColor Green

$null = & npx --yes prettier --write $tmp 2>$null

Write-Host "[regen-types] installing to $Output..." -ForegroundColor Cyan
for ($i = 1; $i -le $MaxRetries; $i++) {
    try {
        Move-Item -LiteralPath $tmp -Destination $Output -Force -ErrorAction Stop
        Write-Host "OK   $Output updated ($((Get-Item $Output).Length) bytes)" -ForegroundColor Green
        exit 0
    } catch {
        if ($i -eq $MaxRetries) {
            Write-Host "FAIL could not install $Output after $MaxRetries attempts" -ForegroundColor Red
            Write-Host "     reason: $_" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "     Destination is locked. On Windows the usual culprits are:" -ForegroundColor Yellow
            Write-Host "       - TypeScript Server (one per open Kiro/VS Code window)"
            Write-Host "       - Vite / dev-server file watcher"
            Write-Host "       - Antivirus real-time scanner (Defender)"
            Write-Host ""
            Write-Host "     Fix: close every Kiro window, wait ~10s, then re-run this script."
            Write-Host "     Generated content preserved at: $tmp"
            exit 5
        }
        $delay = [int][Math]::Min(16, [Math]::Pow(2, $i - 1))
        Write-Host "  attempt $i locked, retrying in ${delay}s..." -ForegroundColor Yellow
        Start-Sleep -Seconds $delay
    }
}

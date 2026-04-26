# Verify the REPO is in sync with GitHub and the live Supabase schema,
# and check local build health.
#
# Two distinct concerns reported separately:
#   PART 1 - Repo sync state (what is tracked in git vs origin vs Supabase).
#            These checks must pass for the repo to be considered healthy.
#   PART 2 - Local build health (lint + tsc + tests on the working tree).
#            Failures here may be caused by untracked WIP files; see the warning.
#
# Required: git, node, npx. Optional: gh, supabase CLI.

$ErrorActionPreference = 'Continue'
$Repo = 'attaulhaq0/Edeviser_OBE'
$SupabaseProject = 'cdlgtbvxlxjpcddjazzx'
$Root = (git rev-parse --show-toplevel).Trim()
Set-Location $Root

$Failed = 0
function Section($t)  { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Banner($t)   { Write-Host "`n############ $t ############" -ForegroundColor Magenta }
function OK($m)       { Write-Host "OK   $m" -ForegroundColor Green }
function SKIPM($m)    { Write-Host "SKIP $m" -ForegroundColor Yellow }
function WARN($m)     { Write-Host "WARN $m" -ForegroundColor Yellow }
function FAILM($m)    { Write-Host "FAIL $m" -ForegroundColor Red; $script:Failed = 1 }

function NormalizeAndHash($path) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $stripped = [byte[]]($bytes | Where-Object { $_ -ne 0x0D })
    $sha = [System.Security.Cryptography.SHA256]::Create()
    ($sha.ComputeHash($stripped) | ForEach-Object { $_.ToString('x2') }) -join ''
}

# ============================================================================
Banner 'PART 1 - Repo sync state'
# ============================================================================

# 1. Branch + remote sync
Section 'Branch / commit'
$Local  = (git rev-parse HEAD).Trim()
git fetch --quiet origin main 2>$null
$Remote = (git rev-parse origin/main).Trim()
Write-Host "  local HEAD:  $Local"
Write-Host "  origin/main: $Remote"
if ($Local -eq $Remote) { OK 'local matches origin/main' }
else { FAILM 'local diverges from origin/main - run: git pull --ff-only origin main' }

# 2. Working tree (tracked files only)
Section 'Working tree (tracked files only)'
$status = git status --porcelain 2>$null
$dirty  = $status | Where-Object { $_ -notmatch '^(\?\?| \?)' }
$untracked = ($status | Where-Object { $_ -match '^\?\?' }).Count
if (-not $dirty) {
    OK 'no uncommitted modifications to tracked files'
    if ($untracked -gt 0) {
        WARN "$untracked untracked files present (not in git) - won't affect repo state"
        WARN 'but MAY cause local lint/tsc/test failures in PART 2 below'
    }
} else {
    $dirty | ForEach-Object { Write-Host "  $_" }
    FAILM 'uncommitted modifications to tracked files'
}

# 3. database.ts matches GitHub
Section 'database.ts: GitHub vs local (CRLF normalized)'
if (Get-Command gh -ErrorAction SilentlyContinue) {
    $localHash = NormalizeAndHash 'src/types/database.ts'
    $b64 = gh api "repos/$Repo/contents/src/types/database.ts" --jq '.content' 2>$null
    if ($b64) {
        $bytes = [Convert]::FromBase64String(($b64 -replace '\s', ''))
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $remoteHash = ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
        Write-Host "  local:  $localHash"
        Write-Host "  github: $remoteHash"
        if ($localHash -eq $remoteHash) { OK 'database.ts matches GitHub' }
        else { FAILM 'database.ts differs from GitHub' }
    } else { SKIPM 'gh API call returned empty - run: gh auth status' }
} else {
    SKIPM 'gh CLI not on PATH - install from https://cli.github.com'
}

# 4. database.ts == fresh-from-Supabase
Section 'database.ts: local vs live Supabase'
$tmp = [System.IO.Path]::GetTempFileName() + '.ts'
$null = npx --yes -p supabase supabase gen types --lang=typescript --project-id $SupabaseProject 2>$null > $tmp
if ((Test-Path $tmp) -and (Get-Item $tmp).Length -gt 0) {
    $null = npx --yes prettier --write $tmp 2>$null
    $fresh = NormalizeAndHash $tmp
    $repo  = NormalizeAndHash 'src/types/database.ts'
    Write-Host "  fresh: $fresh"
    Write-Host "  repo:  $repo"
    if ($fresh -eq $repo) { OK 'database.ts matches live Supabase schema' }
    else { FAILM "schema drift - to resync: npx supabase gen types --lang=typescript --project-id $SupabaseProject > src/types/database.ts && npx prettier --write src/types/database.ts" }
    Remove-Item $tmp -ErrorAction SilentlyContinue
} else {
    SKIPM 'supabase CLI not authenticated - run: npx supabase login'
    Remove-Item $tmp -ErrorAction SilentlyContinue
}

# ============================================================================
Banner 'PART 2 - Local build health'
if ($untracked -gt 0) {
    WARN "you have $untracked untracked files - failures below may be caused by them"
    WARN 'to test repo state in isolation: git stash -u; bash scripts/verify-sync.sh; git stash pop'
}
# ============================================================================

Section 'CI checks'
$null = npm run lint --silent 2>&1
if ($LASTEXITCODE -eq 0) { OK 'lint clean' } else { FAILM 'lint failed - run: npm run lint' }

$tscOut = npx tsc --noEmit --pretty false 2>&1
if ($LASTEXITCODE -eq 0) { OK 'type-check clean' } else {
    FAILM 'tsc failed'
    Write-Host '    First 5 errors:'
    $tscOut | Select-Object -First 5 | ForEach-Object { Write-Host "      $_" }
}

Write-Host '  running test suite (~90s)...'
$testLog = npm test --silent 2>&1
if ($LASTEXITCODE -eq 0) {
    OK 'tests passing'
    $testLog | Select-String -Pattern 'Test Files|Tests ' | Select-Object -Last 2 | ForEach-Object { Write-Host "  $_" }
} else {
    FAILM 'tests failed'
    $testLog | Select-String -Pattern 'FAIL ' | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" }
}

Write-Host ''
if ($Failed -eq 0) {
    Write-Host '================================' -ForegroundColor Green
    Write-Host '  All checks passed' -ForegroundColor Green
    Write-Host '================================' -ForegroundColor Green
    exit 0
} else {
    Write-Host '================================' -ForegroundColor Red
    Write-Host '  Some checks failed' -ForegroundColor Red
    Write-Host '================================' -ForegroundColor Red
    Write-Host 'Hint: if PART 1 passed but PART 2 failed, the issue is in your local'
    Write-Host 'working tree (likely untracked WIP files), not the repo itself.'
    exit 1
}

# end

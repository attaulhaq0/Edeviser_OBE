#!/usr/bin/env bash
# Verify the REPO is in sync with GitHub and the live Supabase schema,
# and check local build health.
#
# Two distinct concerns reported separately:
#   PART 1 — Repo sync state (what's tracked in git vs origin vs Supabase).
#            These checks must pass for the repo to be considered healthy.
#   PART 2 — Local build health (lint + tsc + tests on the working tree).
#            Failures here may be caused by untracked WIP files; see the warning.
#
# Required: git, npx, node, sha256sum.
# Optional: gh (skips GitHub-content check if absent),
#           supabase CLI (skips live-schema diff if absent).

set -u

REPO="attaulhaq0/Edeviser_OBE"
SUPABASE_PROJECT="cdlgtbvxlxjpcddjazzx"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

c()    { printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"; }
ok()   { printf '\033[1;32mOK\033[0m   %s\n' "$1"; }
skip() { printf '\033[1;33mSKIP\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }
warn() { printf '\033[1;33mWARN\033[0m %s\n' "$1"; }

FAILED=0

# Suppress harmless WSL drive-translation noise on Windows
exec 3>&2 2> >(grep -v '^wsl: Failed to translate' >&2)

# =============================================================================
printf '\n\033[1;35m############ PART 1 — Repo sync state ############\033[0m\n'
# =============================================================================

# 1. Branch + remote sync
c "Branch / commit"
LOCAL_HEAD=$(git rev-parse HEAD)
git fetch --quiet origin main
REMOTE_HEAD=$(git rev-parse origin/main)
echo "  local HEAD:  $LOCAL_HEAD"
echo "  origin/main: $REMOTE_HEAD"
if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
  ok "local matches origin/main"
else
  fail "local diverges from origin/main — run: git pull --ff-only origin main"
fi

# 2. Working tree — only flag tracked-file modifications, not untracked
c "Working tree (tracked files only)"
DIRTY=$(git status --porcelain 2>/dev/null | grep -vE '^(\?\?| \?)' | wc -l | tr -d ' ')
UNTRACKED=$(git status --porcelain 2>/dev/null | grep -cE '^\?\?')
if [ "$DIRTY" = "0" ]; then
  ok "no uncommitted modifications to tracked files"
  if [ "$UNTRACKED" -gt 0 ]; then
    warn "$UNTRACKED untracked files present (not in git) — won't affect repo state"
    warn "but MAY cause local lint/tsc/test failures in PART 2 below"
  fi
else
  git status --porcelain 2>/dev/null | grep -vE '^(\?\?| \?)'
  fail "uncommitted modifications to tracked files"
fi

# 3. database.ts content matches GitHub (needs gh)
c "database.ts: GitHub vs local (CRLF normalized)"
GH_BIN=""
for cand in gh "/c/Program Files/GitHub CLI/gh.exe" "/mnt/c/Program Files/GitHub CLI/gh.exe"; do
  if command -v "$cand" >/dev/null 2>&1 || [ -x "$cand" ]; then GH_BIN="$cand"; break; fi
done

if [ -n "$GH_BIN" ]; then
  LOCAL_HASH=$(tr -d '\r' < src/types/database.ts | sha256sum | cut -d' ' -f1)
  REMOTE_RAW=$("$GH_BIN" api "repos/$REPO/contents/src/types/database.ts" --jq '.content' 2>/dev/null || true)
  if [ -n "$REMOTE_RAW" ]; then
    REMOTE_HASH=$(echo "$REMOTE_RAW" | base64 -d 2>/dev/null | sha256sum | cut -d' ' -f1)
    echo "  local:  $LOCAL_HASH"
    echo "  github: $REMOTE_HASH"
    if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
      ok "database.ts matches GitHub"
    else
      fail "database.ts differs from GitHub"
    fi
  else
    skip "gh API call returned empty — run 'gh auth status' and 'gh auth login' if needed"
  fi
else
  skip "gh CLI not on PATH (install from https://cli.github.com or run from PowerShell instead)"
fi

# 4. database.ts == fresh-from-Supabase (semantic, prettier-normalized)
c "database.ts: local vs live Supabase"
TMP="$(mktemp).ts"
if npx --yes -p supabase supabase gen types --lang=typescript --project-id "$SUPABASE_PROJECT" > "$TMP" 2>/dev/null \
   && [ -s "$TMP" ]; then
  npx --yes prettier --write "$TMP" >/dev/null 2>&1
  FRESH_HASH=$(sha256sum "$TMP" | cut -d' ' -f1)
  REPO_HASH=$(sha256sum src/types/database.ts | cut -d' ' -f1)
  echo "  fresh: $FRESH_HASH"
  echo "  repo:  $REPO_HASH"
  if [ "$FRESH_HASH" = "$REPO_HASH" ]; then
    ok "database.ts matches live Supabase schema"
  else
    fail "schema drift — to resync: npx supabase gen types --lang=typescript --project-id $SUPABASE_PROJECT > src/types/database.ts && npx prettier --write src/types/database.ts"
    diff "$TMP" src/types/database.ts | head -20
  fi
  rm -f "$TMP"
else
  skip "supabase CLI not authenticated (run: npx supabase login)"
  rm -f "$TMP"
fi

# =============================================================================
printf '\n\033[1;35m############ PART 2 — Local build health ############\033[0m\n'
if [ "${UNTRACKED:-0}" -gt 0 ]; then
  warn "you have $UNTRACKED untracked files — failures below may be caused by them"
  warn "to test the repo state in isolation: git stash -u && bash scripts/verify-sync.sh && git stash pop"
fi
# =============================================================================

c "CI checks"
if npm run lint --silent >/dev/null 2>&1; then ok "lint clean"; else fail "lint failed — run: npm run lint"; fi
if npx tsc --noEmit --pretty false >/dev/null 2>&1; then ok "type-check clean"; else
  fail "tsc failed"
  echo "    First 5 errors:"
  npx tsc --noEmit --pretty false 2>&1 | head -5 | sed 's/^/      /'
fi

echo "  running test suite (~90s)..."
TEST_LOG="$(mktemp)"
if npm test --silent >"$TEST_LOG" 2>&1; then
  ok "tests passing"
  grep -E "Test Files|Tests " "$TEST_LOG" | tail -2 | sed 's/^/  /'
else
  fail "tests failed"
  grep -E "FAIL " "$TEST_LOG" | head -5 | sed 's/^/    /'
fi
rm -f "$TEST_LOG"

# Restore stderr
exec 2>&3 3>&-

echo ""
if [ "$FAILED" = "0" ]; then
  printf '\033[1;32m================================\n  All checks passed\n================================\033[0m\n'
  exit 0
else
  printf '\033[1;31m================================\n  Some checks failed\n================================\033[0m\n'
  echo "Hint: if PART 1 passed but PART 2 failed, the issue is in your local"
  echo "working tree (likely untracked WIP files), not the repo itself."
  exit 1
fi

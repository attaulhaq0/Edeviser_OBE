#!/usr/bin/env bash
# =============================================================================
# Deploy Edge Functions with Security Fixes — Batch Script (bash)
# =============================================================================
# Linux/macOS/Git Bash equivalent of deploy-edge-functions.ps1
#
# Prerequisites:
#   1. Supabase CLI: npm install -g supabase
#   2. Authenticated: npx supabase login
#      OR export SUPABASE_ACCESS_TOKEN="sb_pat_..."
#
# Usage:
#   bash scripts/deploy-edge-functions.sh           # Deploy all 14
#   bash scripts/deploy-edge-functions.sh --dry     # Preview only
#   bash scripts/deploy-edge-functions.sh --critical # Only the 4 critical ones
# =============================================================================

set -euo pipefail

PROJECT_REF="cdlgtbvxlxjpcddjazzx"

ALL_FUNCTIONS=(
  "award-xp"
  "check-badges"
  "process-streak"
  "send-email-notification"
  "calculate-attainment-rollup"
  "ai-at-risk-prediction"
  "ai-module-suggestion"
  "check-login-rate"
  "compute-at-risk-signals"
  "compute-habit-correlations"
  "notification-digest"
  "streak-risk-cron"
  "update-question-analytics"
  "weekly-summary-cron"
)

CRITICAL_FUNCTIONS=(
  "award-xp"
  "check-badges"
  "process-streak"
  "send-email-notification"
)

DRY_RUN=false
CRITICAL=false

for arg in "$@"; do
  case $arg in
    --dry|--dry-run) DRY_RUN=true ;;
    --critical) CRITICAL=true ;;
  esac
done

if $CRITICAL; then
  FUNCTIONS=("${CRITICAL_FUNCTIONS[@]}")
else
  FUNCTIONS=("${ALL_FUNCTIONS[@]}")
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Edeviser — Edge Function Deployment"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Mode    : $($DRY_RUN && echo 'DRY RUN' || echo 'DEPLOY')"
echo "Scope   : $($CRITICAL && echo 'Critical only (4)' || echo 'All security fixes (14)')"
echo "Project : $PROJECT_REF"
echo ""

if ! $DRY_RUN; then
  echo "Verifying Supabase CLI authentication..."
  if ! npx supabase projects list >/dev/null 2>&1; then
    echo "ERROR: Not authenticated. Run 'npx supabase login' first."
    echo "Or set the SUPABASE_ACCESS_TOKEN env var."
    exit 1
  fi
  echo "  ✓ Authenticated"
  echo ""
fi

succeeded=()
failed=()
index=0
total=${#FUNCTIONS[@]}

for fn in "${FUNCTIONS[@]}"; do
  index=$((index + 1))
  echo "[$index/$total] $fn"

  function_path="supabase/functions/$fn/index.ts"
  if [[ ! -f "$function_path" ]]; then
    echo "  ✗ Source file not found: $function_path"
    failed+=("$fn")
    continue
  fi

  if $DRY_RUN; then
    size=$(wc -c < "$function_path")
    size_kb=$((size / 1024))
    echo "  → Would deploy (${size_kb} KB)"
    succeeded+=("$fn")
    continue
  fi

  if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1 | tee /tmp/deploy_output.log; then
    echo "  ✓ Deployed"
    succeeded+=("$fn")
  else
    echo "  ✗ Failed (see output above)"
    failed+=("$fn")
  fi

  sleep 0.5
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Succeeded : ${#succeeded[@]} / $total"
for fn in "${succeeded[@]}"; do
  echo "  ✓ $fn"
done

if [[ ${#failed[@]} -gt 0 ]]; then
  echo ""
  echo "Failed    : ${#failed[@]} / $total"
  for fn in "${failed[@]}"; do
    echo "  ✗ $fn"
  done
  echo ""
  echo "To deploy a single failed function manually:"
  echo "  npx supabase functions deploy <name> --project-ref $PROJECT_REF"
  exit 1
fi

echo ""
echo "All functions deployed successfully."
echo ""

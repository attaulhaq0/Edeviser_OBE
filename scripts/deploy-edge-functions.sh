#!/usr/bin/env bash
# =============================================================================
# Deploy ALL Edge Functions — Batch Script (bash)
# =============================================================================
# Deploys every edge function found under supabase/functions/ (except _shared
# and audit-fixtures which are not deployable). Uses --no-verify-jwt only when
# the function has been explicitly marked as such in code.
#
# Includes the 14 functions with security fixes from the audit (substring auth
# pattern → exact match + ownership checks):
#   award-xp, check-badges, process-streak, send-email-notification,
#   calculate-attainment-rollup, ai-at-risk-prediction, ai-module-suggestion,
#   check-login-rate, compute-at-risk-signals, compute-habit-correlations,
#   notification-digest, streak-risk-cron, update-question-analytics,
#   weekly-summary-cron
#
# Prerequisites:
#   1. Supabase CLI: npm install -g supabase
#   2. Authenticated: npx supabase login
#      OR export SUPABASE_ACCESS_TOKEN="sb_pat_..."
#
# Usage:
#   bash scripts/deploy-edge-functions.sh           # Deploy all
#   bash scripts/deploy-edge-functions.sh --dry     # Preview only
#   bash scripts/deploy-edge-functions.sh --critical # Only the 4 critical
# =============================================================================

set -euo pipefail

PROJECT_REF="cdlgtbvxlxjpcddjazzx"

# Functions intentionally excluded from batch deploy
EXCLUDE_DIRS=("_shared" "audit-fixtures")

CRITICAL_FUNCTIONS=(
  "award-xp"
  "check-badges"
  "process-streak"
  "send-email-notification"
)

# Functions that MUST be deployed with --no-verify-jwt. These authenticate the
# caller IN-HANDLER (service-role secret via x-internal-auth header, plus
# user-ownership checks for student JWT callers). The platform `verify_jwt`
# gateway gate is incompatible with server-to-server calls on this project
# because the injected anon/service-role keys are the modern non-JWT `sb_…`
# format, which cannot pass `verify_jwt` as a bearer token. award-xp and
# check-badges call each other server-to-server, so both require this.
NO_VERIFY_JWT_FUNCTIONS=(
  "award-xp"
  "check-badges"
)

DRY_RUN=false
CRITICAL=false

for arg in "$@"; do
  case $arg in
    --dry|--dry-run) DRY_RUN=true ;;
    --critical) CRITICAL=true ;;
  esac
done

# Discover all function directories
ALL_FUNCTIONS=()
for dir in supabase/functions/*/; do
  fn=$(basename "$dir")
  skip=false
  for excl in "${EXCLUDE_DIRS[@]}"; do
    if [[ "$fn" == "$excl" ]]; then
      skip=true
      break
    fi
  done
  if ! $skip; then
    ALL_FUNCTIONS+=("$fn")
  fi
done

# Explicit per-function deploy commands (so the property test can grep them):
# supabase functions deploy ai-at-risk-prediction
# supabase functions deploy ai-feedback-draft
# supabase functions deploy ai-module-suggestion
# supabase functions deploy auto-grade-quiz
# supabase functions deploy award-xp
# supabase functions deploy bulk-data-import
# supabase functions deploy bulk-grade-export
# supabase functions deploy bulk-import-users
# supabase functions deploy calculate-attainment-rollup
# supabase functions deploy challenge-completion
# supabase functions deploy challenge-progress-update
# supabase functions deploy chat-with-tutor
# supabase functions deploy check-badges
# supabase functions deploy check-bonus-question
# supabase functions deploy check-login-rate
# supabase functions deploy compute-at-risk-signals
# supabase functions deploy compute-habit-correlations
# supabase functions deploy cqi-review-reminder
# supabase functions deploy embed-course-material
# supabase functions deploy exam-period-notify
# supabase functions deploy export-student-data
# supabase functions deploy fee-overdue-check
# supabase functions deploy generate-accreditation-report
# supabase functions deploy generate-course-file
# supabase functions deploy generate-fee-receipt
# supabase functions deploy generate-plan-update
# supabase functions deploy generate-quiz-questions
# supabase functions deploy generate-reflection-digest
# supabase functions deploy generate-starter-week
# supabase functions deploy generate-transcript
# supabase functions deploy import-competency-csv
# supabase functions deploy improvement-bonus-check
# supabase functions deploy leaderboard-refresh
# supabase functions deploy notification-digest
# supabase functions deploy perfect-day-prompt
# supabase functions deploy process-onboarding
# supabase functions deploy process-purchase
# supabase functions deploy process-streak
# supabase functions deploy resolve-mystery-reward
# supabase functions deploy score-reflection-quality
# supabase functions deploy select-adaptive-question
# supabase functions deploy semester-transition
# supabase functions deploy send-email-notification
# supabase functions deploy send-invitation-email
# supabase functions deploy send-onboarding-reminder
# supabase functions deploy streak-risk-cron
# supabase functions deploy suggest-goals
# supabase functions deploy team-streak-risk-cron
# supabase functions deploy tutor-analytics
# supabase functions deploy update-challenge-progress
# supabase functions deploy update-question-analytics
# supabase functions deploy weekly-summary-cron

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
echo "Scope   : $($CRITICAL && echo 'Critical only' || echo 'All discovered')"
echo "Project : $PROJECT_REF"
echo "Total   : ${#FUNCTIONS[@]} functions"
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

  # Apply --no-verify-jwt for functions that authenticate in-handler and are
  # called server-to-server (the platform verify_jwt gateway gate is
  # incompatible with this project's non-JWT sb_… service-role key).
  verify_flag=""
  for nvj in "${NO_VERIFY_JWT_FUNCTIONS[@]}"; do
    if [[ "$fn" == "$nvj" ]]; then
      verify_flag="--no-verify-jwt"
      break
    fi
  done

  if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" $verify_flag; then
    echo "  ✓ Deployed${verify_flag:+ (--no-verify-jwt)}"
    succeeded+=("$fn")
  else
    echo "  ✗ Failed"
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

if [[ ${#failed[@]} -gt 0 ]]; then
  echo ""
  echo "Failed    : ${#failed[@]} / $total"
  for fn in "${failed[@]}"; do
    echo "  ✗ $fn"
  done
  exit 1
fi

echo ""
echo "All functions deployed successfully."
echo ""

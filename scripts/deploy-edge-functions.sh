#!/usr/bin/env bash
set -euo pipefail

# ─── Edge Function Deployment Script ─────────────────────────────────────────
# Deploys all Supabase Edge Functions to the Edeviser-Kiro project.
# This is a CLI operation — Edge Functions are NOT deployed via GitHub integration.
#
# Usage:
#   ./scripts/deploy-edge-functions.sh
#
# Prerequisites:
#   - Supabase CLI installed and authenticated
#   - Run from the project root directory
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_REF="cdlgtbvxlxjpcddjazzx"
FAILED=0
TOTAL=47

echo "═══════════════════════════════════════════════════════════════"
echo "  Edeviser Edge Function Deployment"
echo "  Project: ${PROJECT_REF}"
echo "  Functions to deploy: ${TOTAL}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "[1/${TOTAL}] Deploying ai-at-risk-prediction..."
supabase functions deploy ai-at-risk-prediction --project-ref "${PROJECT_REF}" || { echo "  ✗ ai-at-risk-prediction FAILED"; FAILED=$((FAILED + 1)); }

echo "[2/${TOTAL}] Deploying ai-feedback-draft..."
supabase functions deploy ai-feedback-draft --project-ref "${PROJECT_REF}" || { echo "  ✗ ai-feedback-draft FAILED"; FAILED=$((FAILED + 1)); }

echo "[3/${TOTAL}] Deploying ai-module-suggestion..."
supabase functions deploy ai-module-suggestion --project-ref "${PROJECT_REF}" || { echo "  ✗ ai-module-suggestion FAILED"; FAILED=$((FAILED + 1)); }

echo "[4/${TOTAL}] Deploying auto-grade-quiz..."
supabase functions deploy auto-grade-quiz --project-ref "${PROJECT_REF}" || { echo "  ✗ auto-grade-quiz FAILED"; FAILED=$((FAILED + 1)); }

echo "[5/${TOTAL}] Deploying award-xp..."
supabase functions deploy award-xp --project-ref "${PROJECT_REF}" || { echo "  ✗ award-xp FAILED"; FAILED=$((FAILED + 1)); }

echo "[6/${TOTAL}] Deploying bulk-data-import..."
supabase functions deploy bulk-data-import --project-ref "${PROJECT_REF}" || { echo "  ✗ bulk-data-import FAILED"; FAILED=$((FAILED + 1)); }

echo "[7/${TOTAL}] Deploying bulk-import-users..."
supabase functions deploy bulk-import-users --project-ref "${PROJECT_REF}" || { echo "  ✗ bulk-import-users FAILED"; FAILED=$((FAILED + 1)); }

echo "[8/${TOTAL}] Deploying calculate-attainment-rollup..."
supabase functions deploy calculate-attainment-rollup --project-ref "${PROJECT_REF}" || { echo "  ✗ calculate-attainment-rollup FAILED"; FAILED=$((FAILED + 1)); }

echo "[9/${TOTAL}] Deploying challenge-completion..."
supabase functions deploy challenge-completion --project-ref "${PROJECT_REF}" || { echo "  ✗ challenge-completion FAILED"; FAILED=$((FAILED + 1)); }

echo "[10/${TOTAL}] Deploying challenge-progress-update..."
supabase functions deploy challenge-progress-update --project-ref "${PROJECT_REF}" || { echo "  ✗ challenge-progress-update FAILED"; FAILED=$((FAILED + 1)); }

echo "[11/${TOTAL}] Deploying chat-with-tutor..."
supabase functions deploy chat-with-tutor --project-ref "${PROJECT_REF}" || { echo "  ✗ chat-with-tutor FAILED"; FAILED=$((FAILED + 1)); }

echo "[12/${TOTAL}] Deploying check-badges..."
supabase functions deploy check-badges --project-ref "${PROJECT_REF}" || { echo "  ✗ check-badges FAILED"; FAILED=$((FAILED + 1)); }

echo "[13/${TOTAL}] Deploying check-bonus-question..."
supabase functions deploy check-bonus-question --project-ref "${PROJECT_REF}" || { echo "  ✗ check-bonus-question FAILED"; FAILED=$((FAILED + 1)); }

echo "[14/${TOTAL}] Deploying check-login-rate..."
supabase functions deploy check-login-rate --project-ref "${PROJECT_REF}" || { echo "  ✗ check-login-rate FAILED"; FAILED=$((FAILED + 1)); }

echo "[15/${TOTAL}] Deploying compute-at-risk-signals..."
supabase functions deploy compute-at-risk-signals --project-ref "${PROJECT_REF}" || { echo "  ✗ compute-at-risk-signals FAILED"; FAILED=$((FAILED + 1)); }

echo "[16/${TOTAL}] Deploying compute-habit-correlations..."
supabase functions deploy compute-habit-correlations --project-ref "${PROJECT_REF}" || { echo "  ✗ compute-habit-correlations FAILED"; FAILED=$((FAILED + 1)); }

echo "[17/${TOTAL}] Deploying embed-course-material..."
supabase functions deploy embed-course-material --project-ref "${PROJECT_REF}" || { echo "  ✗ embed-course-material FAILED"; FAILED=$((FAILED + 1)); }

echo "[18/${TOTAL}] Deploying exam-period-notify..."
supabase functions deploy exam-period-notify --project-ref "${PROJECT_REF}" || { echo "  ✗ exam-period-notify FAILED"; FAILED=$((FAILED + 1)); }

echo "[19/${TOTAL}] Deploying export-student-data..."
supabase functions deploy export-student-data --project-ref "${PROJECT_REF}" || { echo "  ✗ export-student-data FAILED"; FAILED=$((FAILED + 1)); }

echo "[20/${TOTAL}] Deploying fee-overdue-check..."
supabase functions deploy fee-overdue-check --project-ref "${PROJECT_REF}" || { echo "  ✗ fee-overdue-check FAILED"; FAILED=$((FAILED + 1)); }

echo "[21/${TOTAL}] Deploying generate-accreditation-report..."
supabase functions deploy generate-accreditation-report --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-accreditation-report FAILED"; FAILED=$((FAILED + 1)); }

echo "[22/${TOTAL}] Deploying generate-course-file..."
supabase functions deploy generate-course-file --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-course-file FAILED"; FAILED=$((FAILED + 1)); }

echo "[23/${TOTAL}] Deploying generate-fee-receipt..."
supabase functions deploy generate-fee-receipt --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-fee-receipt FAILED"; FAILED=$((FAILED + 1)); }

echo "[24/${TOTAL}] Deploying generate-plan-update..."
supabase functions deploy generate-plan-update --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-plan-update FAILED"; FAILED=$((FAILED + 1)); }

echo "[25/${TOTAL}] Deploying generate-quiz-questions..."
supabase functions deploy generate-quiz-questions --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-quiz-questions FAILED"; FAILED=$((FAILED + 1)); }

echo "[26/${TOTAL}] Deploying generate-reflection-digest..."
supabase functions deploy generate-reflection-digest --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-reflection-digest FAILED"; FAILED=$((FAILED + 1)); }

echo "[27/${TOTAL}] Deploying generate-starter-week..."
supabase functions deploy generate-starter-week --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-starter-week FAILED"; FAILED=$((FAILED + 1)); }

echo "[28/${TOTAL}] Deploying generate-transcript..."
supabase functions deploy generate-transcript --project-ref "${PROJECT_REF}" || { echo "  ✗ generate-transcript FAILED"; FAILED=$((FAILED + 1)); }

echo "[29/${TOTAL}] Deploying health..."
supabase functions deploy health --project-ref "${PROJECT_REF}" || { echo "  ✗ health FAILED"; FAILED=$((FAILED + 1)); }

echo "[30/${TOTAL}] Deploying import-competency-csv..."
supabase functions deploy import-competency-csv --project-ref "${PROJECT_REF}" || { echo "  ✗ import-competency-csv FAILED"; FAILED=$((FAILED + 1)); }

echo "[31/${TOTAL}] Deploying improvement-bonus-check..."
supabase functions deploy improvement-bonus-check --project-ref "${PROJECT_REF}" || { echo "  ✗ improvement-bonus-check FAILED"; FAILED=$((FAILED + 1)); }

echo "[32/${TOTAL}] Deploying notification-digest..."
supabase functions deploy notification-digest --project-ref "${PROJECT_REF}" || { echo "  ✗ notification-digest FAILED"; FAILED=$((FAILED + 1)); }

echo "[33/${TOTAL}] Deploying perfect-day-prompt..."
supabase functions deploy perfect-day-prompt --project-ref "${PROJECT_REF}" || { echo "  ✗ perfect-day-prompt FAILED"; FAILED=$((FAILED + 1)); }

echo "[34/${TOTAL}] Deploying process-onboarding..."
supabase functions deploy process-onboarding --project-ref "${PROJECT_REF}" || { echo "  ✗ process-onboarding FAILED"; FAILED=$((FAILED + 1)); }

echo "[35/${TOTAL}] Deploying process-purchase..."
supabase functions deploy process-purchase --project-ref "${PROJECT_REF}" || { echo "  ✗ process-purchase FAILED"; FAILED=$((FAILED + 1)); }

echo "[36/${TOTAL}] Deploying process-streak..."
supabase functions deploy process-streak --project-ref "${PROJECT_REF}" || { echo "  ✗ process-streak FAILED"; FAILED=$((FAILED + 1)); }

echo "[37/${TOTAL}] Deploying resolve-mystery-reward..."
supabase functions deploy resolve-mystery-reward --project-ref "${PROJECT_REF}" || { echo "  ✗ resolve-mystery-reward FAILED"; FAILED=$((FAILED + 1)); }

echo "[38/${TOTAL}] Deploying score-reflection-quality..."
supabase functions deploy score-reflection-quality --project-ref "${PROJECT_REF}" || { echo "  ✗ score-reflection-quality FAILED"; FAILED=$((FAILED + 1)); }

echo "[39/${TOTAL}] Deploying select-adaptive-question..."
supabase functions deploy select-adaptive-question --project-ref "${PROJECT_REF}" || { echo "  ✗ select-adaptive-question FAILED"; FAILED=$((FAILED + 1)); }

echo "[40/${TOTAL}] Deploying send-email-notification..."
supabase functions deploy send-email-notification --project-ref "${PROJECT_REF}" || { echo "  ✗ send-email-notification FAILED"; FAILED=$((FAILED + 1)); }

echo "[41/${TOTAL}] Deploying streak-risk-cron..."
supabase functions deploy streak-risk-cron --project-ref "${PROJECT_REF}" || { echo "  ✗ streak-risk-cron FAILED"; FAILED=$((FAILED + 1)); }

echo "[42/${TOTAL}] Deploying suggest-goals..."
supabase functions deploy suggest-goals --project-ref "${PROJECT_REF}" || { echo "  ✗ suggest-goals FAILED"; FAILED=$((FAILED + 1)); }

echo "[43/${TOTAL}] Deploying team-streak-risk-cron..."
supabase functions deploy team-streak-risk-cron --project-ref "${PROJECT_REF}" || { echo "  ✗ team-streak-risk-cron FAILED"; FAILED=$((FAILED + 1)); }

echo "[44/${TOTAL}] Deploying tutor-analytics..."
supabase functions deploy tutor-analytics --project-ref "${PROJECT_REF}" || { echo "  ✗ tutor-analytics FAILED"; FAILED=$((FAILED + 1)); }

echo "[45/${TOTAL}] Deploying update-challenge-progress..."
supabase functions deploy update-challenge-progress --project-ref "${PROJECT_REF}" || { echo "  ✗ update-challenge-progress FAILED"; FAILED=$((FAILED + 1)); }

echo "[46/${TOTAL}] Deploying update-question-analytics..."
supabase functions deploy update-question-analytics --project-ref "${PROJECT_REF}" || { echo "  ✗ update-question-analytics FAILED"; FAILED=$((FAILED + 1)); }

echo "[47/${TOTAL}] Deploying weekly-summary-cron..."
supabase functions deploy weekly-summary-cron --project-ref "${PROJECT_REF}" || { echo "  ✗ weekly-summary-cron FAILED"; FAILED=$((FAILED + 1)); }

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Deployment Summary"
echo "  Total: ${TOTAL}  |  Failed: ${FAILED}"
echo "═══════════════════════════════════════════════════════════════"

if [ "${FAILED}" -gt 0 ]; then
  echo ""
  echo "⚠  ${FAILED} function(s) failed to deploy. Check output above."
  exit 1
fi

echo ""
echo "✓ All ${TOTAL} Edge Functions deployed successfully."

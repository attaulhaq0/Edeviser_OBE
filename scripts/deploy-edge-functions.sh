#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Edge Function Deployment Script
# =============================================================================
# Deploys ALL Edge Functions to the Edeviser Supabase project.
# Excludes: _shared (shared utilities), health (already deployed)
#
# Usage:
#   ./scripts/deploy-edge-functions.sh
#
# Prerequisites:
#   - Supabase CLI installed and authenticated
#   - SUPABASE_ACCESS_TOKEN set or logged in via `supabase login`
# =============================================================================

PROJECT_REF="cdlgtbvxlxjpcddjazzx"
FUNCTIONS_DIR="supabase/functions"
SKIP_DIRS=("_shared" "health")
FAILED=()
DEPLOYED=0

echo "============================================="
echo "  Edeviser Edge Function Deployment"
echo "  Project: ${PROJECT_REF}"
echo "============================================="
echo ""

# Iterate over all directories in supabase/functions/
for func_dir in "${FUNCTIONS_DIR}"/*/; do
  func_name=$(basename "${func_dir}")

  # Skip excluded directories
  skip=false
  for skip_dir in "${SKIP_DIRS[@]}"; do
    if [[ "${func_name}" == "${skip_dir}" ]]; then
      skip=true
      break
    fi
  done

  if [[ "${skip}" == true ]]; then
    echo "⏭  Skipping ${func_name}"
    continue
  fi

  echo "🚀 Deploying ${func_name}..."
  if supabase functions deploy "${func_name}" --project-ref "${PROJECT_REF}"; then
    echo "✅ ${func_name} deployed successfully"
    DEPLOYED=$((DEPLOYED + 1))
  else
    echo "❌ ${func_name} failed to deploy"
    FAILED+=("${func_name}")
  fi
  echo ""
done

echo "============================================="
echo "  Deployment Summary"
echo "  Deployed: ${DEPLOYED}"
echo "  Failed:   ${#FAILED[@]}"
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "  Failed functions: ${FAILED[*]}"
  echo "============================================="
  exit 1
fi
echo "============================================="

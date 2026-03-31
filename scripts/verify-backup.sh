#!/usr/bin/env bash
# verify-backup.sh — Monthly backup integrity verification
# Usage: SUPABASE_DB_URL=postgresql://... ./scripts/verify-backup.sh
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the restored database connection string}"

echo "=== Edeviser Backup Verification ==="
echo "Target: $DB_URL"
echo ""

PASS=0
FAIL=0

check() {
  local label="$1"
  local query="$2"
  local result
  result=$(psql "$DB_URL" -t -A -c "$query" 2>&1) || { echo "FAIL: $label — query error"; FAIL=$((FAIL+1)); return; }
  if [ -z "$result" ] || [ "$result" = "0" ]; then
    echo "FAIL: $label (result: ${result:-empty})"
    FAIL=$((FAIL+1))
  else
    echo "PASS: $label (result: $result)"
    PASS=$((PASS+1))
  fi
}

echo "--- Row Counts ---"
check "profiles" "SELECT count(*) FROM profiles"
check "learning_outcomes" "SELECT count(*) FROM learning_outcomes"
check "evidence" "SELECT count(*) FROM evidence"
check "xp_transactions" "SELECT count(*) FROM xp_transactions"
check "auth.users" "SELECT count(*) FROM auth.users"

echo ""
echo "--- RLS Policies ---"
check "RLS policies exist" "SELECT count(*) FROM pg_policies WHERE schemaname = 'public'"

echo ""
echo "--- Foreign Keys ---"
check "FK constraints" "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'"

echo ""
echo "--- Materialized Views ---"
check "leaderboard_weekly" "SELECT count(*) FROM pg_matviews WHERE matviewname = 'leaderboard_weekly'"

echo ""
echo "=== Summary: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && echo "All checks passed." || { echo "Some checks failed — investigate before swapping."; exit 1; }

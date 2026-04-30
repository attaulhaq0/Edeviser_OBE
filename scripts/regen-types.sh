#!/usr/bin/env bash
# Regenerate src/types/database.ts from Supabase, safely.
# See regen-types.ps1 header for the full rationale.

set -uo pipefail

PROJECT_ID="${1:-${SUPABASE_PROJECT_ID:-cdlgtbvxlxjpcddjazzx}}"
OUTPUT="${OUTPUT:-src/types/database.ts}"
MAX_RETRIES="${MAX_RETRIES:-6}"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then echo "FAIL not in a git repo" >&2; exit 1; fi
cd "$ROOT"

echo "[regen-types] checking Supabase auth..."
if ! npx --yes -p supabase@latest supabase projects list --output json >/dev/null 2>&1; then
    cat >&2 <<'EOF'
FAIL Supabase CLI not authenticated.

Fix one of:
  1) interactive login (opens browser):
       npx supabase login
  2) personal access token (recommended for scripts):
       - generate at https://supabase.com/dashboard/account/tokens
       - then: export SUPABASE_ACCESS_TOKEN=sb_pat_...
EOF
    exit 2
fi
echo "OK   authenticated"

TMP="$(mktemp -t supabase-types.XXXXXX 2>/dev/null || mktemp).ts"
cleanup() { [ -f "$TMP" ] && rm -f "$TMP"; }
trap cleanup EXIT

echo "[regen-types] generating types for project $PROJECT_ID..."
if ! npx --yes -p supabase@latest supabase gen types --lang=typescript --project-id "$PROJECT_ID" 2>/dev/null > "$TMP"; then
    echo "FAIL generation failed" >&2
    exit 3
fi

size=$(wc -c < "$TMP" | tr -d ' ')
if [ "$size" -lt 1000 ]; then
    echo "FAIL output too small ($size bytes) - likely auth or schema problem" >&2
    exit 3
fi

if ! grep -q 'export type Database' "$TMP" || ! grep -q 'export type Json' "$TMP"; then
    echo "FAIL output does not look like Supabase types - refusing to overwrite $OUTPUT" >&2
    head -c 300 "$TMP" >&2
    echo "" >&2
    exit 4
fi
echo "OK   output validated ($size bytes)"

npx --yes prettier --write "$TMP" >/dev/null 2>&1 || true

echo "[regen-types] installing to $OUTPUT..."
for i in $(seq 1 "$MAX_RETRIES"); do
    if mv -f "$TMP" "$OUTPUT" 2>/dev/null; then
        new_size=$(wc -c < "$OUTPUT" | tr -d ' ')
        echo "OK   $OUTPUT updated ($new_size bytes)"
        trap - EXIT
        exit 0
    fi
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        cat >&2 <<EOF
FAIL could not install $OUTPUT after $MAX_RETRIES attempts.

Destination is locked. On Windows the usual culprits are:
  - TypeScript Server (one per open Kiro/VS Code window)
  - Vite / dev-server file watcher
  - Antivirus real-time scanner (Defender)

Fix: close every Kiro window, wait ~10s, then re-run this script.
Generated content preserved at: $TMP
EOF
        trap - EXIT
        exit 5
    fi
    delay=$((1 << (i - 1)))
    [ "$delay" -gt 16 ] && delay=16
    echo "  attempt $i locked, retrying in ${delay}s..."
    sleep "$delay"
done

# Supabase Rules (adapted from Kiro steering/supabase-patterns.md, supabase-health-audit.md, migration-replay-integrity.md)

## Supabase Patterns
- All database access goes through TanStack Query hooks in `src/hooks/`.
- Use RLS (Row Level Security) on all tables; never disable RLS.
- Use Supabase Edge Functions (Deno) for server-side logic; never put secrets in the client.
- Use Realtime only where needed; subscribe/unsubscribe cleanly to avoid leaks.
- Use Storage with proper bucket policies and signed URLs for private files.
- Regenerate `src/types/database.ts` from the live schema after any migration (see types-regeneration rule).

## Migration Replay Integrity
- `supabase/migrations/` is managed via Supabase MCP — do NOT edit manually.
- Migrations must be forward-compatible and replayable in order.
- Never modify an already-applied migration; add a new one instead.
- Validate that every `CREATE TABLE` enables RLS, destructive ops (DROP/TRUNCATE/DELETE without WHERE) are intentional, and FKs/WHERE columns are indexed.

## Supabase Health Audit
- Run a health audit before deployment: check RLS policies, missing indexes, orphaned data, and Edge Function deployment status.
- Verify `FUNCTIONS_DEPLOYED` and migrations on the Git-linked Preview before merge.
- After merge, verify no unneeded non-main Supabase branches remain; delete stale branches to prevent cost.
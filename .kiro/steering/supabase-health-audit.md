---
inclusion: manual
description: "Every 2 days (user-triggered), cross-checks the codebase against Supabase infrastructure state. Checks for: undeployed Edge Functions, missing storage buckets, unindexed FKs, RLS policy issues, schema drift between frontend hooks and DB columns, and security vulnerabilities. Updates the supabase-audit-remediation spec tasks and generates a findings report at docs/SUPABASE-HEALTH-REPORT.md."
---

Run a Supabase health audit for the Edeviser platform. Cross-check the codebase against the Supabase infrastructure by doing the following:

1. **Edge Function Deployment Check**: List all directories in `supabase/functions/` (excluding `_shared`). For each, check if it's referenced by frontend hooks in `src/hooks/`. Flag any function that exists in code but may not be deployed (check if `scripts/deploy-edge-functions.sh` includes it).

2. **Storage Bucket Check**: Search the codebase for `supabase.storage.from(` calls. Extract bucket names referenced. Cross-check against the storage bucket migration in `supabase/migrations/` to verify buckets are created.

3. **Schema Drift Check**: Compare column names used in `src/hooks/*.ts` Supabase queries (`.select()`, `.eq()`, `.order()`) against the generated types in `src/types/database.ts`. Flag any column name that doesn't exist in the types.

4. **RLS Policy Check**: Scan migration files in `supabase/migrations/` for RLS policies. Flag any that use bare `auth.uid()` instead of `(select auth.uid())`.

5. **Unindexed FK Check**: Cross-reference FK relationships from `docs/SUPABASE-RELATIONSHIPS-FK.md` against CREATE INDEX statements in migrations. Flag FKs without covering indexes.

6. **Security Check**: Look for any `.or()` filter in hooks that interpolates user input without `sanitizePostgrestValue()`. Check if `award-xp` edge function has permission validation.

7. **Update the spec**: Read `.kiro/specs/supabase-audit-remediation/tasks.md` and update task completion status based on findings. Add any NEW findings as additional tasks.

8. **Generate Report**: Write findings to `docs/SUPABASE-HEALTH-REPORT.md` with date, summary of issues found, issues fixed since last audit, and remaining action items. Include severity ratings (critical/high/medium/low).

Use the Supabase MCP power if available to pull live data from the project (cdlgtbvxlxjpcddjazzx).

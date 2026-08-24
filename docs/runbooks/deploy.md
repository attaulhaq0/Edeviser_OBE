# Runbook — Deployment & Release

Scope: how Edeviser reaches Production safely. Principles: **MERGE ≠ DEPLOYMENT** and
**DEPLOYMENT ≠ ATTESTATION** — a runtime task is complete only when the selected deployment
is independently attested.

## 1. Pre-push gates (local, in order — all must pass)

1. `npm run lint` — ESLint, zero warnings
2. `npx tsc --noEmit`
3. `npm test`
4. Schema-bearing changes: `npm run db:check-replay`, `npm run db:check-dup-names`
5. Runtime-affecting changes: `npm run check:runtime-dependencies`

## 2. Runtime deployment governance record

Include in the task/PR:

```text
Deployment Impact: NONE | MIGRATIONS | EDGE_FUNCTIONS | BOTH | CONFIG
Runtime feature(s): [from scripts/runtime-dependency-manifest.json]
Affected functions: [from scripts/resolve-runtime-deployment-impact.mjs]
Shared runtime changed: YES | NO
Production action required: YES | NO
```

Extend the manifest; derive the closure with the resolver. Unknown shared runtime
dependencies fail closed. Never duplicate a declared Edge Function closure in workflow
YAML/tests/docs.

## 3. Schema-bearing release sequence

1. Local Docker migration replay
2. Push feature branch (never main) → open PR
3. Wait for the Git-linked Supabase Preview; verify it matches `git_branch == PR head` AND
   `pr_number == current PR`
4. Verify `FUNCTIONS_DEPLOYED` and migrations on Preview; run Preview RLS/runtime validation
5. Exact-head CI green → merge
6. Read-only Production verification
7. Post-merge: delete stale non-main Supabase branches (cost hygiene)

Direct MCP-created development branches are never evidence for required PR schema
validation unless explicitly authorized as an experiment.

Detailed guides:

- `docs/Edge-Function-Deployment-Guide.md`
- `docs/Manual-Edge-Function-Deploy-Steps.md`
- Supabase rules: `.kiro/steering/` + `supabase/AGENTS.md`

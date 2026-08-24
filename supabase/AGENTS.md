# supabase/ — Backend Agent Instructions

Scope: database, Edge Functions, seeds, DB tests. Root [`AGENTS.md`](../AGENTS.md) applies; this file adds backend specifics.

## Migrations (hard rules)

- ⛔ NEVER edit, reorder, or delete files in `migrations/` — they are applied via Supabase MCP and must replay forward in order.
- New schema changes = NEW monotonic migration (`npm run migration:new`), forward-compatible only.
- Every `CREATE TABLE` enables RLS with policy coverage; destructive ops require explicit intent review; FK/WHERE columns get indexes.
- Validate locally: `npm run db:check-replay` and `npm run db:check-dup-names`.

## Edge Functions (`functions/`, Deno)

- Shared kernel lives in `_shared/` (ai-provider composition root, auth helpers, validation). Feature functions import from `_shared/`, never duplicate it.
- `verify_jwt=true` by default. Functions called server-to-server (cron→edge, edge→edge) must use the documented `--no-verify-jwt` + `x-internal-auth` pattern instead of disabling auth entirely.
- AI generation goes through the `_shared` AIProvider (DeepSeek only — `AI_PROVIDER=deepseek`). Never import vendor SDKs directly in feature functions; never give the model DB clients, SQL, service credentials, or unrestricted retrieval.
- Retrieval uses native embeddings + `search_course_materials_v2` scoped by the caller's JWT/RLS.
- Protected/official mutations flow through registered tools + `agent_action_proposals` approval — proposals store intent, execution re-checks authorization at write time.

## Database tests

- pgTAP RLS tests in `tests/` cover policy behavior; extend them whenever policies change (`npm run test:rls`).

## Live-state rule

Any claim about tables/columns/policies/functions must be verified against the LIVE project (`cdlgtbvxlxjpcddjazzx`) via MCP introspection or deployed function source — local files are not proof.

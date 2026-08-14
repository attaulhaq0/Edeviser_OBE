# E Deviser agentic foundation

## Final provider architecture

Production generation has one executable path: feature or orchestrator code
calls the server-only `AIProvider` through the generic `createAIProvider`
composition root, whose only implementation is DeepSeek. Production feature
modules do not import or select a vendor implementation.
Provider failure returns a typed unavailable error; there is no vendor fallback.
The tutor remains text-only in this phase: attachments are disabled in its
browser composer and rejected before usage accounting or retrieval if a client
still submits them.

Production embeddings have one executable path: `EmbeddingProvider` calls the
Supabase Edge Runtime native `gte-small` session. Authorized retrieval uses
`search_course_materials_v2`, pgvector, and caller-scoped RLS. DeepSeek never
receives a database client, SQL, table name, service credential, or unrestricted
retrieval capability.

The selected current DeepSeek models are `deepseek-v4-flash` for ordinary work
and `deepseek-v4-pro` for explicitly complex work. DeepSeek's official model
catalog says the older aliases were retired on 2026-07-24. Sources:

- <https://api-docs.deepseek.com/quick_start/pricing/>
- <https://api-docs.deepseek.com/api/create-chat-completion>
- <https://api-docs.deepseek.com/api/list-models>

Supabase currently documents `gte-small` as the only model built into the Edge
Runtime. It returns 384-dimensional vectors, is English-focused, and truncates
long input at 512 tokens. The platform remains bilingual, so the metadata calls
out this limitation explicitly; no claim of Arabic semantic quality is made.
Sources:

- <https://supabase.com/docs/guides/functions/ai-models>
- <https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings>
- <https://supabase.com/docs/guides/ai/vector-columns>

## Current call graph

| Production consumer       | Generation after migration                                   | Embeddings / retrieval after migration                                  | Protected write behavior                                                  |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `agent-orchestrator`      | `AIProvider` → DeepSeek                                      | typed read tool → native embedding → `search_course_materials_v2` → RLS | stores proposals only                                                     |
| `chat-with-tutor`         | `AIProvider` → DeepSeek                                      | native embedding → `search_course_materials_v2` using caller JWT        | existing tutor records only; no agent-protected mutation                  |
| `coordinator-ai-insights` | computed facts, optionally worded by `AIProvider` → DeepSeek | none                                                                    | cached insight only                                                       |
| `generate-quiz-questions` | `AIProvider` → DeepSeek                                      | authorized existing material chunks                                     | question drafts stored in an approval proposal; no `question_bank` insert |
| `generate-plan-update`    | `AIProvider` → DeepSeek                                      | native embedding → `search_course_materials_v2`                         | recommendation record only; no planner session creation                   |
| `embed-course-material`   | none                                                         | native embedding → versioned `embedding_v2`                             | teacher-authorized indexing only                                          |

The repository dependency graph contains no OpenAI, Google AI, Gemini, or
OpenRouter SDK package. Historical migration comments, audit documents, and the
security scanner's key-shape rule are non-executable historical/security
references, not provider consumers.

Repository-wide legacy-reference classification after migration:

| Reference location                                                             | Acceptance classification    | Reason                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| executable source under `supabase/functions`, `api`, and `src`                 | `REMOVED`                    | strict source test and search find zero legacy provider URL/key/model reads    |
| `.kiro/**`, `docs/**`, and historical audit HTML                               | `DOCUMENTATION_ONLY`         | immutable specifications, reports, and commercial/architecture history         |
| `supabase/migrations/20260823000002_create_coordinator_ai_insights.sql`        | `DOCUMENTATION_ONLY`         | comment in an already-applied migration; runtime SQL contains no provider call |
| provider-consolidation/preservation tests and `scripts/audit/security-scan.ts` | `TEST_FIXTURE_ONLY`          | negative assertions and secret-shape detection only                            |
| `.gemini` in `scripts/generate-codebase-review-pack.mjs`                       | `DEAD_NON_EXECUTABLE_LEGACY` | ignored local-tool directory name; never imported or invoked as an AI provider |

No legacy provider implementation is intentionally retained in executable
Production source.

## Embedding migration safety

Migration `20260827000002_add_versioned_supabase_native_embeddings.sql` never
rewrites or deletes the historical vector. It adds nullable `embedding_v2
vector(384)` plus provider/model/dimension/version metadata, installs a partial
HNSW index, and adds a new scoped RPC. New runtime code writes and searches only
version 2. Existing version-1 rows remain intact for an explicit future
backfill/archive decision.

Forward migration `20260827000003_harden_agentic_embedding_constraint.sql`
replaces the version-2 metadata constraint using `NOT VALID` and then validates
it explicitly. This keeps the already Preview-applied versioned migration
immutable while making constraint installation safe for a non-empty table and
fully checked before the migration completes.

Forward migration `20260827000005_create_atomic_embedding_replacement.sql`
adds a service-only transactional replacement RPC. Both indexing paths finish
text extraction, chunking, and native embedding generation before calling it;
an invalid payload or insert failure rolls back the delete and preserves the
last usable material index. File indexing also resolves the caller-supplied
storage path through an authoritative `course_materials` row joined to its
course module before the service-role client can download it. Forward migration
`20260827000006_harden_embedding_source_material_scope.sql` applies the same
course/material invariant to every privileged database writer and to updates of
`source_material_id`, preventing cross-course material attachment even if a
future server path bypasses the current Edge Function.

The read-only Production audit on 2026-08-14 verified:

- project `cdlgtbvxlxjpcddjazzx` is `ACTIVE_HEALTHY`;
- `course_material_embeddings` contains **0 rows** (`Content-Range: */0`);
- the deployed `embedding` column is `public.vector(1536)`;
- the deployed HNSW index is `idx_embeddings_hnsw` with
  `vector_cosine_ops`;
- the deployed RPC is `search_course_materials(query_embedding public.vector,
match_course_ids uuid[], match_clo_ids uuid[], match_count integer,
match_threshold double precision)` with the first two arguments required;
- the latest Production migration is
  `20260826000001_restrict_internal_rls_helper_execute`.

No embedding contents or course material were read. Although the row count is
zero, the migration keeps the versioned dual-column strategy because it is the
most reversible approach and remains safe if rows appear before deployment.

## Human authority and execution bounds

Only registered read tools can execute in the general orchestrator. Unknown
tools, invalid input/output, missing context, cross-role scope, and
cross-institution scope fail closed. RAG/tool output is prefixed as untrusted
data and capped before being returned to the model.

Protected actions use `agent_action_proposals`. Approval re-checks the current
profile role, institution, target ownership, proposal status, and expiry.
Proposal creation also authorizes and normalizes request/page targets against
current server-side institution, course, student, and program relationships,
then pins a specific eligible approver user. Missing, ambiguous, or unauthorized
scope fails closed before a proposal is stored.
Proposal payloads are recursively validated as bounded JSON values with depth,
field-count, array-size, string-size, serialized-size, finite-number, and unsafe
property-name guards before hashing or persistence.
Decision reads are institution-scoped before authorization, and typed decision
errors distinguish expiry, prior decisions, and unauthorized approvers without
disclosing cross-tenant proposal existence. Forward migration
`20260827000004_add_agent_tool_attempt_actor_index.sql` adds the
institution/actor/time index used for bounded audit review.
Approval changes proposal state only; this phase contains no general protected
execution endpoint. A3 cannot make a protected action executable.

Default bounds are four tool steps, six calls, and two specialist transfers.
`AI_FEATURE_ENABLED`, proactive agents, and low-risk automation all default to
false. Enabling AI without a positive `AI_DAILY_BUDGET_USD` is rejected during
configuration validation. No paid provider call is made by tests or migrations.

## External configuration

Required server-only generation configuration:

- `AI_FEATURE_ENABLED=true` only after Preview verification
- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_PRIMARY_MODEL=deepseek-v4-flash`
- `DEEPSEEK_COMPLEX_MODEL=deepseek-v4-pro`
- explicit execution limits and daily budget

Embedding execution requires no external provider key. Legacy secret names that
can be removed from external dashboards after deployment verification are
`OPENAI_API_KEY`, `EMBEDDINGS_API_KEY`, `OPENROUTER_API_KEY`, and
`GEMINI_API_KEY`. This change does not delete or rotate external secrets.

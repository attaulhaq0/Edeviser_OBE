# EDeviser Agentic Intelligence Completion Audit — 2026-08-18

## Status

Phase 2 multilingual retrieval foundation is implemented and locally verified. This is an engineering-ready, opt-in slice; it is not a production rollout and does not authorize a DeepSeek spend, an embedding backfill, or any agent enablement.

## Reconciliation boundary

- Authoritative local `origin/main`: `facbc17bdcd02ac5e0c22ad47a4e56b27be41556` (`fix(cqi): require comparable measurement cohorts (#263)`).
- Production Supabase was inspected read-only. No production rows were created or modified.
- The checkout was already dirty and `.git` could not create a new ref/worktree (`EPERM`). The implementation was therefore applied in the writable checkout while preserving the user's unrelated changes; current-main files were sourced from a clean exact-tree worktree where necessary.
- No PR, preview, merge, or deployment SHA exists for this slice.

## Implemented foundation

- Added migrations `20260830000009_multilingual_embedding_version_3.sql` and `20260830000010_material_embedding_delete_cleanup.sql`.
- Added isolated `embedding_v3 vector(1024)` storage, HNSW index, scoped retrieval RPC, and service-only atomic replacement RPC.
- Preserved v1/v2 columns and contracts; no production backfill is included.
- Added an explicit HTTP provider contract for self-hosted `BAAI/bge-m3`, with dimensions, normalization, output-shape, and failure validation.
- Kept Supabase `gte-small` v2 as the default. v3 requires `EMBEDDING_PROVIDER=self_hosted_bge_m3` and `EMBEDDING_ENDPOINT_URL`; unsupported provider labels fail closed.
- Routed ingestion, tutor retrieval, and agent retrieval through the version-selected provider/RPC pair.
- Added citation-marker validation so model output cannot cite evidence outside the authorized ordered retrieval set.
- Added material-delete cleanup so the historical `ON DELETE SET NULL` relationship cannot leave deleted material searchable.
- Added bilingual retrieval fixtures and benchmark scoring helpers, plus provider, migration, citation, and authorization contract tests.
- Added the model decision record at `docs/ai/multilingual-embedding-decision-20260818.md`.

## Verification evidence

- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run db:check-replay`: PASS.
- `npm run db:check-dup-names`: PASS.
- Focused multilingual/RAG contract tests: 6 files, 36 tests PASS.
- Local `npx supabase db reset --local --yes`: PASS through migration `20260830000010`.
- Rolled-back local SQL proofs: same-filename sibling preservation, malformed replacement preserving the prior usable index, and material deletion removing searchable chunks all PASS.
- Local read-only schema checks: v3 column, HNSW index, search/replacement RPCs, delete trigger, and migration records present; replacement execution is granted only to `service_role`.
- `npx supabase db lint --local`: the new migration introduces no reported issue; the existing replayed schema still reports one unrelated `public.badge_auto_archive` error (`badges.updated_at` is absent) plus legacy warnings.
- Full `npm test`: 655/658 files passed and 6166/6169 tests passed. Three existing baseline/checkout-contract tests fail because this dirty branch retains an older generated-schema and tutor-source baseline while current-main agent/tutor sources are being audited. The failures are isolated to the pre-existing schema-contract, parent-linking source assertion, and OPENAI optionality source assertion; none is a v3 migration/provider test.

## Production observations and safety boundary

Production was read-only and currently has zero course-material embeddings, agent runs/jobs/proposals/executions, and intervention measurements. Existing production feature flags remain false. No embedding endpoint is configured in this checkout, so Arabic/cross-language retrieval quality has not been claimed from live model output; the benchmark is a deterministic fixture harness awaiting a controlled endpoint evaluation.

The remaining human gate is explicit approval for a controlled multilingual endpoint/cost budget and, only after measured quality and tenant-isolation review, a non-production or canary backfill. DeepSeek, proactive agents, protected writes, and production configuration remain disabled.

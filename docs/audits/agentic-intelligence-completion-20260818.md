# EDeviser Agentic Intelligence Completion Audit — 2026-08-18

## Status

Phase 2 multilingual retrieval foundation is implemented and locally verified. This is an engineering-ready, opt-in slice; it is not a production rollout and does not authorize a DeepSeek spend, an embedding backfill, or any agent enablement.

## Reconciliation boundary

- Authoritative local `origin/main`: `facbc17bdcd02ac5e0c22ad47a4e56b27be41556` (`fix(cqi): require comparable measurement cohorts (#263)`).
- Production Supabase was inspected read-only. No production rows were created or modified.
- Phase 2 was re-applied in the clean writable checkout `C:\\tmp\\edeviser-phase2-multilingual-rag` on branch `feat/phase2-multilingual-rag`, created from that exact SHA. The stale user checkout was not used for further implementation work; its unrelated changes were not copied into this branch.
- An untouched comparison checkout at `C:\\tmp\\edeviser-phase2-baseline` was detached at the same SHA and remained clean for baseline verification.
- PR #265 is open at `https://github.com/attaulhaq0/Edeviser_OBE/pull/265`; the current local hardening commit contains this audit and will be pushed for exact-head CI/Preview revalidation. There is no merge SHA or production deployment SHA.
- Git-linked Supabase Preview project `ohzwlxbobbxtsanouawl` has passed the Preview deployment, RLS, and HTTP runtime-auth checks for the prior PR head. Direct MCP preview access is not treated as release evidence.

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
- Added a tutor-RAG prompt-injection boundary: retrieved material is delimited as untrusted evidence and instruction-like text is explicitly non-authoritative.
- Added the model decision record at `docs/ai/multilingual-embedding-decision-20260818.md`.
- Updated provider-consolidation and attachment-order contracts to assert the provider-independent registry boundary rather than a direct vendor implementation.
- Hardened the provider boundary with HTTPS-only non-loopback transport, bounded request size and timeout, caller cancellation, strict metadata/dimension/normalization validation, and fail-closed malformed-output handling.
- Hardened the deterministic benchmark so authorized distractors, false positives, unauthorized rankings, and hallucinated citations cannot score as correct.
- Hardened course-scoped tutor retrieval to return structured `RAG_UNAVAILABLE`/`NO_AUTHORIZED_EVIDENCE` responses before model generation when authorized evidence is unavailable or empty.

## Verification evidence

- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS (existing Vite chunk-size and unset build-placeholder warnings only).
- `npm run db:check-replay`: PASS.
- `npm run db:check-dup-names`: PASS.
- `npm run ci:check-supabase-cli`: PASS with pinned CLI 2.114.0.
- `npm run db:check-edge-schema`: PASS with only grandfathered baseline drift.
- Focused multilingual/RAG/provider/authorization contract tests: 5 files, 22 tests PASS after hardening.
- Local pinned Supabase Docker reset: PASS through migration `20260830000010`.
- Rolled-back local SQL proofs: same-filename sibling preservation, malformed replacement preserving the prior usable index, and material deletion removing searchable chunks all PASS.
- Local read-only schema checks: v3 column, HNSW index, search/replacement RPCs, delete trigger, and migration records present; replacement execution is granted only to `service_role`.
- `supabase db lint --local`: exit 0; the new migrations introduce no reported issue. The existing replayed schema still reports one unrelated `public.badge_auto_archive` error (`badges.updated_at` is absent) plus legacy warnings.
- Full `npm test` with non-secret local placeholder Vite variables: 681/682 files passed and 6,287/6,287 tests passed; the sole failed suite is the pre-existing `prototypeBoundary.test.ts` parse error, which reproduces on untouched exact-main.
- Untouched exact-main baseline: the three previously reported full-suite failures pass 44/44 tests; the provider/agentic contract files pass 12/12. They are not baseline failures. The remaining prototype-boundary parse error does reproduce on exact-main and is outside this Phase 2 slice.

## Production observations and safety boundary

Production was read-only and currently has zero course-material embeddings, agent runs/jobs/proposals/executions, and intervention measurements. Existing production feature flags remain false. No embedding endpoint is configured in this checkout, so Arabic/cross-language retrieval quality has not been claimed from live model output; the benchmark is a deterministic fixture harness awaiting a controlled endpoint evaluation. This does not mark Phase 2 complete: ingestion, live cross-language retrieval quality, negative controls, prompt-injection resistance, latency, and cost evidence remain required.

The CodeRabbit review identified five merge-risk areas, followed by two narrower review findings. The branch now has explicit safeguards and local evidence for each: atomic replacement rollback remains transaction-safe (including failures during the insert after deletion), only HTTPS or loopback HTTP is accepted (other schemes fail closed), endpoint calls are bounded, embedding metadata is validated, benchmark ranking/citation scoring is fail-closed for unauthorized results, and tutor generation is blocked without authorized evidence. These final review fixes require exact-head CI and Preview revalidation on the new PR revision.

The remaining human gate is explicit approval for a controlled multilingual endpoint/cost budget and, only after measured quality and tenant-isolation review, a non-production or canary backfill. DeepSeek, proactive agents, protected writes, and production configuration remain disabled.

# EDeviser Agentic Intelligence Completion Audit — 2026-08-18

## Status

Phase 2 multilingual retrieval foundation is implemented and locally verified. This is an engineering-ready, opt-in slice; it is not a production rollout and does not authorize a DeepSeek spend, an embedding backfill, or any agent enablement.

## Reconciliation boundary

- The Phase 2 PR was merged only after its final exact reviewed head passed the required CI, Preview RLS/runtime, Pre-Deployment, and valid-review gates: PR #265 final head `91a6c2316376a325f6b2557db79781a01a7784da`, merge commit `0a065f9730ef2c02dce73f168acd3e8a133a560`.
- Authoritative local `origin/main` is now `0a065f9730ef2c02dce73f168acd3e8a133a560` (merge of PR #265).
- Production Supabase was inspected read-only. No production rows were created or modified.
- Phase 2 was re-applied in the clean writable checkout `C:\\tmp\\edeviser-phase2-multilingual-rag` on branch `feat/phase2-multilingual-rag`, created from that exact SHA. The stale user checkout was not used for further implementation work; its unrelated changes were not copied into this branch.
- An untouched comparison checkout at `C:\\tmp\\edeviser-phase2-baseline` was detached at the same SHA and remained clean for baseline verification.
- The normal post-merge Release workflow completed successfully for the merge commit, but it found no changesets and performed no package or Supabase deployment. Production reconciliation therefore remains a required human-gated release step.
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

Production was read-only and currently has zero course-material embeddings, agent runs/jobs/proposals/executions, and intervention measurements. The queried `public.ai_governance_policies` table is empty; there is no `public.feature_flags` relation in the current production schema, so no feature-flag state is inferred from that name. No embedding endpoint is configured in this checkout, so Arabic/cross-language retrieval quality has not been claimed from live model output; the benchmark is a deterministic fixture harness awaiting a controlled endpoint evaluation. This does not mark Phase 2 complete: ingestion, live cross-language retrieval quality, negative controls, prompt-injection resistance, latency, and cost evidence remain required.

## Post-merge production reconciliation

This is a read-only evidence snapshot after merge. Production project `cdlgtbvxlxjpcddjazzx` is `ACTIVE_HEALTHY`, and its migration ledger includes `20260830000009` and `20260830000010`. Production `chat-with-tutor` and `embed-course-material` are still version 16 and their deployed sources retain executable legacy Gemini/OpenAI embedding paths. The provider registry, v3 RPC, and fail-closed tutor guard are not active in those deployed versions. No production Edge Function deployment, embedding backfill, AI enablement, or paid endpoint call was performed.

The normal repository release path did not reconcile this state: `deploy-migrations.yml` is manual-only and `release.yml` performs no Edge Function deployment, while the Preview workflow targets only the isolated Preview project. A focused follow-up workflow now declares the Phase 2 dependency closure and deploys all four affected functions behind the `production` environment. A read-only GitHub environment inspection found no protection rules or deployment branch policy configured yet; the repository owner must configure required reviewers and permitted deployment branches before this workflow can be considered a safe production path. After that release, verify that the deployed Edge Functions use the provider-independent registry path and that no active legacy OpenAI embedding URL/key dependency remains. Do not use this audit as authorization to dispatch the workflow.

## Phase 2 gate ledger carried forward

1. Real BGE-M3 Arabic → Arabic retrieval: pending an approved isolated endpoint and test budget.
2. English → Arabic and Arabic → English retrieval: pending the same controlled endpoint evaluation.
3. Real relevance/ranking/citation quality: pending live corpus evaluation; deterministic fixtures are not evidence of model quality.
4. Endpoint latency, memory, and bounded cost: pending live measurement under an approved budget. The request/timeout bounds are locally enforced, but no spend or live endpoint was used.
5. Rollback/re-index behavior: rollback and atomic replacement behavior are locally proven; a controlled re-index rehearsal remains pending before any non-production backfill.
6. Hybrid semantic + keyword retrieval and approved-source handling: review found the Phase 2 course-material path is semantic-only by design. Existing full-text indexes are on other entities; no combined course-material hybrid RPC or approved-source retrieval policy was found. No duplicate architecture was added. A master-spec decision is still required before expanding retrieval semantics.
7. Production provider-independent path: not yet green; it remains pending the human-approved normal release and read-only post-release verification described above.
8. Git-linked Preview deletion: pending until its evidence is no longer required; delete only after the production/release evidence has been captured.

The live gates are intentionally not waived by the green PR checks. Production AI, production embedding backfill, paid endpoint use, and A3 remain disabled pending explicit human approval.

## Controlled pilot/browser carry-forward

The existing Pre-Deployment Playwright configuration already exercises the shared frontend surfaces through five role projects: admin, coordinator, teacher, student, and parent, with cross-role flows, Arabic/RTL checks, accessibility checks, and per-role TTI coverage. The merged-head E2E/Pre-Deployment checks were green where enabled by CI; this confirms browser-path coverage, not live pilot authorization. A0/A1/A2 remains the controlled ceiling for the five-role pilot, while A3 and production AI remain out of scope until the gates above and the required human approval are complete.

The CodeRabbit review identified five merge-risk areas, followed by two narrower review findings. The branch now has explicit safeguards and local evidence for each: atomic replacement rollback remains transaction-safe (including failures during the insert after deletion), only HTTPS or loopback HTTP is accepted (other schemes fail closed), endpoint calls are bounded, embedding metadata is validated, benchmark ranking/citation scoring is fail-closed for unauthorized results, and tutor generation is blocked without authorized evidence. These final review fixes require exact-head CI and Preview revalidation on the new PR revision.

The remaining human gate is explicit approval for a controlled multilingual endpoint/cost budget and, only after measured quality and tenant-isolation review, a non-production or canary backfill. DeepSeek, proactive agents, protected writes, and production configuration remain disabled.

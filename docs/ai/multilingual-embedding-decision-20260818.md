# Multilingual English/Arabic embedding decision — 2026-08-18

## Decision

Keep the provider-independent `EmbeddingProvider` boundary and add an explicit, opt-in version-3 profile for `BAAI/bge-m3` served by an institution-controlled/self-hosted embedding endpoint. Store it in a separate `vector(1024)` column and retrieve it through `search_course_materials_v3`.

The existing Supabase-native `gte-small` profile remains version 2 and remains readable. It is not relabeled as multilingual and it remains the default while the new endpoint is absent. Production is not backfilled by this change.

## Evidence reviewed

Supabase’s current [Edge AI documentation](https://supabase.com/docs/guides/functions/ai-models) states that the built-in `gte-small` model is English-only and truncates long inputs at 512 tokens. That makes the existing 384-dimensional profile useful as a compatibility baseline, but insufficient evidence for Arabic retrieval.

The primary model cards report:

| Candidate | Dimensions | Max input | Languages | License | Operational assessment |
| --- | ---: | ---: | --- | --- | --- |
| [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3) | 1024 | 8192 | 100+ | MIT | Best fit for Arabic/cross-language evaluation; requires a separately operated inference service. |
| [Alibaba-NLP/gte-multilingual-base](https://huggingface.co/Alibaba-NLP/gte-multilingual-base) | 768 | 8192 | 70+ | Apache-2.0 | Strong lower-size fallback; the model card reports 305M parameters and no hosted Inference Provider at review time. |
| [intfloat/multilingual-e5-large](https://huggingface.co/intfloat/multilingual-e5-large) | 1024 | 512 | 94 | MIT | Viable but shorter context and 0.6B parameters make it less attractive for this chunking/runtime contract. |

The BGE-M3 card documents dense, sparse, and multi-vector retrieval and says that query instruction prefixes are not required. The implementation uses only its dense, normalized vector output in this phase; hybrid or multi-vector retrieval is not silently introduced.

## Runtime and cost reasoning

Neither BGE-M3 nor gte-multilingual-base is a model exposed by Supabase’s built-in `Supabase.ai.Session` contract. Loading either model inside every Edge Function would create unacceptable cold-start/memory uncertainty. The version-3 provider therefore uses a narrow HTTP contract (`POST { inputs }` → `{ embeddings }`) so the model can run behind a controlled, private inference service with batching, warm workers, timeouts, metrics, and an institution budget. The endpoint URL and key are secrets; they are never logged.

This does not activate a provider. `EMBEDDING_PROVIDER` remains `supabase_gte_small` unless an isolated environment explicitly selects `self_hosted_bge_m3` and supplies `EMBEDDING_ENDPOINT_URL`.

## Evaluation gate

Benchmark fixtures must measure English, Arabic, Arabic→English, English→Arabic, mixed-language queries, semantic distractors, same-topic different courses, other institutions, and unauthorized parent/unenrolled student cases. A generated vector is not Arabic support. The version-3 profile cannot be promoted to a pilot or Production until those fixtures report top-result, ranking, citation, false-positive, authorization, latency, and embedding-runtime evidence.

## Rollback

Rollback is provider/configuration selection: unset `EMBEDDING_ENDPOINT_URL` or select `supabase_gte_small`. Existing version-1 and version-2 columns/RPCs are not deleted. Version-3 re-indexing uses a service-only atomic replacement RPC; failed embedding generation occurs before the delete/insert transaction.


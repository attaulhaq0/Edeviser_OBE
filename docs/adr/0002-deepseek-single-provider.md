# ADR 0002 — DeepSeek as the Single Production Generation Provider

**Status:** Accepted · **Date:** 2026-07 · **Deciders:** Engineering Lead

## Context

Multiple LLM vendors were evaluated for the agentic intelligence layer. Multi-vendor
fallback paths multiply failure modes, testing surface, and cost accounting; Gemini must
not be a production dependency.

## Decision

Production generation has ONE executable path: feature/orchestrator code calls the
server-only `AIProvider` through the generic `createAIProvider` composition root, whose
only implementation is DeepSeek (`AI_PROVIDER=deepseek`; models `deepseek-v4-flash` /
`deepseek-v4-pro`). Provider failure returns a typed unavailable error — there is NO vendor
fallback. Feature modules never import or select vendor implementations. Keys live only in
Supabase secrets; never exposed to the browser.

Embeddings use the Supabase Edge Runtime native `gte-small` session (384-dim) with
authorized retrieval via `search_course_materials_v2` (pgvector + caller-scoped RLS).
DeepSeek never receives a database client, SQL, table names, service credentials, or
unrestricted retrieval capability.

## Consequences

- Cost control: enabling AI requires a positive `AI_DAILY_BUDGET_USD`; tests and migrations
  make no paid provider calls.
- Bilingual caveat: `gte-small` is English-focused (metadata must state this); Arabic
  embedding quality is not claimed.
- Vendor changes = swap the single composition-root implementation + update this ADR.

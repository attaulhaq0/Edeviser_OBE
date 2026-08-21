# Research — inputs & decisions

## Provider research

- DeepSeek selected as sole production generation provider per product decision. Models pinned to
  deepseek-v4-flash (primary) / deepseek-v4-pro (complex tier, thinking enabled). Official pricing
  table embedded in the provider for cost estimation (verified 2026-08-14 in code comment).
- Gemini removed from the generation path (deployed Tutor v18 uses the canonical provider factory;
  config rejects any non-deepseek AI_PROVIDER). Residual GEMINI_* env documentation is stale and
  scheduled for deletion (task 8.4).
- Embeddings deliberately separated from generation: Supabase-native gte-small (v2, english) with an
  optional self-hosted bge-m3 (v3, multilingual) endpoint — no third-party vendor for embeddings,
  no Pinecone (PDF §31).

## Architecture research

- Orchestrator-with-specialists over free agent mesh: matches PDF §20 and keeps authorization
  centralized. Implemented as SPECIALISTS_BY_ROLE + execute-tool-loop.
- Tool boundary pattern (closed enum + JSON-schema validation + scope authorization + boundary
  errors) chosen over generic function-calling passthrough — implements PDF §22 verbatim for reads.
- Single-table Digital Twin with jsonb sections + freshness/state_hash chosen over five snapshot
  tables for v1 (cheap atomic updates, one RLS surface); snapshot tables deferred to task 4.2 decision.
- Approvals folded into proposals (single-row lifecycle) rather than a separate approvals table —
  simpler state machine; revisit if multi-approver chains are required.

## Process research (lessons)

- 2026-08-21 audit incident: local-only verification produced 4 false P0 findings because the local
  branch lagged GitHub main and the live DB (MCP-applied migrations). Standing rule adopted: any
  claim about DB/runtime state must be verified against live schema (MCP introspection) or deployed
  function source before being recorded. See docs/audits/AGENTIC-INTELLIGENCE-CROSSCHECK-2026-08-21.md.

## Open research questions

1. Hybrid keyword+semantic retrieval and reranking: evaluate pg full-text + trigram vs pgvector
   hybrid before implementing (task 9 in Phase 1 of evaluation-plan).
2. agent_tool_attempts vs agent_tool_calls naming: rename migration vs documentation alias (task 8.1).
3. Snapshot tables for Digital Twin history: need vs cost (task 4.2).
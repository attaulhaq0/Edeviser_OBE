# Security Model — Agentic Intelligence Platform

## Identity & authorization chain

1. Browser sends only the user JWT (Authorization header). Service keys never reach the browser (.env.example rule enforced in code review).
2. Edge functions: `authenticateRequest()` → Supabase auth.getUser() → authoritative profile lookup (institution_id, role, is_active, status) from `profiles`. JWT/user metadata is NEVER used for tenant or role decisions (explicitly implemented in Tutor).
3. Reads execute under the caller's identity so RLS applies (RAG search already uses the caller JWT client with SECURITY INVOKER RPCs).
4. Cross-table server operations use the managed server key (`SUPABASE_SECRET_KEYS` via serverSecret.ts; legacy service-role key gated behind ALLOW_LEGACY_SERVICE_ROLE_KEY opt-in).

## Threat model & controls

| Threat | Control |
|---|---|
| LLM-invented authority | Tool handlers authorize every call (allowedRoles + requiredContext + scope check); RLS is the backstop. Model output never grants access. |
| Prompt injection via retrieved materials | Evidence framed as UNTRUSTED blocks with explicit ignore-instructions instruction; citation markers validated against the server-authorized set; fail-closed when evidence unavailable. |
| Arbitrary SQL / table access | No tool accepts SQL or table names; registry is a closed enum of typed tools with JSON-schema input validation and boundary errors. |
| Cross-tenant reads/writes | Institution scoping in every RLS policy + tool scope authorization; WITH CHECK on all writes. |
| Privileged-action abuse | PROTECTED_ACTIONS always require a proposal + human approval regardless of autonomy level; execution re-validates authorization; expiry enforced. |
| Secret leakage | Keys only in Supabase secrets/env; redaction module strips secrets/tokens/PII/chain-of-thought from logs; secret values never printed. |
| Budget abuse | AI_DAILY_BUDGET_USD required when enabled; per-student daily message/token limits (Tutor); cost estimation logged per call. |

## Helper functions posture

auth_user_role() / auth_institution_id() / auth_user_status(): SECURITY DEFINER where needed with pinned search_path, restricted EXECUTE grants (37+ REVOKE migrations applied), never exposed to anon unless by design. Prefer SECURITY INVOKER for new logic.

## Advisor gates

Security Advisor + Performance Advisor run after every migration; findings introduced by a change block merge. RLS test matrix (allow AND deny per role × table × action) required for any new/changed policy.

## Data protection

No medical/psychological diagnoses anywhere in Digital Twin. Logs exclude hidden chain-of-thought. Student-facing conversation retention policy set before Phase 3 launch. Export path exists (export-student-data function) consistent with consent state.
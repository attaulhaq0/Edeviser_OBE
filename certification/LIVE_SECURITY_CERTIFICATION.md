# LIVE SECURITY CERTIFICATION
**Date:** 2026-09-13 | **Live Supabase:** `cdlgtbvxlxjpcddjazzx`

## VERDICT: RLS ENABLED ON ALL TABLES — CROSS-TENANT TESTING NOT PERFORMED LIVE

---

## RLS STATUS

All 100+ tables in the `public` schema have RLS enabled. JWT verification is enabled on user-facing Edge Functions. The agent-orchestrator requires authentication.

## CROSS-TENANT ISOLATION — NOT LIVE-TESTED

The certification specification requires attempting known-ID access across institutions for: student data, courses, grades, evidence, attainment, habits, learner states, interventions, agent records. This requires browser-level testing with different authenticated sessions, which was not performed in this audit.

## SECURITY ARCHITECTURE — VERIFIED IN CODE

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Authentication | Supabase Auth with JWT | ✅ Deployed |
| Row-Level Security | RLS policies on all tables | ✅ Enabled |
| Edge Function Auth | `verify_jwt=true` on user-facing functions | ✅ Verified |
| Agent Authorization | Role-gated tools, institution-scoped | ✅ In code |
| Protected Writes | Human approval required | ✅ In code |
| API Key Isolation | Never exposed to browser | ✅ In code |
| Tenant Isolation | Institution ID in RLS policies | ✅ In code |

## KNOWN SECURITY CONCERNS

1. Cross-tenant RLS not tested with live browser sessions
2. No penetration testing performed
3. Edge Function secrets not audited (cannot verify Supabase secrets)
4. No security advisor review performed

**SECURITY CERTIFICATION: ⚠️ PARTIAL — Architecture verified in code. Live cross-tenant browser testing not performed.**
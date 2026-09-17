# Edeviser — Qatar Institutional Readiness Report

**Date:** 2026-09-11 | **Verdict: 🟠 PILOT ONLY**

## 1. Executive Summary

Edeviser can be safely deployed as a **controlled institutional pilot** in Qatar after 5 pre-pilot fixes. The platform is NOT ready for unmonitored broad deployment — OBE cascade needs operational verification and 5 RLS policies need tightening.

## 2. Production Readiness Scores

| Area | Score |
|---|---|
| Architecture | 78 |
| Multi-tenancy | 75 |
| RLS | 70 |
| Auth/RBAC | 80 |
| AI Security | 75 |
| Frontend | 82 |
| Backend | 72 |
| Database | 68 |
| Testing | 62 |
| Observability | 70 |
| Privacy | 72 |
| Qatar Education Alignment | 55 |
| NCSA/Cybersecurity | 60 |
| Accreditation Evidence | 50 |
| **OVERALL** | **62/100** |

## 3. P0 Blockers

| ID | Finding |
## 5. AI/Intelligence Security — VERIFIED STRONG

| Control | Status |
|---|---|
| Tool authorization registry (allowedRoles, actionType, approval) | ✅ `src/ai/capabilities/registry.ts` |
| Protected actions approval-gated | ✅ `PROTECTED_ACTIONS` pattern |
| Institution-scoped AI context (institutionId in 9 hooks) | ✅ Verified |
| Agent proposals require human approval | ✅ `AgentApprovalCard.tsx` |
| AI never bypasses RLS (orchestrator uses service_role + re-validates) | ✅ |
| Prompt injection surface | ⚠️ Student submissions enter AI — needs red-team |

## 6. RLS Summary

| Finding | Count | Severity |
|---|---|---|
| Tables with RLS | ~95% | Good |
| `USING(true)` policies | 5 | **P0** |
| Bare `auth.uid()` | ~60 | P2 |
| `search_path` unpinned | 2 | P1 |
| Intentional fail-closed (agent tables) | 10 | INFO |

## 7. Multi-Tenant Verification

| Test | Result |
|---|---|
| `institution_id` FK on all major tables | ✅ |
| `auth_institution_id()` helper in RLS | ✅ |
| Frontend scoped by profile.institution_id | ✅ |
| Storage path-prefix by auth.uid() | ✅ |
| Cross-tenant access test | ⚠️ NOT TESTED |
| BOLA/IDOR manipulation test | ⚠️ NOT TESTED |

## 8. Privacy Classification

| Requirement | Status |
|---|---|
| Consent-gated analytics | ✅ VERIFIED |
| Session replay text masking | ✅ VERIFIED |
| No PII in PostHog events | ✅ VERIFIED |
| Guardian consent model | ⚠️ LEGAL REVIEW REQUIRED |
| Cross-border data (Supabase/Vercel/PostHog/AI) | ⚠️ CONTRACTUAL |

## 9. Buyer Objections

| Stakeholder | Objection | Edeviser Answer |
|---|---|---|
| IT Director | "Penetration test?" | Not performed |
| Principal | "Prove outcomes?" | No real-institution data |
| Teacher | "More work?" | Automates grading; no usage proof |
| Coordinator | "Our curriculum?" | OBE works; versioning missing |
| DPO | "Where's the data?" | Needs mapping |

## 10. Pre-Pilot Checklist

- [ ] Tighten 5 `USING(true)` RLS policies
- [ ] Create QA assignment→submission→grade fixtures
- [ ] Execute OBE cascade E2E
- [ ] Build cross-tenant isolation test suite
- [ ] Document data processing locations for DPO review
- [ ] Deploy to Vercel Preview for institutional review

**Recommendation:** Proceed with 1-institution controlled pilot after P0 fixes. Use pilot to generate operational evidence for next 9 institutions.
|---|---|
| P0-01 | 5 `USING(true)` RLS policies on gamification tables allow any authenticated user to mutate |
| P0-02 | OBE Grade→Evidence→Attainment cascade never E2E tested (QA OBE-06 BLOCKED) |
| P0-03 | Ghost/orphan data unverified (submissions ref non-existent assignments) |

## 4. P1 Blockers

| ID | Finding |
|---|---|
| P1-01 | 2 unused Edge Functions (generate-reflection-digest, improvement-bonus-check) |
| P1-02 | No curriculum versioning (2026-27 changes would overwrite history) |
| P1-03 | No cross-tenant isolation test |
| P1-04 | No controlled pilot deployment strategy
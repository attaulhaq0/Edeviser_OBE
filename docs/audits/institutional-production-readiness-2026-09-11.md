# Edeviser — Institutional Production Readiness Report

**Date:** 2026-09-11 | **Methodology:** Code-level trace, RLS audit, multi-tenancy verification, chain analysis

---

## Executive Summary

**Verdict: 🟠 PILOT ONLY — Safe for controlled institutional pilot with 5 pre-pilot fixes.**

Edeviser's architecture is fundamentally sound for multi-tenant operation. The database schema uses `institution_id` on all major tables. RLS policies exist but have known gaps (5 `USING(true)` policies on gamification tables identified in prior audit, flagged for Task 13 tightening). The frontend is architecturally clean with proper role guards and data-access layering. The canonical OBE chain exists in code but operational verification requires live data.

## Production Readiness Score: 62/100

| Area | Score | Key Evidence |
|---|---|---|
| Security | 65 | RLS exists, 5 USING(true) gaps, SECURITY DEFINER search_path pinned |
| Privacy | 70 | Consent-gated analytics, masked replay, no PII in events |
| RLS | 65 | 491 migrations, institution_id scoping, 5 tables need tightening |
| Multi-tenancy | 70 | institution_id on all major tables, auth_institution_id() helper |
| Auth | 75 | Supabase GoTrue + RouteGuard, role-based, no bypass found |
| Backend | 70 | Edge Functions + RPCs operational, 2 unused functions |
| Frontend | 80 | 140 routes, 5 roles, design system, all nav wired |
| Database | 65 | 491 migrations, FK constraints, known ghost-data concern |
| Testing | 60 | 755 files, 7017 tests, no E2E for critical workflows |
| Observability | 65 | PostHog with device+release+institution grouping |
| DevOps | 60 | CI/CD exists, pre-deploy audit, Vercel Preview |
| UX | 65 | All roles have dashboards, student mobile nav, teacher workflows |
| Qatar Readiness | 55 | Architecture supports bilingual, multi-tenant; needs institutional validation |

---

## P0 Blockers (Must Fix Before Any Institution)

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| P0-01 | 5 `USING(true)` RLS policies on gamification tables allow any authenticated user to mutate | `supabase/migrations/20260601205749` — student_badges, quiz_clos, team_gamification | Tighten to owner/institution scope |
| P0-02 | OBE cascade runtime unverified — Grade→Evidence→Attainment→XP chain not E2E tested | QA report OBE-06 BLOCKED | Create test fixtures, execute E2E |
| P0-03 | Ghost/orphan data unverified — submissions referencing non-existent assignments | Prior product audit finding | Live DB audit required |

## P1 Blockers (Must Fix Before Production Rollout)

| ID | Finding | Fix |
|---|---|---|
| P1-01 | 2 Edge Functions with no callers (generate-reflection-digest, improvement-bonus-check) | Wire or deprecate |
| P1-02 | 2 mutable `search_path` on SECURITY DEFINER functions | Add `SET search_path = ''` |
| P1-03 | No E2E test for multi-tenant isolation | Create cross-tenant access tests |
| P1-04 | No curriculum ingestion pipeline | Build ingestion feature |
| P1-05 | No controlled pilot deployment strategy | Document staged rollout plan |

---

## Security Threat Model (Top 5 Risks)

| # | Threat | Likelihood | Impact | Risk |
|---|---|---|---|---|
| 1 | Cross-tenant student data access via USING(true) RLS gap | MEDIUM | HIGH | **CRITICAL** |
| 2 | SECURITY DEFINER function privilege escalation | LOW | HIGH | HIGH |
| 3 | AI prompt injection via student content | LOW | MEDIUM | MEDIUM |
| 4 | Storage bucket cross-tenant file access | LOW | HIGH | MEDIUM |
| 5 | Session hijack → role escalation | LOW | HIGH | MEDIUM |

---

## Multi-Tenancy Verification

| Concern | Code Evidence | Status |
|---|---|---|
| `institution_id` on major tables | Present on profiles, courses, students, outcomes, assessments, evidence, gamification | ✅ |
| `auth_institution_id()` helper | Used in RLS policies for tenant scoping | ✅ |
| Supabase RLS per-institution | Policies reference `institution_id = auth_institution_id()` | ✅ |
| Frontend institution scoping | `useAuth().profile.institution_id` used in queries | ✅ |
| Cross-tenant UI protection | Route guards prevent wrong-role access | ✅ |
| Storage bucket isolation | Private buckets with path-prefix by `auth.uid()` | ✅ |

---

## Pre-Pilot Checklist

- [ ] Tighten 5 `USING(true)` RLS policies
- [ ] Create QA assignment/submission/grade fixtures
- [ ] Execute OBE cascade E2E
- [ ] Run cross-tenant isolation test
- [ ] Deploy latest code to QA Preview
- [ ] Verify PostHog events in QA environment

---

## "If I Were the Qatar School Buyer" Assessment

**What would impress them:** The OBE hierarchy, multi-role platform, bilingual support, AI-assisted workflows, PostHog observability.

**What would concern them:** No live operational proof of the attainment engine, no curriculum ingestion, missing E2E verification of critical workflows.

**What IT/security would challenge:** The 5 `USING(true)` RLS policies, lack of documented penetration test results, no data residency documentation.

**What teachers would ask:** "Does this make grading easier?" — needs operational proof.

**What would make Edeviser difficult to replace:** The integrated OBE chain (Outcome→Assessment→Evidence→Measurement→Intervention), multi-role platform, bilingual support, AI intelligence layer.

**What must be fixed before first institution:** RLS tightening (P0-01), OBE cascade verification (P0-02), ghost data audit (P0-03).
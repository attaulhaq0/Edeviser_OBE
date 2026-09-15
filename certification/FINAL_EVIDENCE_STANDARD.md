# FINAL EVIDENCE STANDARD — ULTIMATE
**Date:** 2026-09-12

## EVIDENCE LEVELS

| Level | Name | Definition | What It Proves |
|-------|------|-----------|---------------|
| L0 | DOCUMENTED | Documentation exists | Intent only — no proof |
| L1 | CODE PROVEN | Implementation + unit tests pass | Logic is correct locally |
| L2 | INTEGRATION PROVEN | Backend ↔ DB integration works | System components connect |
| L3 | LIVE RUNTIME PROVEN | Executed against live QA, data persisted | Code+DB work in real environment |
| L4 | BROWSER PROVEN | Real user interaction through frontend → backend result | User workflow functions |
| L5 | CROSS-ROLE PROVEN | Resulting state observed by affected role(s) | Multi-role shared truth |
| L6 | CLOSED-LOOP PROVEN | Complete intelligence/intervention loop executed | Downstream chain works |
| L7 | MULTI-INSTITUTION PROVEN | Behavior proven across configuration variants | Platform adapts correctly |

## MINIMUM REQUIRED LEVELS BY CAPABILITY TYPE

| Capability Type | Minimum Level |
|----------------|---------------|
| Core LMS (courses, grading) | L4 — BROWSER PROVEN |
| OBE (assessment → attainment) | L4 — BROWSER PROVEN |
| Assessment Strategy | L4 — BROWSER PROVEN (different models produce different results) |
| Grade Scale | L4 — BROWSER PROVEN |
| Habit Engine / BJ Fogg | L4 — BROWSER PROVEN |
| Learner Intelligence | L5 — CROSS-ROLE PROVEN |
| Agent / AI | L4 — BROWSER PROVEN (real model call) |
| Intervention | L6 — CLOSED-LOOP PROVEN |
| CQI | L4 — BROWSER PROVEN |
| Parent | L5 — CROSS-ROLE PROVEN |
| Multi-institution | L7 — MULTI-INSTITUTION PROVEN |
| Security / Tenant | L4 — BROWSER PROVEN (attack scenarios) |
| Onboarding | L4 — BROWSER PROVEN |

## WHAT THIS MEANS FOR CURRENT STATE

Based on our live Supabase verification:

| Capability | Max Verified Level | Gap to Required |
|-----------|-------------------|-----------------|
| Core LMS | L3 (live data) | L4 needed (browser) |
| OBE attainment | L3 (live data) | L4 needed (browser) |
| Assessment strategy | L1 (code + tests) | L4 needed (browser) |
| Grade scale | L3 (live DB config) | L4 needed (browser) |
| BJ Fogg / Habit | L1 (code + tests) | L4 needed (browser) |
| Agent infrastructure | L3 (live runs) | L4 needed (browser + AI activation) |
| Intervention | L2 (code trace) | L6 needed (closed loop) |
| Parent | L3 (live links) | L5 needed (cross-role) |
| Security | L3 (RLS audit) | L4 needed (browser attack tests) |
| Multi-institution | L0 (docs) | L7 needed (multi-institution) |

**NONE of the launch-critical capabilities have yet reached their minimum required evidence level.** This is because browser testing with real user workflows has not been performed — which is a limitation of our current toolset, not a product defect.
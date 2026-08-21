# Autonomy Policy — Operational (A0–A3) & Pedagogical (L1–L3)

## Two separate axes

**Pedagogical (Tutor, live):**
- L1 hints only · L2 guided discovery · L3 direct explanation.
- Resolution (implemented in chat-with-tutor): assignment-level > CLO-level > default L2; student override honored for L1; L3 capped by teacher ceiling.

**Operational (agents):**
- A0 observe only · A1 suggest & draft · A2 confirm before action · A3 execute pre-approved low-risk actions automatically.
- Current config ceiling: `maximumAutonomy: "A2"` in agentic config — A3 is OFF platform-wide until Phase 7 gates pass.

## Effective autonomy rule

```
effective = min(institutionCeiling, roleCeiling, pageCeiling, toolCeiling, userPreference, supervisorCeiling?)
```

- institutionCeiling: institution_settings (per-institution policy; default A1).
- roleCeiling: per-role defaults (student A1, teacher A2, coordinator A2, admin A2, parent A0/A1).
- pageCeiling: from the page-capability matrix (sensitive pages cap lower).
- toolCeiling: each tool declares its max autonomy class.
- userPreference: user may LOWER only; stored per user; never exceeds any ceiling above.
- supervisorCeiling: teacher (for student-facing actions) / coordinator ceilings where applicable.

## Action classification

**Automatic when policy permits (A1+ surface, no approval):** display suggestion; recommend approved resource; offer diagnostic question; suggest study session (not created); offer goal (not created); create draft plan/feedback/report; explain ILO/PLO/CLO relationship; show outcome-governance warning; show mapping-quality warning.

**Always approval-required (PROTECTED_ACTIONS — regardless of A3):** planner session creation; real goal creation; contact teacher; notify parent; send email/message; create/modify assignment; publish course content or generated questions; create/modify/delete/reorder ILO; create/modify PLO/CLO; change outcome mapping; create/assign CQI action; change deadlines/grades/release grades/attendance/official attainment/academic record; change roles/permissions; delete users; change institutional policies; financial changes; institution-wide communications.

## Rollout

- Phase 3–6 ship at effective A1/A2 with the approval UX.
- Phase 7 enables A3 per-institution behind feature flags + evaluation thresholds + rollback switch; a property test asserts PROTECTED_ACTIONS can never be auto-executed at any autonomy level.
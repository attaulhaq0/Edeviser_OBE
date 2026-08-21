# Agentic Intelligence — Big Picture, Prerequisites & PR #271 Conflict Resolution

**Date:** 2026-08-21
**Scope:** Why PR #271 had merge conflicts, how each was resolved, what the agentic-intelligence workstream is, and why each prerequisite piece exists.

---

## 1. The Bigger Picture — What We Are Building

Edeviser is becoming an **intelligent learning operating system**, not just an OBE + gamification platform. The canonical spec lives in `.kiro/specs/edeviser-agentic-intelligence/` (requirements.md, design.md, tasks.md + 19 supporting files).

The end state has 8 phases:

| Phase | What it delivers |
|---|---|
| 1 | **Foundation** — canonical OBE hierarchy (ILO→PLO→CLO→Sub-CLO), mapping-direction integrity, reorder safety, DB cascade tests |
| 2 | **Agent runtime core** — LLM provider abstraction (DeepSeek-only in production), tool registry, autonomy engine (A0–A3), approval workflow |
| 3 | **Assistant frontend** — chat/panel components wired to the agent runtime, per-role entry points |
| 4 | **Digital Twin + agents** — student learning state (mastery, habits, risk), Mastery/Habit/Risk/Intervention agents |
| 5 | **Role copilots** — Teacher, Coordinator, Admin, Parent copilots with role-scoped tools |
| 6 | **Governance** — approval queues, audit trail, cost controls, admin governance UI |
| 7 | **Safety & evaluation** — autonomy policy enforcement, red-team evals, regression suites |
| 8 | **Observability & rollout** — tracing, background jobs, docs, staged rollout |

**Hard guardrails (non-negotiable):**
- No agent ever gets raw SQL, service-role keys, or RLS-bypassing tools.
- Authorization is enforced by tool handlers + RLS, never by the LLM.
- Effective autonomy = min(institution, role, page, tool, user preference, teacher/coordinator ceiling).
- Approval is ALWAYS required for outcome mutations, grade/deadline changes, messages, CQI actions.
- DeepSeek is the only production provider; Gemini must not be required.

## 2. What This Session Worked On

### 2.1 Spec truth-fixing (the original ask)
Verified every "completed" claim in the spec against live code/GitHub main/live Supabase, then:
- **Marked [x] with evidence:** 2.3 (MockProvider), 7.1 (autonomy engine), 6.2-read (9 outcome read tools), 1.7 (reconciliation report), 4.2 (snapshot decision), 1.6-lib (direction property test)
- **Deferred:** 6.3 (governance/cost dashboard UI) → new "Deferred" section with rationale
- **Prerequisite-tagged:** 1.8 (reorder safety) explicitly blocks 6.2 write tools

### 2.2 The prerequisite slice (implemented in PR #271)
| Piece | File(s) | Why it's a prerequisite |
|---|---|---|
| **MockProvider** | `supabase/functions/_shared/ai/providers/mock-provider.ts` | Deterministic, free, offline agent tests. The factory **hard-fails** if `AI_PROVIDER != deepseek`, so it can never leak into production. Every later agent phase (3–8) needs repeatable tests without burning DeepSeek credits or touching live data. |
| **Autonomy engine (A0–A3)** | `supabase/functions/_shared/ai/policy/autonomy.ts` | Enforces "effective autonomy = min of all ceilings" and the PROTECTED_ACTIONS invariant (A3 never bypasses approval). Unit-tested in `agentAutonomyPolicy.test.ts`. Without this, no agent tool can be safely exposed. |
| **9 outcome read tools** | `supabase/functions/_shared/ai/tools/registry.ts` | PDF §18 tools: `get_institution_ilos`, `get_ilo_detail`, `get_ilo_attainment`, `get_ilo_attainment_trend`, `get_ilo_mapping_coverage`, `get_ilo_program_contributions`, `get_ilo_evidence_summary`, `get_unmapped_program_outcomes`, `get_outcome_hierarchy_health`. Every agent (Mastery, Habit, Risk, copilots) needs ILO/PLO/CLO context before it can reason. Registry now has 21 read tools. |
| **Direction property test** | `src/__tests__/properties/outcomeMappingDirection.property.test.ts` | fast-check regression: canonical direction (source=parent, target=child) attaches children; reversed direction never does. 3 properties × 100 runs. This is the Phase-1 certification gate that must stay green before write-tools ship. |

### 2.3 Housekeeping done along the way
- GitHub OAuth token found in `.kiro/settings/mcp.json` → redacted + history scrubbed via `git filter-branch` (push protection caught it). **Rotate that token.**
- `runtime-governance-scratch/` untracked + gitignored.
- Spec heading corruption removed; canonical files reformatted to Kiro spec format.

## 3. Why PR #271 Had Conflicts — and How Each Was Resolved

**Root cause:** the branch was cut from `38b878d`. While we worked, three PRs merged to main touching the same files:
- **#269** — "test: make critical E2E harness fail closed" (rewrote `tests/e2e/_fixtures/seed.ts`, `_helpers/auth.ts`, `_helpers/crossRoleHelpers.ts`, `cross-role/teacher-to-student.spec.ts`, added `e2eHarnessFailClosed.test.ts`)
- **#270** — "chore: harden CodeRabbit pre-pilot review governance" (edited `AGENTS.md`, `docs/audits/pre-pilot-system-validation-2026-08-19.md`)
- **#257** — CI changeset bump (`package.json`)

Our branch carried earlier drafts of some of the same work, so both sides edited the same regions → Git couldn't auto-merge.

| File | Resolution | Rationale |
|---|---|---|
| `supabase/functions/_shared/ai/tools/registry.ts` | **Ours** | Verified main's version is a strict subset (diff showed only our 9 tools missing). Ours = main + 9 outcome tools. |
| `src/__tests__/unit/e2eHarnessFailClosed.test.ts` | **Main's** | #269 is the reviewed fail-closed version; ours was a draft iteration. |
| `tests/e2e/_fixtures/seed.ts` | **Main's** | Same — #269's fail-closed rewrite is authoritative. |
| `tests/e2e/_helpers/auth.ts` | **Main's** | Same. |
| `tests/e2e/_helpers/crossRoleHelpers.ts` | **Main's** | Same. |
| `tests/e2e/cross-role/teacher-to-student.spec.ts` | **Main's** | Same. |
| `docs/audits/pre-pilot-system-validation-2026-08-19.md` | **Main's** | #270's reviewed version is canonical. |
| `AGENTS.md` | **Union** | Kept main's Runtime Deployment Governance + our Live-State Verification Rule (both are needed policy). |
| `package.json` | **Union** | Kept main's 3 new `check:*` scripts + our `check:runtime-dependencies`. |

Merge commit: `7d42a10` on `feat/agentic-prereq-slice`.

## 4. What Remains (the real backlog, in execution order)

1. **1.6** DB-cascade tests (mapping deletion cascades)
2. **1.8** ILO reorder safety (blocks 6.2 write tools)
3. **3.1–3.6** Assistant frontend components
4. **4.1, 4.3–4.8** Digital Twin + Mastery/Habit/Risk/Intervention agents
5. **5.x** Role copilots
6. **6.1, 6.2-write, 6.4** Governance backend + approval-gated write tools
7. **7.2–7.4** Red-team evals, regression suites
8. **8.1–8.5** Observability, background jobs, docs, rollout

## 5. Verification Surface

- Conflict analysis: `git merge-base`, `git diff --numstat <base>..HEAD` and `<base>..origin/main` per file (local git).
- Registry superset proof: `git diff HEAD origin/main -- registry.ts` showed only removals of our 9 tools.
- package.json validity: `JSON.parse` check passed post-resolution.

## 6. Post-Merge Gate Recovery (same day)

After the merge sync, the full local suite failed with 8 tests in 4 files. Diagnosis showed
**main itself was red** (`gh run list --branch main` → CI failure on latest main commit), so
three of the four failures were pre-existing main breakage, not caused by this branch:

| Failure | Root cause | Fix |
|---|---|---|
| `prototypeBoundary.test.ts`, `runtimeDependencyGovernance.test.ts` — `SyntaxError: Invalid or unexpected token` at import | 15 `scripts/*.mjs` files carry `#!/usr/bin/env node` shebangs; vite/vitest cannot transform shebang-bearing imported modules (Node itself runs them fine). | Stripped shebangs from all 15 scripts — safe because every script is invoked via `node script.mjs`, never directly executed. |
| `protectedWriteExecution.test.ts` — 3 assertions got `expired` instead of `unauthorized_approver`/`unknown_tool`/`invalid_input` | **Time bomb:** shared fixture `expiresAt: "2026-08-21T00:00:00.000Z"` expired on the day of the run; calls that don't pass an explicit `now` clock hit the expiry guard first. | Fixture default moved to far-future `2099-01-01`; the dedicated expiry case already overrides `expiresAt` + passes a fixed clock. |
| `quickLoginNoor.test.tsx` — 5 navigation assertions | Our branch had edited expected nav targets (`/student/profile` etc.) while the LoginPage component (unchanged on main) still navigates to `/student/dashboard`. | Reverted the test file to origin/main's version — component behavior is authoritative. |

**Gates after fixes (all green):**
- `npm run lint` — 0 warnings
- `npx tsc --noEmit` — clean
- `npx vitest --run` — **690 files / 6376 tests passed**

Pushed as `3e03c75` ("fix(tests): strip shebangs from runtime scripts and defuse expiry time-bomb").
PR #271 re-verified **MERGEABLE** (BLOCKED = required checks running on the new head).

> Note for main: the shebang + time-bomb fixes should be cherry-picked to main, since main's CI
> is currently red for the same reasons.

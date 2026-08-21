# Edeviser Project Health Audit — 2026-08-21

> Read-only audit: project structure, hooks, Kiro rules/workflows, GitHub Actions (live runs), and agentic intelligence layer — cross-checked against industry best practices.
> Repo: attaulhaq0/Edeviser_OBE · Head at audit time: `dc7d840f`

---

## 1. What the Project Is (Plain Words)

**Edeviser** = a university learning platform for Qatar combining:

| Pillar | What it means |
|---|---|
| **OBE (Outcome-Based Education)** | A "family tree" of learning goals: Institution → **ILO** → **PLO** → **CLO** → **Sub-CLO** → Assessments. Each level maps to the one above it. |
| **Gamification** | XP, levels, badges, streaks, quests, leaderboards, marketplace rewards. |
| **Bilingual** | Full Arabic (RTL) + English via i18next. |
| **5 roles** | admin, coordinator, teacher, student, parent — each with its own dashboard. |

**Tech stack:** React 18 + TypeScript (strict), Vite 6, Tailwind v4 + Shadcn/ui, TanStack Query v5, React Hook Form + Zod, Supabase (Postgres + RLS + Edge Functions in Deno), Vitest + fast-check, Playwright.

---

## 2. Hooks (`src/hooks/` — ~200 files) ✅ Healthy

All database access goes through TanStack Query hooks, per project rules. Sampled key hooks:

| Hook | What it does | Verdict |
|---|---|---|
| `useAuth.ts` | Thin context accessor for AuthContext; throws outside provider | ✅ Clean |
| `useStandardMutation.ts` | Generic mutation wrapper: standardized Supabase error mapping, Sonner toasts, logging | ✅ Excellent shared pattern |
| `useRealtime.ts` | Realtime subscription manager: channel dedup per table+event+filter, exponential-backoff reconnect (1s→30s cap), polling fallback, `isLive` flag | ✅ No memory leaks, proper cleanup |
| `useCourses.ts` | Course CRUD with pagination, search/program/teacher filters, embedded joins | ✅ Proper queryKey structure |

**Type-safety:** no `any` types found in sampled hooks; consistent with the "no any" rule.

**Verdict:** follows TanStack Query v5 best practices. Business logic correctly lives in `src/lib/`, not hooks.

---

## 3. Kiro AI-Rule System ("Skills / Workflows / Rules") ✅ Strong

### `.clinerules/` + `.kiro/steering/` (15 docs)
The rulebook every AI assistant must follow:
- `project-conventions.md` — stack, structure, naming
- `engineering-guardrails.md` — pre-commit checks (lint → tsc → vitest), no `any`
- `supabase-patterns.md` — RLS everywhere, Edge Functions for secrets, types regeneration
- `migration-replay-integrity.md` — migrations forward-compatible, never edit applied ones
- `preview-and-test-gate.md` — Git-linked Preview validation contract
- `auto-git-push.md` / `pre-push-checks.md` — branch protection, conventional commits
- `design-system.md` / `component-patterns.md` / `prototype-fidelity.md` — Shadcn consistency
- `intelligence-layer.md` — agent guardrails (see §5)
- `review-loop.md`, `domain-knowledge.md`, `types-regeneration.md`, `supabase-health-audit.md`

### `.kiro/hooks/` (9 auto-triggers)
- `typecheck-on-save` — runs tsc when files are saved
- `clear-tsc-errors` — clears stale type errors
- `migration-safety` — guards against unsafe migration edits
- `pre-push-ci-check` — lint/tsc/test before push
- `auto-git-push` — guided commit/branch/PR flow
- `postman-api-testing` + `postman-auto-sync` — API collection sync/testing
- `aikido-scan-on-write` — security scan on file write
- `supabase-health-audit` — RLS/index/orphan checks before deploy

### `.kiro/specs/` (30+ specs)
Plan-before-build documents per feature (adaptive quiz, ai-tutor-rag, xp-marketplace, rls-consolidation, etc.).

**Verdict:** spec-driven development with enforcement hooks — more disciplined than most production projects.

---

## 4. GitHub Actions — Cross-Checked vs Best Practices

### Workflows inventory
| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | push/PR to main | Lint, Typecheck, Test+coverage, Build, Security audit, Lockfile check, Lighthouse, Sentry release, Bundle size, E2E, SQL lint, RLS guard, RLS smoke |
| `deploy-migrations.yml` | manual only | Break-glass production migration push with pre-flight checks |
| `pre-deploy-audit.yml` | PR | Pre-deployment governance audit |
| `release.yml` | push to main | Release automation |
| `scheduled-health.yml` | schedule (daily) | Full test suite, security audit, Supabase infrastructure audit |
| `dependabot-auto-merge.yml` | PR | Auto-merge safe dependency updates |

### Strengths (above industry average) ✅
- Concurrency cancel-in-progress on CI; cancel-in-progress:**false** on migrations (correct)
- npm cache + lockfile integrity job (`npm ci --ignore-scripts`)
- Bundle size budget (1500KB gzipped aggregate) with per-chunk report in step summary
- Lighthouse CI performance gate
- SQL migration linting + **replay-order integrity guard** (rare — catches too-early function refs that break fresh replays)
- Duplicate migration base-name guard
- Edge Function schema-contract check against `src/types/database.ts`
- RLS multi-tenant isolation property tests + preview-branch RLS smoke suite (skip-safe until secrets set)
- Production deploys gated by GitHub `environment: production`
- CodeQL code scanning active (visible in run history)

### 🔴 Live failures — Scheduled Health Check failing 3 days straight (runs #61–63)

**A. Full Test Suite — unit test failure**
```
src/__tests__/unit/protectedWriteExecution.test.ts:151 & :208
Expected error kind: unknown_tool / invalid_input
Actual error kind:   expired   (ProtectedWriteBoundaryError: "Proposal has expired")
```
Root cause hypothesis: protected-write proposals expire before the test executes them, OR the boundary's expiry handling was changed without updating tests. This is exactly the kind of drift your own guardrails say must not happen.

**B. Supabase Infrastructure Audit — missing attestation artifact**
```
##[error]No deployment attestation artifact is available; runtime/source parity is unproven
```
The daily audit downloads the `edge-runtime-attestation-snapshot` artifact produced by the deploy workflow — but artifacts expire (retention limit), so parity can't be proven. Fix: re-run the deploy/attestation workflow or raise artifact retention.

**C. Security Audit — 41 vulnerabilities (1 critical, 28 high, 6 moderate, 6 low)**
Key offenders:
- `vite ≤6.4.2` — HIGH (`server.fs.deny` bypass on Windows paths) — fixable non-breaking via `npm audit fix`
- `ws` — HIGH (memory exhaustion DoS) — fixable non-breaking
- `undici` (via jsdom/@vercel/node) — multiple advisories
- `uuid <11.1.1` — moderate
Note: in regular CI this job is silenced by `continue-on-error: true`, so only the scheduled run exposes it.

### ⚠️ Best-practice gaps (not urgent)
1. `continue-on-error: true` on security-audit job + `|| true` on Lighthouse → these gates can never fail CI.
2. Actions pinned to version tags (`@v7`) instead of full commit SHAs (supply-chain hardening).
3. Coverage uploaded but no threshold enforced (no Codecov gate).
4. E2E silently skips when Supabase secrets absent (documented design choice, but easy to forget permanently).
5. Some jobs lack explicit `timeout-minutes`.

---

## 5. Agentic Intelligence Layer ✅ Well-Designed, One Real Bug

### Architecture
- **Edge functions:** `agent-orchestrator` (interactive runs + proposal approve/reject/execute), `agent-worker` (proactive/cron runs), `chat-with-tutor` (student tutor).
- **Shared core:** `supabase/functions/_shared/ai/` — contracts, tool registry, provider routing.
- **Role specialists:** student→tutor/mastery/habit/evaluator; teacher→teacher/mastery/risk/intervention; parent/coordinator/admin each have their own.

### Guardrail compliance (vs `.clinerules/08-intelligence-layer.md`)
| Requirement | Status |
|---|---|
| Tool declarations: name/description/allowedRoles/inputJsonSchema | ✅ Present (12 read tools registered, JSON Schema with `additionalProperties:false`) |
| validateInput / validateOutput on tools | ✅ Present |
| Authorization in handlers + RLS, never trusted to LLM | ✅ Enforced |
| No raw SQL / service-role keys to agents | ✅ Not found |
| DeepSeek primary provider, keys server-side only | ✅ Keys via Supabase secrets, none in client code |
| Approval gates for write actions | ✅ Protected-write proposal system (approve/reject/execute) |
| verify_jwt on sensitive functions | ✅ true on agent-orchestrator/chat-with-tutor; false only on intentionally-public (webhooks/cron/invitations) |

### Known drift (from live audit log)
- `coordinator-ai-insights`: source-controlled but NOT deployed (known drift, tracked)
- `fee-overdue-check`: deployed but legacy/not source-controlled (known drift, tracked)

### The one real bug
The failing `protectedWriteExecution.test.ts` expiry behavior (§4A) — the boundary returns `expired` where the spec/tests expect `unknown_tool`/`invalid_input`. Fix the boundary or update tests to match intended semantics.

---

## 6. Priority Fix List 🔧

1. **Fix protected-write expiry mismatch** — align `ProtectedWriteBoundaryError` kinds between implementation and `protectedWriteExecution.test.ts`.
2. **Restore edge-runtime attestation artifact** — re-run deploy workflow or increase artifact retention so the daily Supabase audit passes.
3. **Patch vulnerabilities** — run `npm audit fix` (vite, ws have non-breaking fixes); evaluate the critical one; then remove `continue-on-error` from the security job so it actually gates.
4. **Later hardening:** pin actions to commit SHAs, add coverage threshold gate, add `timeout-minutes` to jobs, decide whether Lighthouse should fail the build.

## Overall Grade

**Strong setup.** Rules, hooks, and CI are more disciplined than most production projects. The current failures are maintenance items (stale test expectations, expired artifact, unpatched deps), not design flaws.
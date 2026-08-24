# Edeviser Codebase Structure Guide

**Purpose:** a guided tour — what every folder/file is for, how the pieces work together,
and what to keep improving. Read root [`AGENTS.md`](../../AGENTS.md) first; this document
explains the _why_ behind the layout. Status: matches the working tree as of 2026-08-24.

---

## 1. Top level — only entry points and configuration live here

```
Edeviser-Kiro/
├── AGENTS.md              # Universal agent entry point (open standard). Tool map,
│                          # repo map, coding rules, verification gates. Single source
│                          # of truth shared by Kiro/Codex/Jules/Claude/Cline.
├── CLAUDE.md              # Claude Code adapter — thin pointer to AGENTS.md + hard guards.
├── README.md              # Project readme for humans (quickstart, stack, doc index).
├── package.json           # Named scripts = deterministic gates agents can self-run:
│                          #   lint / tsc / test / test:rls / i18n:check /
│                          #   db:check-replay / check:runtime-dependencies …
├── tsconfig.json          # Strict TS project config (tsc -b via build).
├── vite.config.ts         # Vite build/dev + inline Vitest config (test.include is
│                          # scoped to src/** so e2e never leaks into unit runs).
├── vitest.integration.config.ts  # Separate RLS integration project (real DB) → npm run test:rls.
├── playwright.config.ts   # E2E projects: legacy-smoke (e2e/**) + role audit projects
│                          # (admin/coordinator/teacher/student/parent/cross-role/rtl-ar).
├── eslint.config.js       # Flat ESLint config; --max-warnings 0 gate.
├── lighthouserc.cjs       # Lighthouse CI budgets (perf/a11y).
├── performance-budget.config.ts  # Bundle-size budgets enforced in CI.
├── i18next-cli.config.ts  # Locale extraction; feeds npm run i18n:check parity gate.
├── components.json        # Shadcn/ui generator config (New York style).
├── vercel.json            # Frontend hosting/rewrites (SPA on Vercel).
├── index.html             # SPA shell.
├── .env.example           # Template of required env vars (never commit real secrets).
├── .github/workflows/     # CI mirrors local gates exactly (trust-then-verify loop);
│                          # pre-deploy-audit.yml enforces the Preview contract.
└── github-mcp-server.exe  # ⚠ Kept at root because .kiro/settings/mcp.json references it
                           #   by relative path (Kiro MCP server binary).
```

## 2. `src/` — the React SPA

```
src/
├── AGENTS.md              # Frontend subsystem rules (closest-file-wins when editing here).
├── main.tsx               # Bootstrap: mounts React, wires providers/router.
├── app/                   # App shell layer: router registry, providers (QueryClient,
│                          # AuthProvider), layouts, role guards. No business logic.
├── features/<domain>/     # ★ Feature-first colocation — preferred home for NEW domain
│   │                      # work (e.g. features/student/assignments). Each feature owns
│   │                      # components/ hooks/ lib/ schemas/ and exports ONLY via its
│   │                      # barrel index.ts — internals are refactor-safe.
│   └── student/assignments/  # Example: AssignmentDetailScreen lives inside its domain.
├── components/
│   ├── ui/                # Shadcn primitives (regenerate via CLI; don't hand-hack).
│   └── shared/            # Cross-feature custom components (badges, cards, tables…).
├── hooks/                 # Global cross-feature TanStack Query hooks only
│                          # (e.g. useAdaptiveQuiz, usePurchase, useTutorMessages).
│                          # Feature-specific hooks belong inside features/.
├── lib/                   # Framework-free core: supabase client, analytics consent,
│                          # attainment classifier, schemas, utils. No React imports.
├── pages/{role}/          # Thin route targets per role: admin/ coordinator/ teacher/
│                          # student/ parent/. They compose features + shared components.
├── providers/             # Context providers (AuthProvider resolves role server-side;
│                          # never trusts client-supplied roles).
├── locales/{en,ar}/       # i18n JSON — key parity enforced by npm run i18n:check; RTL-aware.
├── types/
│   ├── database.ts        # ⛔ GENERATED from live Supabase schema — never edit by hand.
│   └── domain/            # Hand-written domain models (separate from generated).
└── __tests__/             # Unit tests (unit/), property tests (properties/, fast-check
                           # ≥100 iters), mocks, setup.ts. Vitest include = src/** only.
```

**Data flow rule:** UI → TanStack Query hook (`useX`) → supabase-js → PostgREST with the
user's JWT → Postgres RLS decides visibility. Optimistic updates + Realtime subscriptions
keep student actions feeling instant. Business logic stays in `lib/` or feature `lib/`.

## 3. `supabase/` — backend (Postgres + Edge runtime)

```
supabase/
├── AGENTS.md              # Backend rules: migrations MCP-managed, RLS-everywhere,
│                          # verify_jwt policy, DeepSeek-only AI provider.
├── migrations/            # ⛔ Append-only, monotonic names, forward-replayable.
│                          #    Applied via Supabase MCP — never hand-edit. The grade→
│                          #    evidence→attainment cascade is a pure-SQL DB trigger here.
├── functions/             # 60+ Deno Edge Functions. Highlights:
│   ├── _shared/           #   Shared kernel: ai-provider composition root (DeepSeek only),
│   │                      #   auth helpers, validation. Features import from here only.
│   ├── agent-orchestrator / agent-worker   # Agentic runtime: bounded tool loops,
│   │                      #   proposals for protected actions, exactly-once executions.
│   ├── chat-with-tutor    #   RAG tutor: native gte-small embeddings →
│   │                      #   search_course_materials_v2 scoped by caller JWT/RLS.
│   ├── award-xp · check-badges · process-streaks   # Gamification engine.
│   └── calculate-attainment-rollup · generate-accreditation-report · generate-course-file
├── seeds/                 # Deterministic demo data — E2E suites verify against it.
└── tests/                 # pgTAP RLS tests (npm run test:rls).
```

**Crons:** pg_cron jobs (streak resets, weekly digests, at-risk signals) call Edge
Functions server-to-server using the internal-auth pattern (`--no-verify-jwt` +
`x-internal-auth`), never by disabling auth blindly.

## 4. `scripts/` — the verification layer (agents' best friend)

Every quality gate is one named command; CI runs the same commands locally runnable:

| Script                                                                                 | What it proves                                                                            |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `check-migration-replay-order.mjs`                                                     | Migrations replay cleanly in order                                                        |
| `check-migration-duplicate-names.mjs`                                                  | No name collisions                                                                        |
| `resolve-runtime-deployment-impact.mjs`                                                | Runtime closure derived from `runtime-dependency-manifest.json`; unknown deps fail closed |
| `check-critical-e2e.ts` / `check-critical-routes.ts` / `check-playwright-contracts.ts` | E2E coverage contracts hold                                                               |
| `check-i18n-parity.mjs`                                                                | en/ar keys match                                                                          |
| `audit/run.ts`                                                                         | Full environment audit                                                                    |

## 5. Docs, knowledge & quarantine

```
docs/
├── product/               # One-pager, complete overview, tech-stack+security (+PDFs).
├── investor/ business/    # Pitch packs, playbooks, unit economics.
├── agent/                 # THIS guide, structure blueprint, AI-agent context pack,
│                          # CODEX-MASTER-AGENTIC-GOAL.md (relocated from root).
├── adr/                   # Architecture Decision Records (0001 RLS, 0002 DeepSeek,
│                          # 0003 autonomy model). Agents cite these, not re-litigate.
├── runbooks/deploy.md     # Step-numbered release/deployment procedure.
├── architecture/ audits/  # System architecture doc + dated audit reports (historical).
└── sentinel.md            # Engineering-lessons log (moved from root).

.kiro/                     # CANONICAL knowledge base (primary IDE): steering/*.md
                           # conventions, specs/<feature>/ requirements+design+tasks,
                           # hooks/, settings/mcp.json.
archive/2026-H2/           # Quarantined legacy artifacts (logs/HARs/PR scratch/one-off
                           # audit scripts). Do not index or extend; git history preserves all.
e2e/ · tests/e2e/          # Playwright legacy smoke vs role-audit projects (config-scoped).
prototype/                 # HTML fidelity references — UI work must match these.
```

## 6. How a change flows end-to-end (the safety loop)

1. Agent/human edits code following nearest AGENTS.md.
2. Local gates: `npm run lint` → `npx tsc --noEmit` → `npm test` (+ schema/runtime gates if relevant).
3. Push feature branch → PR → **Git-linked Supabase Preview** must match branch+PR number.
4. CI re-runs identical gates + contract checks + Lighthouse/perf budgets.
5. Merge → read-only Production verification → stale Supabase branches deleted.

## 7. Further organization opportunities (senior/agentic practices)

1. **Uncommitted WIP needs a home** — 8 modified `src/` files + untracked
   `agentCertification.property.test.ts` / `src/__tests__/security/` currently break
   `tsc --noEmit`. Commit as a WIP branch or finish them; until then every full-gate run
   fails through no fault of other changes.
2. **Barrel enforcement** — add `eslint-plugin-boundaries` (or similar) so imports must go
   through `features/*/index.ts`; today it's convention-only.
3. **Folder cards** — short README.md in `src/hooks/`, `src/lib/`, `supabase/functions/`
   (top-10 functions table) to cut agent exploration cost further.
4. **`github-mcp-server.exe` (25 MB binary, tracked)** — long-term: remove from git,
   install locally/gitignore; requires updating `.kiro/settings/mcp.json`.
5. **Hook parity for hard guards** — mirror the Claude settings deny-list as a Kiro hook +
   pre-commit check so protected paths are guarded in every tool identically.
6. **Spec index** — `.kiro/specs/` has ~36 folders; an auto-generated INDEX.md (name →
   status → one-liner) helps agents pick the right spec without listing files.
7. **Context economy** — consider `llms.txt` at root pointing agents to canonical docs in
   priority order (emerging convention alongside AGENTS.md).
8. **Archive hygiene cadence** — quarterly sweep of new stray root files into
   `archive/<period>/` (this session moved 72; keep the pattern).

# Edeviser

**Human-Centric OBE + Gamification platform for higher education** - built for the Qatar
market with full Arabic/English bilingual support (RTL/LTR), accreditation-grade evidence
chains (CAA/QNSA-style CQI workflows), and a safety-gated agentic AI layer.

> E Deviser is the company; **Edeviser** is the platform: outcome-based education where
> compliance is a _byproduct_ of student engagement, not its enemy.

## What it does

- **OBE engine** - Institution > ILO > PLO > CLO > Sub-CLO hierarchy with canonical mapping
  direction (`source_outcome_id` = parent), grade>evidence>attainment cascade,
  thresholds (85/70/50), curriculum matrix, accreditation course files + report generation.
- **Gamified learning** - XP economy, badges, quests/challenges, marketplace, streaks &
  perfect days, teams, leaderboards, onboarding wizard & weekly planner.
- **Agentic intelligence (human-centric)** - RAG tutor (L1-L3 pedagogical autonomy),
  operational agents (A0-A3, ceiling A2), approval-gated protected actions, habit engine
  and at-risk interventions, DeepSeek-only provider, pgvector retrieval scoped by caller RLS.
- **Five roles** - admin, coordinator, teacher, student, parent - each with dedicated
  surfaces; parents see verified linked children only.

## Tech stack

React 18 + TypeScript (strict) | Vite 6 | Tailwind CSS v4 + Shadcn/ui (New York) |
TanStack Query v5 / Table | React Hook Form + Zod | Supabase (PostgreSQL 17 + RLS, Deno
Edge Functions, Realtime, Storage, pg_cron) | i18next (ar/en) | Vitest + fast-check |
Playwright | Vercel | Sentry + PostHog.

## Quickstart

```
npm install          # Node >= 20 (.nvmrc)
npm run dev          # Vite dev server
npm test             # Vitest unit suite
npm run lint         # ESLint, zero warnings
npx tsc --noEmit     # Type check
```

## Repository map

See [AGENTS.md](./AGENTS.md) for the full map and conventions, and
[docs/agent/CODEBASE-STRUCTURE-GUIDE.md](./docs/agent/CODEBASE-STRUCTURE-GUIDE.md) for an
annotated tour of every folder. Key roots:

| Path             | Purpose                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `src/`           | React SPA (`app/`, `features/`, `components/`, `hooks/`, `lib/`, `pages/{role}/`, `locales/{en,ar}/`) |
| `supabase/`      | Migrations (MCP-managed), Edge Functions, seeds, pgTAP RLS tests                                      |
| `scripts/`       | Deterministic verification gates - every check is one named command                                   |
| `docs/`          | Product/investor/agent docs, ADRs, architecture, audits, runbooks                                     |
| `.kiro/`         | Canonical steering knowledge base + feature specs (primary IDE: Kiro)                                 |
| `e2e/`, `tests/` | Playwright suites (legacy smoke + role audit projects)                                                |

## Documentation

- Product: `docs/product/` (one-pager, complete overview, tech-stack + security overview)
- Business/investor: `docs/business/`, `docs/investor/`
- Architecture: `docs/architecture/` | Decisions: `docs/adr/` | Ops: `docs/runbooks/`

## License

See [LICENSE](./LICENSE).

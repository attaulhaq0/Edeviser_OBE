# Agent Instructions for Edeviser

> **Universal entry point.** This file follows the [AGENTS.md](https://agents.md) open standard.
> Canonical rules live HERE and in `.kiro/steering/*.md`. Tool-specific config files are thin
> pointers — never duplicate rules into them. When editing inside `src/` or `supabase/`, also
> read the nearest nested `AGENTS.md` (closest file wins).

## Agent Tool Map

| Tool               | Reads automatically                                  | Status                                                         |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------- |
| Kiro (primary IDE) | `.kiro/steering/*`, `.kiro/specs/*`, `.kiro/hooks/*` | Canonical knowledge base — keep authoritative                  |
| OpenAI Codex       | `AGENTS.md` (this file)                              | Native, nothing needed                                         |
| Google Jules       | `AGENTS.md` (this file)                              | Native, nothing needed                                         |
| Claude Code        | `CLAUDE.md`                                          | Thin pointer → this file + `.claude/settings.json` permissions |
| Cline              | `.clinerules/`                                       | See `.clinerules/00-read-first.md` pointer                     |

## Project Overview

Edeviser is a Human-Centric OBE (Outcome-Based Education) + Gamification platform for higher education. It targets the Qatar market with full Arabic/English bilingual support.

## Repository Map

```
src/          React SPA (app shell, features, components/ui+shared, hooks, lib,
              locales/{en,ar}, pages/{role}, types)          → see src/AGENTS.md
supabase/     migrations (⛔ manual edits), functions/ (Deno),
              seeds/, tests/ (pgTAP RLS)                     → see supabase/AGENTS.md
scripts/      Deterministic gates — every check is one named command
docs/         product/, investor/, agent/, adr/, architecture/, audits/
.kiro/        steering (conventions), specs (36 feature specs), hooks, settings
e2e/, tests/  Playwright E2E / integration suites
prototype/    HTML fidelity references for UI work
archive/      Quarantined legacy artifacts (do not grep-index mentally; ignore)
```

## Tech Stack

- React 18 + TypeScript (strict mode), Vite 6
- Tailwind CSS v4 + Shadcn/ui (New York style)
- TanStack Query v5, TanStack Table, React Hook Form + Zod
- Supabase (PostgreSQL + RLS, Edge Functions in Deno, Realtime, Storage)
- i18next for i18n (Arabic/English), RTL layout support
- Vitest for testing, fast-check for property-based tests

## Coding Rules

- No `any` types — use `unknown` with type guards or proper interfaces
- All database queries go through TanStack Query hooks in `src/hooks/`
- Business logic lives in `src/lib/`, not in components or hooks
- Use Shadcn/ui components — never raw HTML for interactive elements
- Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) not physical (`ml-*`, `mr-*`)
- Icon Containers: Icon wrappers/badges in section headers and card headers MUST use transparent (`bg-transparent`) or white liquid glass (`bg-white/80 border border-slate-200/60 backdrop-blur-xs`) backgrounds — never solid colored fills
- Use `@/` path alias for all imports
- Use Sonner for toast notifications
- Use Zod schemas for all form validation

## Pre-Commit Checks

Run in order before any PR:

1. `npm run lint` — ESLint with zero warnings
2. `npx tsc --noEmit` — TypeScript type checking
3. `npm test` — Vitest test suite (runs `vitest --run`)

## Supabase Preview Validation Contract

- Schema, migration, Edge Function, and RLS PR validation uses only the Git-linked Supabase Preview created for the pull-request branch.
- A valid Preview must match both `git_branch ==` the PR head branch and `pr_number ==` the current PR number.
- Direct MCP-created development branches are never evidence for required PR schema validation unless explicitly authorized as a separate experiment. An empty direct Preview cannot invalidate a forward migration.
- Required schema-bearing sequence: local Docker replay → push branch → open PR → wait for the Git-linked Preview → verify `FUNCTIONS_DEPLOYED` and migrations → Preview RLS/runtime validation → exact-head CI → merge → read-only Production verification.
- After merge or closure, verify no unneeded non-main Supabase branches remain and delete stale branches to prevent cost. Never manually modify Production to make Preview validation pass.

## Runtime Deployment Governance

For every runtime-affecting task, include this review record:

```text
Deployment Impact: NONE | MIGRATIONS | EDGE_FUNCTIONS | BOTH | CONFIG
Runtime feature(s): [derived from scripts/runtime-dependency-manifest.json]
Affected functions: [derived from the runtime resolver]
Shared runtime changed: YES | NO
Production action required: YES | NO
```

Do not duplicate a declared Edge Function closure in workflow YAML, tests, scripts, or docs. Extend `scripts/runtime-dependency-manifest.json`, then use `scripts/resolve-runtime-deployment-impact.mjs` to derive the closure. Unknown shared runtime dependencies fail closed.

Permanent principle: **MERGE != DEPLOYMENT** and **DEPLOYMENT != ATTESTATION**. A runtime task is incomplete until the selected deployment is independently attested; never approve a Production environment gate from Codex.

## Live-State Verification Rule (mandatory)

Every audit claim about database or runtime state (tables, columns, constraints, triggers,
functions, RLS policies, grants, deployed edge functions) MUST be verified against the LIVE
Supabase project via MCP introspection (pg_catalog / information_schema / get_edge_function)
or the deployed function source before being written into any spec, audit, or task. Local
files and the local branch are NOT proof of live state — the local checkout can lag GitHub
main and the live database (migrations applied via MCP). Record the verification surface
(live query / deployed source) alongside the finding.

## Do Not Modify

- `supabase/migrations/` — managed via Supabase MCP, not manually
- `.kiro/` directory — Kiro IDE configuration
- `src/types/database.ts` — auto-generated from Supabase schema
- `.env.local` — contains secrets, gitignored

## Testing Conventions

- Property-based tests: `src/__tests__/properties/*.property.test.ts` (fast-check, min 100 iterations)
- Unit tests: `src/__tests__/unit/*.test.ts` or `*.test.tsx`
- Use `@testing-library/react` for component tests
- Reference design doc in property test comments: `// Feature: <name>, Property N: ...`

## File Structure

- Components: `src/components/ui/` (Shadcn), `src/components/shared/` (custom)
- Features: `src/features/<domain>/` — colocated hooks/lib/schemas/components per domain, exported via barrel `index.ts` only (new code preferred here)
- Pages: `src/pages/{role}/` (admin, coordinator, teacher, student, parent)
- Hooks: `src/hooks/` (global cross-feature TanStack Query hooks)
- Lib: `src/lib/` (utilities, schemas, business logic — framework-free)
- Locales: `src/locales/{en,ar}/` (i18n JSON files)

## Verification Commands (self-check before finishing any task)

| Command                                          | Gate                               |
| ------------------------------------------------ | ---------------------------------- |
| `npm run lint`                                   | ESLint, zero warnings              |
| `npx tsc --noEmit`                               | Type safety                        |
| `npm test`                                       | Vitest unit suite (`vitest --run`) |
| `npm run test:rls`                               | pgTAP/integration RLS suite        |
| `npm run i18n:check`                             | en/ar locale key parity            |
| `npm run db:check-replay` · `npm run db:check-dup-names` | Migration replay integrity         |
| `npm run check:runtime-dependencies`             | Runtime deployment impact closure  |

An agent task is complete only when every gate relevant to its change passes locally.

## Nested Agent Instructions

- `src/AGENTS.md` — frontend layering, component/hook/i18n rules
- `supabase/AGENTS.md` — migration policy, Edge Function & RLS rules
  Closest file wins when working inside those trees.

## Documentation Index

- `docs/product/` — one-pager, complete product overview, tech-stack & security overview (+ PDFs)
- `docs/investor/` — investor pack & live-demo storyboard
- `docs/agent/` — AI-agent context pack, codebase structure blueprint
- `docs/adr/` — architecture decision records
- `.kiro/specs/<feature>/` — requirements/design/tasks per shipped or planned feature

# Agent Instructions for Edeviser

## Project Overview

Edeviser is a Human-Centric OBE (Outcome-Based Education) + Gamification platform for higher education. It targets the Qatar market with full Arabic/English bilingual support.

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
- Pages: `src/pages/{role}/` (admin, coordinator, teacher, student, parent)
- Hooks: `src/hooks/` (TanStack Query hooks)
- Lib: `src/lib/` (utilities, schemas, business logic)
- Locales: `src/locales/{en,ar}/` (i18n JSON files)

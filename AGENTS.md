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
- Use `@/` path alias for all imports
- Use Sonner for toast notifications
- Use Zod schemas for all form validation

## Pre-Commit Checks

Run in order before any PR:

1. `npm run lint` — ESLint with zero warnings
2. `npx tsc --noEmit` — TypeScript type checking
3. `npm test` — Vitest test suite (runs `vitest --run`)

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

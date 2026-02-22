# Edeviser Project Conventions

## Tech Stack
- React 18 + TypeScript (strict mode)
- Vite 6 (bundler)
- Tailwind CSS v4 + Shadcn/ui (styling & components)
- React Router v7 (routing with role-based guards)
- TanStack Query v5 (server state)
- TanStack Table (data tables)
- React Hook Form + Zod (forms & validation)
- Framer Motion (animations)
- Recharts (charts)
- dnd-kit (drag & drop)
- date-fns (dates)
- Sonner (toasts)
- nuqs (URL search params)
- Supabase (Auth, PostgreSQL + RLS, Realtime, Storage, Edge Functions)
- canvas-confetti (celebration effects)
- Zustand (client state management)
- i18next + react-i18next (internationalization)
- @sentry/react (error monitoring & performance)

## File Structure
- Components: `src/components/ui/` (Shadcn), `src/components/shared/` (custom shared)
- Pages: `src/pages/{role}/` (admin, coordinator, teacher, student)
- Hooks: `src/hooks/` (TanStack Query hooks, custom hooks)
- Lib: `src/lib/` (supabase client, utils, schemas, audit logger)
- Providers: `src/providers/` (AuthProvider, QueryProvider)
- Router: `src/router/` (AppRouter, RouteGuard)
- Types: `src/types/` (database.ts auto-generated, app types)
- Tests: `src/__tests__/properties/` and `src/__tests__/unit/`

## Coding Standards
- Use `@/` path alias for all imports
- Use Zod schemas for all form validation (shared between client and Edge Functions)
- All database queries go through TanStack Query hooks, never raw supabase calls in components
- All admin mutations must log to audit_logs via the auditLogger utility
- Use Shadcn/ui components as the base — never raw HTML for interactive elements
- Prefer `const` arrow functions for components: `const MyComponent = () => {}`
- Export types/interfaces from dedicated type files, not inline
- Use Sonner for all toast notifications
- Use nuqs for URL-persisted filter/search state in list pages

## Supabase Conventions
- RLS enabled on ALL tables — no exceptions
- Use `auth_user_role()` and `auth_institution_id()` helper functions in RLS policies
- Edge Functions for complex server-side logic (bulk import, evidence rollup, PDF gen)
- Generate types after every migration: `npx supabase gen types --linked > src/types/database.ts`
- Sync migrations locally: `npx supabase migration fetch --yes`
- Use MCP `apply_migration` for DDL changes, `execute_sql` for data queries
- pg_cron for scheduled jobs (streak risk, weekly summary, at-risk signals, perfect day prompt, AI predictions)
- pg_net for HTTP calls from database triggers

## Edge Functions (Deno)
- Resend (transactional email — used only in Edge Functions, not in React app)
- Edge Functions run on Deno runtime — npm packages are NOT installed for them
- Secrets stored via Supabase Dashboard or CLI: RESEND_API_KEY

## Testing
- Vitest as test runner (`npm test` runs `vitest --run`)
- Property-based tests with fast-check (min 100 iterations per property)
- Component tests with Testing Library
- Property tests reference design doc: `// Feature: edeviser-platform, Property N: ...`
- Test files: `*.property.test.ts` and `*.test.ts`

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key
- Stored in `.env.local` (gitignored)

# Project Conventions (adapted from Kiro steering/project-conventions.md)

- Edeviser is a Human-Centric OBE + Gamification platform for higher education, targeting the Qatar market with full Arabic/English bilingual support.
- Tech stack: React 18 + TypeScript (strict), Vite 6, Tailwind CSS v4 + Shadcn/ui (New York), TanStack Query v5, TanStack Table, React Hook Form + Zod, Supabase (PostgreSQL + RLS, Edge Functions in Deno, Realtime, Storage), i18next (Arabic/English, RTL), Vitest + fast-check.
- No `any` types — use `unknown` with type guards or proper interfaces.
- All database queries go through TanStack Query hooks in `src/hooks/`.
- Business logic lives in `src/lib/`, not in components or hooks.
- Use Shadcn/ui components — never raw HTML for interactive elements.
- Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) not physical (`ml-*`, `mr-*`).
- Icon wrappers/badges in section/card headers MUST use transparent (`bg-transparent`) or white liquid glass (`bg-white/80 border border-slate-200/60 backdrop-blur-xs`) backgrounds — never solid colored fills.
- Use `@/` path alias for all imports.
- Use Sonner for toast notifications.
- Use Zod schemas for all form validation.
- File structure: components in `src/components/ui/` (Shadcn) and `src/components/shared/` (custom); pages in `src/pages/{role}/` (admin, coordinator, teacher, student, parent); hooks in `src/hooks/`; lib in `src/lib/`; locales in `src/locales/{en,ar}/`.
- Do NOT modify: `supabase/migrations/` (managed via Supabase MCP), `.kiro/`, `src/types/database.ts` (auto-generated), `.env.local` (secrets, gitignored).
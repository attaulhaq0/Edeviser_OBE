ayer maek hooks a# Engineering Guardrails (adapted from Kiro steering/engineering-guardrails.md)

- Pre-commit checks (run in order before any PR):
  1. `npm run lint` — ESLint with zero warnings
  2. `npx tsc --noEmit` — TypeScript type checking
  3. `npm test` — Vitest test suite (runs `vitest --run`)
- No `any` types — use `unknown` with type guards or proper interfaces.
- All database queries go through TanStack Query hooks in `src/hooks/`.
- Business logic lives in `src/lib/`, not in components or hooks.
- Use Shadcn/ui components — never raw HTML for interactive elements.
- Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) not physical (`ml-*`, `mr-*`).
- Icon wrappers/badges in section/card headers MUST use transparent (`bg-transparent`) or white liquid glass (`bg-white/80 border border-slate-200/60 backdrop-blur-xs`) backgrounds — never solid colored fills.
- Use `@/` path alias for all imports.
- Use Sonner for toast notifications.
- Use Zod schemas for all form validation.
- Do NOT modify: `supabase/migrations/` (managed via Supabase MCP), `.kiro/`, `src/types/database.ts` (auto-generated), `.env.local` (secrets, gitignored).
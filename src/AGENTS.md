# src/ — Frontend Agent Instructions

Scope: React SPA. Root [`AGENTS.md`](../AGENTS.md) applies; this file adds frontend specifics.

## Layering & boundaries

- `app/` — router, providers, layouts, role guards. Route registry only; no business logic.
- `features/<domain>/` — preferred home for new domain work. Each feature owns its
  `components/ hooks/ lib/ schemas/`; the outside world imports ONLY via its barrel
  `index.ts`. Do not reach into another feature's internals.
- `components/ui/` = Shadcn primitives (regenerate via CLI, don't hand-hack).
  `components/shared/` = cross-feature custom components.
- `hooks/` = global cross-feature TanStack Query hooks only; feature-specific hooks live in
  their feature folder.
- `lib/` = framework-free business logic and clients. No React imports allowed here.
- `pages/{role}/` are thin route targets that compose features/components.

## Conventions (enforced by review + lint)

- No `any` — use `unknown` + type guards.
- Logical CSS utilities only: `ms-/me-/ps-/pe-` (never `ml-/mr-/pl-/pr-`).
- Shadcn/ui for interactive elements — never raw HTML controls.
- Sonner for toasts · Zod for every form schema · `@/` alias for imports.
- Icon wrappers/badges in section/card headers: transparent or white liquid-glass
  backgrounds only (`bg-transparent`, `bg-white/80 border-slate-200/60 backdrop-blur-xs`).
- All user-facing strings localized in BOTH `locales/en` and `locales/ar`
  (`npm run i18n:check` must pass); design for RTL.

## Types

- `types/database.ts` is GENERATED from the live Supabase schema — never edit.
  Hand-written domain types go in `types/domain/`.

## Testing

- Unit/component tests colocated as `*.test.ts(x)` or under `src/__tests__/unit/`.
- Property tests: `src/__tests__/properties/*.property.test.ts` (fast-check, ≥100 iterations,
  comment referencing the design doc property).

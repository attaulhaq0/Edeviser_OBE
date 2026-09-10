# Frontend Dependency Rules

> Machine-enforceable architectural boundaries.

---

## Allowed Imports

| From | May Import |
|---|---|
| `src/types/` | Nothing (pure types) |
| `src/lib/` | `src/types/`, other `src/lib/` |
| `src/hooks/` | `src/lib/`, `src/types/`, Supabase client |
| `src/providers/` | `src/hooks/`, `src/lib/`, `src/types/` |
| `src/design-system/` | `src/lib/utils.ts`, Radix/Shadcn primitives, Tailwind |
| `src/components/ui/` | Radix primitives, `src/lib/utils.ts` |
| `src/components/shared/` | Everything except circular |
| `src/features/` | Everything below |
| `src/pages/` | Everything below |
| `src/app/` | Components |
| `src/router/` | Pages (lazy), RouteGuard |

## Forbidden Imports

| From | Must NOT Import |
|---|---|
| `src/lib/` | ❌ `src/components/`, `src/design-system/`, `src/pages/` |
| `src/design-system/` | ❌ `src/hooks/`, Supabase, `src/pages/`, `src/features/` |
| `src/hooks/` | ❌ `src/design-system/`, visual code |
| `src/components/ui/` | ❌ `src/hooks/`, Supabase, domain logic |
| `src/types/` | ❌ Anything (runtime) |

## Current Violations

| File | Violation | Severity |
|---|---|---|
| `components/shared/EmailVerificationBanner.tsx` | Direct Supabase import | LOW |
| `components/shared/ExportDataButton.tsx` | Direct Supabase import | LOW |
| `components/shared/HabitTracker.tsx` | Direct Supabase import | LOW |
| `components/shared/ToSAcceptanceDialog.tsx` | Direct Supabase import | LOW |

**All other boundaries are clean.** `lib/` has 0 UI imports, `design-system/` has 0 data imports.
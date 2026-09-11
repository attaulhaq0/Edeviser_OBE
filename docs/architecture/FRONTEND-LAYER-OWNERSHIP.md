# Frontend Layer Ownership

> What each directory owns, what it may import, and what it must not.

---

## `src/types/` — Type Definitions

| Concern | Rule |
|---|---|
| **Purpose** | Shared TypeScript types, Supabase-generated database types |
| **May import** | Nothing (pure type definitions) |
| **Must NOT import** | Any runtime code |
| **Canonical file** | `src/types/database.ts` (auto-generated — DO NOT EDIT) |

## `src/lib/` — Business Logic

| Concern | Rule |
|---|---|
| **Purpose** | Domain logic, utilities, schemas, pure functions, validators |
| **May import** | `src/types/`, other `src/lib/` files |
| **Must NOT import** | `src/components/`, `src/design-system/`, `src/pages/`, UI code |
| **Verified** | 0 UI imports — clean |

## `src/hooks/` — Data Access

| Concern | Rule |
|---|---|
| **Purpose** | TanStack Query hooks, Supabase queries, mutations |
| **May import** | `src/lib/`, `src/types/`, Supabase client |
| **Must NOT import** | `src/design-system/`, visual code |

## `src/providers/` — Application State

| Concern | Rule |
|---|---|
| **Purpose** | React contexts — Auth, theme, i18n |
| **May import** | `src/hooks/`, `src/lib/`, `src/types/` |

## `src/design-system/` — Visual System

| Concern | Rule |
|---|---|
| **Purpose** | Design tokens, canonical primitives, reusable patterns |
| **May import** | `src/lib/utils.ts` (cn helper), `src/types/`, Shadcn/Radix primitives |
| **Must NOT import** | `src/hooks/`, `src/lib/` (business logic), Supabase, `src/pages/` |
| **Verified** | 0 hook imports, 0 Supabase imports — clean |

### Sub-layers:
- **primitives/** — Shadcn-derived base components
- **patterns/** — Canonical compositions (17 files)
- **mascot/** — Character system
- **design-system/** — Tokens, PARITY.md

## `src/components/ui/` — Shadcn Primitives

| Concern | Rule |
|---|---|
| **Purpose** | Raw Shadcn/Radix base components |
| **May import** | Radix primitives, `src/lib/utils.ts` |
| **23 files** — do not add domain logic |

## `src/components/shared/` — Shared Application UI

| Concern | Rule |
|---|---|
| **Purpose** | Cross-cutting UI, domain-aware components, feature UI |
| **May import** | Everything (hooks, lib, design-system, ui) |
| **236 files** — largest layer, mixed concerns |
| **Current violation** | 4 files import Supabase directly |

## `src/features/` — Feature Modules

| Concern | Rule |
|---|---|
| **Purpose** | Colocated feature logic + UI per domain |
| **May import** | hooks, lib, components, design-system |
| **43 files** — thin layer, mostly dashboard screens |

## `src/pages/` — Route Entry Points

| Concern | Rule |
|---|---|
| **Purpose** | Route-level page components |
| **May import** | Everything below (features, components, hooks, lib) |
| **217 files** — organized by role |

## `src/app/` — Application Shell

| Concern | Rule |
|---|---|
| **Purpose** | Global layout shell — sidebar, header, mobile nav |
| **2 files** — `RoleAppShell.tsx` |
| **May import** | Components (Sidebar, MobileTabBar, GlobalHeader) |

## `src/router/` — Routing

| Concern | Rule |
|---|---|
| **Purpose** | Route definitions, lazy loading, auth guards |
| **2 files** — `AppRouter.tsx` + `RouteGuard.tsx` |
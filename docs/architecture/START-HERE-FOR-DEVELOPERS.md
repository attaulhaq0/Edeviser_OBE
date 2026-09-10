# Start Here — For Developers

> Practical guide to finding the right file for every change.

---

## I want to change a global visual style

| Change | Go here |
|---|---|
| Brand colors | `src/design-system/design-system/tokens.css` |
| Typography | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §6` + `src/index.css` |
| Card radius | `src/design-system/design-system/tokens.css` → PCard/Shadcn Card |
| Button style | `src/design-system/primitives/Button.tsx` |
| Icon treatment | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §4` |

## I want to change a reusable component

| Component | File |
|---|---|
| Card (white elevated) | `src/design-system/patterns/PCard.tsx` |
| Button (tactile gradient) | `src/design-system/primitives/Button.tsx` variant=tactile |
| Gradient section header | `src/design-system/patterns/GradientCardHeader.tsx` |
| Section title + icon | `src/design-system/patterns/SectionHeader.tsx` |
| KPI metric card | `src/design-system/patterns/KPICard.tsx` |
| Hero carousel | `src/design-system/patterns/HeroCarousel.tsx` |
| Welcome greeting | `src/design-system/patterns/WelcomeHero.tsx` |
| Mastery ring | `src/design-system/patterns/MasteryRing.tsx` |
| Severity/status icon | `src/design-system/patterns/SeverityIcon.tsx` |
| Loading shimmer | `src/design-system/patterns/Shimmer.tsx` |
| Empty state | `src/design-system/patterns/StatePanel.tsx` |
| Page title header | `src/design-system/patterns/PageHeader.tsx` |
| Table wrapper | `src/components/shared/DataTable.tsx` |

## I want to add a new page

1. Create page: `src/pages/{role}/NewPage.tsx`
2. Add route: `src/router/AppRouter.tsx`
3. Add nav item: `src/lib/navItems.ts`
4. Run: `npm run check:critical-routes`

## I want to add a new feature

1. Feature logic: `src/features/{domain}/` (colocate hooks + UI)
2. Data access: `src/hooks/use{Feature}.ts`
3. Business logic: `src/lib/{feature}Utils.ts`

## I want to change data behavior

| Change | Go here |
|---|---|
| Database query | `src/hooks/use{Entity}.ts` |
| Business rule | `src/lib/` |
| API contract | Supabase types in `src/types/database.ts` (auto-generated) |
| RLS policy | `supabase/migrations/` (via Supabase MCP only) |

## I want to change navigation

| Change | Go here |
|---|---|
| Desktop sidebar | `src/components/shared/Sidebar.tsx` |
| Mobile tabs | `src/components/shared/MobileTabBar.tsx` |
| Nav items | `src/lib/navItems.ts` |
| App shell | `src/app/RoleAppShell.tsx` |
| Route guard | `src/router/RouteGuard.tsx` |

## I want to change responsive behavior

| Change | Go here |
|---|---|
| Breakpoints | `src/app/RoleAppShell.tsx` (640px primary) |
| Mobile layout | `src/app/RoleAppShell.tsx` + component-level classes |
| Tablet behavior | Within components (no dedicated tablet layer) |

## I want to understand the architecture

→ `docs/architecture/EDEVISER-FRONTEND-MASTER-MAP.md`
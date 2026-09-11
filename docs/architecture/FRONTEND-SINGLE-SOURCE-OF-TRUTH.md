# Frontend — Single Source of Truth

> Every important concern has exactly ONE canonical file.

---

| Concern | Canonical Source | Current Implementation | Consumers |
|---|---|---|---|
| **Brand gradient** | `src/design-system/design-system/tokens.css` (`--brand-gradient`) | All via CSS variable | GradientCardHeader, Button (tactile) |
| **Hero gradient** | `src/design-system/patterns/HeroCarousel.tsx` (inline style) | `var(--hero-gradient)` | All 4 dashboards |
| **Typography scale** | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §6` | Inline Tailwind classes | All pages |
| **Spacing system** | Tailwind v4 scale + `src/index.css` tokens | Tailwind classes | All components |
| **Card radius** | Shadcn default (12px) via `Card` component | `src/components/ui/card.tsx` | All cards |
| **Button** | `src/design-system/primitives/Button.tsx` | Shadcn + tactile variant | All buttons |
| **Gradient header** | `src/design-system/patterns/GradientCardHeader.tsx` | Re-exported from `components/shared/` | Section cards |
| **Section title** | `src/design-system/patterns/SectionHeader.tsx` | Single implementation | Page sections |
| **KPI card** | `src/design-system/patterns/KPICard.tsx` | Single implementation | Dashboards |
| **Hero carousel** | `src/design-system/patterns/HeroCarousel.tsx` | Single implementation | 4/5 dashboards |
| **Data table** | `src/components/shared/DataTable.tsx` | TanStack Table wrapper | List pages |
| **Empty state** | `src/components/shared/EmptyState.tsx` | With icon/title/CTA | Data views |
| **Loading state** | `src/design-system/patterns/Shimmer.tsx` | Skeleton placeholder | Data views |
| **Error boundary** | `src/components/shared/ErrorBoundary.tsx` | React error boundary | Route level |
| **Navigation items** | `src/lib/navItems.ts` | Single array per role | Sidebar, MobileTabBar |
| **Routes** | `src/router/AppRouter.tsx` | 140 routes | All pages |
| **Auth** | `src/providers/AuthProvider.tsx` | Supabase GoTrue | All roles |
| **Permissions** | `src/router/RouteGuard.tsx` + RLS | Role-based + DB | All routes |
| **Attainment colors** | `src/lib/attainmentClassifier.ts` | Semantic functions | Badges, rings |
| **Bloom's colors** | `src/lib/bloomsVerbs.ts` | Domain constants | CLO forms |
| **League colors** | `src/lib/leagueTier.ts` | Domain constants | Leaderboard |
| **Desktop shell** | `src/app/RoleAppShell.tsx` | 3-col CSS grid | All roles |
| **Mobile navigation** | `src/components/shared/MobileTabBar.tsx` | Bottom tab bar | Student, Parent |
| **Responsive breakpoints** | `src/app/RoleAppShell.tsx` (640px primary) | CSS grid | All roles |
| **Design lint rules** | `scripts/design-lint/check.mjs` | Node script | CI/lint |
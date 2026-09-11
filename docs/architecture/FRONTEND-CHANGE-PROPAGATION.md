# Frontend Change Propagation

> One canonical change → global effect. Verified matrix.

---

## Global Change Matrix

| Change | Canonical Owner | Files Changed Today | Target Files | Assessment |
|---|---|---|---|---|
| **Button style** | `src/design-system/primitives/Button.tsx` | 1 → all consumers via component | 1 | ✅ Good |
| **Card radius** | Shadcn `Card` component | 1 → all via Shadcn | 1 | ✅ Good |
| **Brand gradient** | `--brand-gradient` CSS variable | 1 → all via token | 1 | ✅ Good |
| **Typography** | Inline Tailwind (no central token) | ~200 pages with hardcoded classes | ~200 | ⚠️ Needs tokenization |
| **Spacing** | Tailwind defaults + page-level | ~200 pages | ~200 | ⚠️ Decentralized |
| **Gradient header** | `GradientCardHeader.tsx` | 1 → ~20 consumers | 1 | ✅ Good |
| **KPI card** | `KPICard.tsx` | 1 → ~50 consumers | 1 | ✅ Good |
| **Hero carousel** | `HeroCarousel.tsx` | 1 → 4 dashboards | 1 | ✅ Good |
| **Navigation items** | `navItems.ts` | 1 → sidebar + mobile tabs | 1 | ✅ Good |
| **Data table** | `DataTable.tsx` | 1 → ~40 list pages | 1 | ✅ Good |
| **Mobile nav** | `MobileTabBar.tsx` | 1 → 2 roles | 1 | ✅ Good |
| **Empty state** | `EmptyState.tsx` | 1 → ~30 consumers | 1 | ✅ Good |
| **Loading (shimmer)** | `Shimmer.tsx` | 1 → ~50 consumers | 1 | ✅ Good |
| **Semantic colors** | `attainmentClassifier.ts` etc. | 1 → all badges | 1 | ✅ Good |
| **Page shell** | `RoleAppShell.tsx` | 1 → all roles | 1 | ✅ Good |
| **Route config** | `AppRouter.tsx` | 1 → all routes | 1 | ✅ Good |

---

## Key Finding

**Most canonical sources already propagate globally.** The architecture supports single-point changes for the majority of concerns. The main gaps are typography (decentralized Tailwind classes) and spacing (page-level overrides).

## Highest Leverage Improvements

1. **Typography tokenization** — centralize font sizes/weights into design tokens (currently inline Tailwind across ~200 pages)
2. **Spacing tokenization** — centralize section/card spacing rules
3. **Components/shared/ deduplication** — the 236-file layer has mixed concerns; 20+ files are legacy re-export shims
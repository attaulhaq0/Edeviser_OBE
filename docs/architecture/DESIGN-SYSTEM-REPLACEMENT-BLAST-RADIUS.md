# Design-System Replacement — Blast Radius Analysis

> If Edeviser receives a new Figma design system tomorrow, what must change?

---

## Current State: Level 3

**Design system is well isolated.** 0 hooks, 0 Supabase imports in `src/design-system/`.

---

## Blast Radius by Concern

| Concern | Must Change | Should NOT Change | Risk |
|---|---|---|---|
| **Colors** | `tokens.css`, `index.css`, semantic color libs | Domain logic (`attainmentClassifier` returns classes, not hex) | LOW — colors are tokenized or semantic |
| **Typography** | ~200 pages with inline Tailwind classes | Nothing else | **HIGH** — no central typography token |
| **Spacing** | ~200 pages with page-level Tailwind | Nothing else | **HIGH** — no central spacing token |
| **Buttons** | `Button.tsx` (1 file) | All 200+ consumers | LOW — centralized |
| **Cards** | Shadcn `Card` + `PCard.tsx` | All 200+ consumers | LOW — centralized |
| **Icons** | Lucide icon map in PARITY.md | All icon consumers | LOW — centralized |
| **Gradient headers** | `GradientCardHeader.tsx` (1 file) | ~20 consumers | LOW — centralized |
| **KPIs** | `KPICard.tsx` (1 file) | ~50 consumers | LOW — centralized |
| **Navigation** | `Sidebar.tsx` + `MobileTabBar.tsx` + `RoleAppShell.tsx` | Nav items (`navItems.ts`) | LOW — centralized |
| **Hero** | `HeroCarousel.tsx` + `WelcomeHero.tsx` | Dashboard data hooks | LOW — centralized |
| **Tables** | `DataTable.tsx` (1 file) | ~40 consumers | LOW — centralized |
| **Forms** | Shadcn form components + Zod schemas | Validation schemas (`src/lib/schemas/`) | LOW — visual via Shadcn, logic separate |
| **Dialog/Sheet** | Shadcn dialog components | Dialog invocation logic | LOW — centralized |
| **Loading** | `Shimmer.tsx` (1 file) | ~50 consumers | LOW — centralized |
| **Empty state** | `EmptyState.tsx` (1 file) | ~30 consumers | LOW — centralized |

---

## HIGH-RISK Areas (Decentralized)

| Area | Files Affected | Reason |
|---|---|---|
| **Typography** | ~200 | Inline Tailwind classes, no central token |
| **Spacing** | ~200 | Page-level margins/padding, no central token |
| **Card radius** | Shadcn default (12px) | Changed via Shadcn Card update |

## LOW-RISK Areas (Centralized)

17 of 20 concerns change via a single file. The architecture is already well-prepared for design-system replacement.

---

## Accidental Coupling Found

| Coupling | Count | Risk |
|---|---|---|
| Components directly importing Supabase | 4 files | LOW — bypass hooks layer |
| Legacy re-export shims | 20+ files | LOW — thin wrappers, can be removed |

## Necessary Coupling (by Design)

| Coupling | Why |
|---|---|
| Lucide icons → design-system | Icons are the visual primitive — intentional |
| Shadcn → design-system primitives | Shadcn is the current implementation of canonical primitives |
| Tailwind → all components | Tailwind is the CSS framework — intentional |
| TanStack Query → hooks | The data access pattern — intentional |

---

## Target: Level 4 (Highly Replaceable)

**Required to reach Level 4:**
1. Typography tokens → centralize font size/weight into `tokens.css`
2. Spacing tokens → centralize section/card spacing into design tokens
3. Remove 4 direct Supabase imports from components
4. Remove legacy re-export shims (migrate consumers to `@/design-system`)

**Required to reach Level 5:**

Additional 236 `components/shared/` reorganization — move domain-aware UI to `features/`, generic patterns to `design-system/patterns/`, remove duplicates.
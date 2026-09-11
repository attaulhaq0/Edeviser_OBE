# Edeviser — Frontend Master Architecture Map

> **Read this first** to understand the frontend's real organization.

---

## Repository Layer Map

```
src/
│
├── types/          (6 files)   Type definitions, Supabase-generated types
├── lib/            (270 files)  BUSINESS LOGIC — domain models, utilities, schemas, pure functions
├── hooks/          (256 files)  DATA ACCESS — TanStack Query hooks, Supabase queries, mutations
├── providers/      (6 files)    APP STATE — Auth, theme, i18n contexts
├── stores/         (1 file)     CLIENT STATE — Zustand stores
│
├── design-system/  (55 files)   DESIGN SYSTEM
│   ├── primitives/              Shadcn-derived base components (Button, Card, Input…)
│   ├── patterns/                Canonical reusable compositions (HeroCarousel, KPICard…)
│   ├── mascot/                  Character system (Foxi, Owlie, Pengu)
│   └── design-system/           Token CSS, PARITY.md contract
│
├── components/     (264 files)  UI COMPONENTS
│   ├── ui/         (23 files)   Shadcn/Radix base primitives
│   └── shared/     (236 files)  Application-level shared components
│
├── features/       (43 files)   FEATURE MODULES — colocated feature logic + UI
│   ├── coordinator/dashboard/
│   ├── teacher/dashboard/
│   ├── student/dashboard/profile/friends/
│   └── parent/dashboard/
│
├── pages/          (217 files)  PAGE COMPONENTS — route-level entry points
│   ├── admin/
│   ├── coordinator/
│   ├── teacher/
│   ├── student/
│   ├── parent/
│   └── shared/                  Cross-role pages (calendar, timetable, profile)
│
├── router/         (2 files)    ROUTING — AppRouter, RouteGuard
├── app/            (2 files)    APP SHELL — RoleAppShell
├── ai/             (33 files)   AI MODULE — Agent chat, suggestions, governance
├── locales/        (18 files)   I18N — en/ar translation files
├── styles/         (1 file)     GLOBAL CSS — index.css
└── test/           (1 file)     TEST UTILITIES
```

---

## Dependency Direction (VERIFIED via import analysis)

```
                    types/
                       ↑
                    lib/         ← BUSINESS LOGIC (0 UI imports verified)
                       ↑
                    hooks/       ← DATA ACCESS (queries, mutations)
                       ↑
                    providers/   ← APP STATE
                       ↑
              ┌────────┼────────┐
              │                 │
         design-system/    components/
         (55 files)        (264 files)
              ↑                 ↑
              └────────┬────────┘
                       ↑
                   features/    ← FEATURE MODULES
                       ↑
                    pages/      ← ROUTE ENTRY POINTS
                       ↑
                    router/     ← ROUTING
                       ↑
                     app/       ← APP SHELL
```

---

## Architectural Violations Found

| Severity | Location | Issue |
|---|---|---|
| LOW | `components/shared/EmailVerificationBanner.tsx` | Directly imports `supabase` client |
| LOW | `components/shared/ExportDataButton.tsx` | Directly imports `supabase` client |
| LOW | `components/shared/HabitTracker.tsx` | Directly imports `supabase` client |
| LOW | `components/shared/ToSAcceptanceDialog.tsx` | Directly imports `supabase` client |
| NONE | `lib/` → UI components | 0 files — clean separation |
| NONE | `design-system/` → hooks | 0 files — clean separation |
| NONE | `design-system/` → supabase | 0 files — clean separation |

**Assessment:** Architecture is remarkably clean. Only 4 components bypass the hooks layer for Supabase access — these should eventually use dedicated hooks.

---

## Key Architectural Principles (ACTUAL, not aspirational)

1. **lib/** owns business logic and is UI-free (verified: 0 component imports)
2. **hooks/** owns data access via TanStack Query (256 files)
3. **design-system/** owns visual primitives and patterns (55 files, 0 data imports)
4. **components/shared/** is the largest layer (236 files) — contains both generic UI and domain-aware components
5. **features/** is a thin layer (43 files) — mostly dashboard screens
6. **pages/** owns route entry points (217 files) — by role

---

## Components/Shared Classification

The 236 `components/shared/` files include:

| Sub-category | Examples | Count (est.) |
|---|---|---|
| **Cross-cutting UI** | ErrorBoundary, EmptyState, Shimmer, DataTable | ~30 |
| **Domain-aware UI** | CoordinatorOutcomeAttainment, TeacherDashboardNew, ChallengeLeaderboard | ~60 |
| **Feature components** | HabitGrid, StreakDisplay, FocusTimer | ~40 |
| **Legacy wrappers** | StudentDashboardNew, TeacherDashboardNew (re-export shims) | ~20 |
| **Auth/admin UI** | EmailVerificationBanner, ProfileDropdown | ~15 |
| **Design-system shims** | WelcomeHero.ts, GradientCardHeader.ts (re-export from design-system) | ~10 |
| **Misc/small components** | Various utility components | ~60 |

**Key finding:** `components/shared/` mixes concerns — domain-aware UI, generic UI, and feature components all coexist. This is the largest architectural opportunity for reorganization.

---

## Design-System Replacement Readiness

**Current Level: 3 (Strong design-system boundary)**

The design-system module is already well-isolated:
- 0 imports from hooks/ (verified)
- 0 imports from supabase (verified)
- 17 canonical patterns defined
- Automated lint enforcement via `scripts/design-lint/`
- Token system in `src/design-system/design-system/tokens.css`

**Remaining coupling to resolve for Level 4:**
- `components/shared/` files that should migrate to `design-system/patterns/` or `features/`
- 4 components directly importing supabase
- Some legacy re-export shims still in `components/shared/`
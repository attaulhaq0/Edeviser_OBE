# Canonical Component Registry

> Every reusable component and its architectural classification.

---

## CANONICAL (Single source, use everywhere)

| Component | Layer | File | Replaces |
|---|---|---|---|
| **Button** (incl. tactile) | Primitive | `src/design-system/primitives/Button.tsx` | Raw `<button>`, `from-teal-500` buttons |
| **Card** | Primitive | `src/design-system/primitives/Card.tsx` (Shadcn) | Raw card divs |
| **PCard** | Pattern | `src/design-system/patterns/PCard.tsx` | Elevated white card |
| **GradientCardHeader** | Pattern | `src/design-system/patterns/GradientCardHeader.tsx` | Raw gradient headers |
| **SectionHeader** | Pattern | `src/design-system/patterns/SectionHeader.tsx` | Section title + icon chip |
| **KPICard** | Pattern | `src/design-system/patterns/KPICard.tsx` | Metric cards |
| **HeroCarousel** | Pattern | `src/design-system/patterns/HeroCarousel.tsx` | Dashboard hero |
| **WelcomeHero** | Pattern | `src/design-system/patterns/WelcomeHero.tsx` | Static hero greeting |
| **MasteryRing** | Pattern | `src/design-system/patterns/MasteryRing.tsx` | Attainment progress |
| **SeverityIcon** | Pattern | `src/design-system/patterns/SeverityIcon.tsx` | Status icon tile |
| **Shimmer** | Pattern | `src/design-system/patterns/Shimmer.tsx` | Loading skeleton |
| **StatePanel** | Pattern | `src/design-system/patterns/StatePanel.tsx` | Empty/error/loading states |
| **PageHeader** | Pattern | `src/design-system/patterns/PageHeader.tsx` | Page title + subtitle |
| **SectionCard** | Pattern | `src/design-system/patterns/SectionCard.tsx` | Gradient header card |
| **HeroCard** | Pattern | `src/design-system/patterns/HeroCard.tsx` | Dark gradient hero card |
| **StatusDot** | Pattern | `src/design-system/patterns/StatusDot.tsx` | Color-coded dot |
| **EMeter** | Pattern | `src/design-system/patterns/EMeter.tsx` | Progress bar |

## SHARED (Cross-cutting, not yet canonicalized)

| Component | Layer | File |
|---|---|---|
| **DataTable** | Shared UI | `src/components/shared/DataTable.tsx` |
| **EmptyState** | Shared UI | `src/components/shared/EmptyState.tsx` |
| **ErrorBoundary** | Shared UI | `src/components/shared/ErrorBoundary.tsx` |
| **Sidebar** | Navigation | `src/components/shared/Sidebar.tsx` |
| **MobileTabBar** | Navigation | `src/components/shared/MobileTabBar.tsx` |
| **GlobalHeader** | Navigation | `src/components/shared/GlobalHeader.tsx` |

## LEGACY / DEPRECATED

| Component | Status | Replacement |
|---|---|---|
| `GradientCardHeader.ts` (re-export) | Shimming | Import from `@/design-system` directly |
| `WelcomeHero.ts` (re-export) | Shimming | Import from `@/design-system` directly |
| `StudentDashboardNew.tsx` | Legacy flag-gated | `StudentDashboardScreen.tsx` |
| `TeacherDashboardNew.tsx` | Legacy flag-gated | `TeacherDashboardScreen.tsx` |
| `CoordinatorDashboardNew.tsx` | Legacy flag-gated | `CoordinatorDashboardScreen.tsx` |
| `AdminDashboardNew.tsx` | Legacy flag-gated | `AdminDashboardScreen.tsx` |
| `ParentDashboardNew.tsx` | Legacy flag-gated | `ParentDashboardScreen.tsx` |

## DOMAIN-SPECIFIC (Allowed to understand business concepts)

| Component | Domain |
|---|---|
| `CoordinatorOutcomeAttainmentNew.tsx` | Coordinator — outcome attainment |
| `ChallengeLeaderboard.tsx` | Gamification — leaderboard |
| `HabitGrid.tsx` | Student — habit tracking |
| `StreakDisplay.tsx` | Gamification — streak |
| `LevelProgress.tsx` | Gamification — level/XP |

## FIGMA TRANSLATION STRATEGY

For each canonical component:
1. Identify corresponding Figma component
2. Extract visual properties → design tokens
3. Update component implementation to use new tokens
4. Consumers remain unchanged
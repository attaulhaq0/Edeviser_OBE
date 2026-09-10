# Design System — Documentation Map (Rule → Code Traceability)

> Trace every design rule to its implementation location.

---

## Brand Identity

| Rule | Code |
|---|---|
| Brand gradient | `src/design-system/design-system/tokens.css` (`--brand-gradient`) |
| Brand blue | `src/design-system/design-system/tokens.css` (`--brand-primary`) |
| Hero gradient | `src/design-system/patterns/WelcomeHero.tsx`, `HeroCarousel.tsx` |

## Typography

| Rule | Code |
|---|---|
| Page title (`text-2xl font-bold`) | Used inline in page components |
| Section heading | `src/design-system/patterns/SectionHeader.tsx` |
| KPI value | `src/design-system/patterns/KPICard.tsx` |
| Body text | Tailwind defaults + `index.css` |

## Components

| Component | Implementation |
|---|---|
| Button (tactile) | `src/design-system/primitives/Button.tsx` |
| Card (elevated) | `src/design-system/primitives/Card.tsx` |
| GradientCardHeader | `src/design-system/patterns/GradientCardHeader.tsx` |
| SectionHeader | `src/design-system/patterns/SectionHeader.tsx` |
| KPICard | `src/design-system/patterns/KPICard.tsx` |
| HeroCarousel | `src/design-system/patterns/HeroCarousel.tsx` |
| WelcomeHero | `src/design-system/patterns/WelcomeHero.tsx` |
| MasteryRing | `src/design-system/patterns/MasteryRing.tsx` |
| SeverityIcon | `src/design-system/patterns/SeverityIcon.tsx` |
| PCard | `src/design-system/patterns/PCard.tsx` |
| Shimmer | `src/design-system/patterns/Shimmer.tsx` |
| EmptyState | `src/design-system/patterns/EmptyState.tsx` |
| StatePanel | `src/design-system/patterns/StatePanel.tsx` |
| PageHeader | `src/design-system/patterns/PageHeader.tsx` |
| StatusDot | `src/design-system/patterns/StatusDot.tsx` |
| EMeter | `src/design-system/patterns/EMeter.tsx` |

## Semantic Colors

| Rule | Code |
|---|---|
| Attainment levels | `src/lib/attainmentClassifier.ts` |
| Bloom's taxonomy | `src/lib/bloomsVerbs.ts` |
| Gamification (leagues) | `src/lib/leagueTier.ts` |
| AI governance | `src/lib/aiGovernancePolicy.ts` |

## Responsive

| Rule | Code |
|---|---|
| App shell grid | `src/app/RoleAppShell.tsx` |
| Mobile nav | `src/components/shared/MobileTabBar.tsx` |
| Desktop sidebar | `src/components/shared/Sidebar.tsx` |
| Breakpoint tokens | `src/index.css` |

## Automation

| Rule | Code |
|---|---|
| Icon wrapper check | `scripts/design-lint/check.mjs` |
| Legacy gradient check | `scripts/design-lint/check.mjs` |
| Physical CSS check | `scripts/design-lint/check.mjs` |
| Brand gradient check | `scripts/design-lint/check.mjs` |
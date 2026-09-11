# Prototype Parity Backlog

> **Purpose:** Actionable backlog of prototype-production mismatches with canonical resolution paths.
> **Version:** 2026-09-10
> **Based on:** Full prototype parity audit (`docs/audits/full-prototype-parity-2026-09-10.md`)

---

## PAR-001: Hero Carousel Implementation

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Roles** | All 5 (Admin, Coordinator, Teacher, Student, Parent) |
| **Routes** | All dashboard routes |
| **Prototype** | `.hero-carousel` in all role dashboard HTML files |
| **Current** | `WelcomeHero` — single static slide |
| **Target** | Multi-slide carousel: dots, auto-advance, swipe, contextual slides per role |
| **Root Cause** | `WelcomeHero` component only implements one slide; carousel behavior not in codebase |
| **Canonical Component** | New `HeroCarousel` component in `@/design-system` |
| **Affected Consumers** | All 5 role dashboards |
| **Status** | NOT STARTED |

### Slides per role (from prototype):

- **Student (4 slides):** Greeting + XP/level, Streak risk alert, Class rank movement, Nearby badge unlock
- **Admin (3 slides):** Institution status, Executive watch-item, AI governance snapshot
- **Coordinator (3 slides):** Program health, PLO alert, Accreditation readiness
- **Teacher (3 slides):** Status + jump-in chips, This week's momentum, Today's schedule
- **Parent (1 slide):** AI story banner (uses distinct story-gradient)

---

## PAR-002: Student Mobile Bottom Tab Bar

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Roles** | Student |
| **Routes** | All student routes |
| **Prototype** | `.bottom-bar` with 5 tabs: Home, Learn, AI Tutor, Growth, You |
| **Current** | Sidebar hidden on mobile (`hidden md:block`), no mobile navigation |
| **Target** | Fixed bottom tab bar on mobile viewports matching prototype design |
| **Root Cause** | No `BottomTabBar` component exists; `StudentLayout` hides sidebar without alternative |
| **Canonical Component** | New `BottomTabBar` in `@/design-system` |
| **Affected Consumers** | `StudentLayout`, all student pages |
| **Status** | NOT STARTED |

---

## PAR-003: Parent Story Banner Gradient

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Roles** | Parent |
| **Routes** | `/parent/dashboard` |
| **Prototype** | `.ai-banner` with `linear-gradient(135deg,#065f46,#1e3a8a)` |
| **Current** | Standard `WelcomeHero` with `var(--hero-gradient)` |
| **Target** | Parent dashboard hero uses story-gradient per prototype |
| **Root Cause** | `WelcomeHero` has no variant prop for story-gradient |
| **Canonical Component** | Add `variant="story"` to `WelcomeHero` |
| **Affected Consumers** | `ParentDashboard` |
| **Status** | NOT STARTED |

---

## PAR-004: Empty State Coverage

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Roles** | All |
| **Routes** | All list/grid/table views with potential zero-data states |
| **Prototype** | Explicit empty-state designs on several pages |
| **Current** | `EmptyState` component exists but may not render in all zero-data scenarios |
| **Target** | Every data view renders `EmptyState` when data is empty |
| **Root Cause** | Some pages handle loading but not empty state |
| **Canonical Component** | `EmptyState` from `@/design-system` |
| **Status** | NOT STARTED |

---

## PAR-005: Page Subtitles

| Field | Value |
|---|---|
| **Priority** | P3 |
| **Roles** | Admin, Coordinator, Teacher |
| **Routes** | Selected list pages |
| **Prototype** | Title + subtitle pattern on list pages |
| **Current** | Some list pages omit the subtitle shown in prototype |
| **Target** | All list pages include descriptive subtitle per prototype |
| **Root Cause** | Inconsistent adoption of prototype page-header pattern |
| **Canonical Component** | `PageHeader` from `@/design-system` |
| **Status** | NOT STARTED |
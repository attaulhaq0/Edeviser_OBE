# Requirements — Prototype ↔ Backend Parity & Presentation Refinements

## Introduction

Edeviser is a production application (React 18 + TypeScript + Vite, Supabase with RLS, TanStack Query, i18next Arabic/English, AI Tutor, OBE, gamification, habits, notifications, analytics). A static front-end **prototype** in `prototype/` (plain HTML/CSS/JS + mock data) is the approved presentation-layer reference that will later be migrated into the real app.

This spec has two jobs:

1. **Parity audit (documentation).** Capture, at the **section/panel level**, where a backend capability (a hook, query, or RPC that already exists in `src/`) has **no UI that renders it**, and — conversely — where the **prototype shows a concept that has no backend** behind it. This lets the team decide, per gap, whether to build UI, build backend, or drop the concept.
2. **Prototype refinements (build).** Implement a batch of specific presentation-layer fixes in `prototype/` only — brand-correct the premium card, separate the chrome (sidebar / top nav / right rail) cleanly, give icons subtle depth without colored chips, add accessible on/off setting toggles, neutralize colored card-tops that should be plain, fix an empty-looking analytics card, and add Admin + Teacher "Me"/profile pages.

### Relationship to `ui-prototype-migration` (do NOT duplicate)

The existing spec `.kiro/specs/ui-prototype-migration/` already owns:

- **Route-level** parity (`coverage-matrix.md`: every route → component → hook → prototype ref, classified `P` present / `P*` partial / `D` divergent).
- The **migration contract**: R1 "backend & business logic are never modified", R16 "no screen left behind" (explicitly including *backend-supported features that lack a prototype screen*), R17 "don't fake AI".
- Design system + archetypes (`design.md`, `archetypes.md`) and AI/feature-gap research docs.

**This spec is complementary and narrower.** It works at the **section level within already-redesigned dashboards** (panels that were dropped when the `*DashboardNew` components were built) and at the **prototype design-refinement level**. Where a gap is already tracked route-level in `ui-prototype-migration/coverage-matrix.md`, this spec references it rather than re-listing it.

### Scope

- **In scope:** documenting section-level backend↔UI gaps for the 5 roles; and building presentation-only refinements in `prototype/` (HTML/CSS/JS).
- **Out of scope:** any change under `src/`, `supabase/`, or the build toolchain. New roles (there are exactly 5: `admin`, `coordinator`, `teacher`, `student`, `parent`). Wiring real data. Backend work for prototype-only concepts (documented as gaps for a later effort).

### Glossary

- **Section / panel:** a discrete widget inside a page (e.g. "AI Co-Pilot Performance", "PLO Attainment Heatmap"), as opposed to a whole route.
- **Backend-without-UI gap:** a hook/query/RPC that exists and works but is rendered by no live component.
- **Prototype-without-backend gap:** a concept drawn in the prototype for which no hook/query/RPC exists.
- **Orphan component:** a `.tsx` component that is implemented (and often tested) but imported/mounted nowhere.
- **Chrome:** sidebar, top header/nav, and right rail — the frame around page content.

---

## Requirement 1 — Prototype-only changes (no `src/` edits)

**User story:** As the owner, I want all build work confined to the prototype, so that the future migration stays clean and nothing in production can regress from this effort.

#### Acceptance Criteria

1.1 WHEN any refinement in this spec is implemented THEN the system SHALL modify only files under `prototype/` (plus this spec and the local verification helpers) and SHALL NOT modify any file under `src/`, `supabase/`, or the build config.
1.2 WHEN backend capability is investigated for the audit THEN `src/` files SHALL be read for reference only, never edited.
1.3 WHERE ground-truth about symbol usage is needed THEN it SHALL be established with `read_file`/PowerShell `Select-String` (the workspace `grep_search` produces false negatives) rather than a single unverified search.

## Requirement 2 — Section-level parity audit is captured

**User story:** As a product owner, I want a section-level map of what the backend can do versus what any UI actually shows, so that redesigned dashboards don't silently lose capabilities.

#### Acceptance Criteria

2.1 WHEN the audit is recorded THEN it SHALL list, per role, the panels each `*DashboardNew` component renders versus the panels the legacy dashboard/route offered, and mark each dropped panel.
2.2 WHEN a backend capability has a working hook/query but no live component renders it THEN it SHALL be recorded as a **backend-without-UI gap** with the exact hook path.
2.3 WHEN a component is implemented but mounted nowhere THEN it SHALL be recorded as an **orphan component** with its path.
2.4 WHERE a gap is already tracked at route level in `ui-prototype-migration/coverage-matrix.md` THEN this spec SHALL cross-reference it instead of duplicating the entry.

## Requirement 3 — Prototype-without-backend concepts are flagged, not faked

**User story:** As an engineer who will build the backend later, I want every prototype concept that has no backend clearly flagged, so that I know what still needs to be built and nothing ships pretending to be real.

#### Acceptance Criteria

3.1 WHEN the prototype shows a concept with no corresponding hook/query/RPC in `src/` THEN it SHALL be flagged in the gap register as **prototype-only (no backend)**.
3.2 WHERE a panel is presentational sample content in the live app (e.g. Coordinator "Curriculum gap", "Accreditation evidence", Insight Rail) THEN the audit SHALL note it is sample-backed, consistent with `ui-prototype-migration` R17 (don't fake AI/data).
3.3 WHEN "Coordinator Recovery Pathways" is represented in the prototype THEN it SHALL be labeled a prototype-only concept because no coordinator recovery hook/component exists (`useMasteryRecovery` is student-scoped).

## Requirement 4 — Upgrade-to-Premium card is brand-colored and student-only

**User story:** As a student, I want the upgrade card to match the product brand, and as the owner I don't want it shown to staff roles.

#### Acceptance Criteria

4.1 WHEN the sidebar upgrade card (`.side-upgrade`) renders THEN it SHALL use the brand palette (blue `#3b82f6` / teal `#14b8a6` / `--brand-gradient`) and SHALL NOT use purple/violet.
4.2 WHEN a non-student role's chrome renders THEN the upgrade card SHALL NOT appear.
4.3 WHEN the student sidebar renders THEN the upgrade card SHALL appear exactly once.

## Requirement 5 — Sidebar is a solid white card, clearly separated

**User story:** As any user, I want the left navigation to read as its own surface, not bleed into the page content.

#### Acceptance Criteria

5.1 WHEN the sidebar renders THEN it SHALL be a solid white (opaque) surface separated from the content canvas by a border and/or shadow.
5.2 WHERE the role is `student` THEN the sidebar treatment MAY be more gamified; WHERE the role is staff (admin/coordinator/teacher) THEN it SHALL read as professional/restrained.
5.3 WHEN the content area renders THEN it SHALL sit on a subtly tinted canvas so the white sidebar is visually distinct.

## Requirement 6 — Top nav and right rail are cleanly separated (not borderless-merged)

**User story:** As any user, I want the header and right rail to be distinct regions, so the dashboard reads as organized panels rather than one undivided sheet.

#### Acceptance Criteria

6.1 WHEN the top header renders THEN it SHALL be delineated from the content beneath it (surface, border, or shadow), not blended edge-to-edge.
6.2 WHEN the right rail renders THEN its cards SHALL be separated from the main column by a consistent gap and SHALL read as independent cards.
6.3 WHEN separation styling is applied THEN it SHALL follow the researched approach (visual dividers / elevation / background contrast) and remain consistent across roles.

## Requirement 7 — Icons have subtle depth without colored chip backgrounds

**User story:** As any user, I want icons that look crafted and clean, not flat glyphs on saturated colored squares.

#### Acceptance Criteria

7.1 WHEN a section-header/nav icon renders THEN it SHALL convey depth via subtle gradient/shadow on the glyph (and, at most, a very light neutral surface) rather than a saturated colored background chip.
7.2 WHERE the role is `student` THEN icons MAY be more playful/glassy; WHERE the role is staff THEN icons SHALL be restrained/monochrome with subtle depth.
7.3 WHEN an icon is rendered at nav size THEN it SHALL remain legible and quickly recognizable.

## Requirement 8 — Accessible on/off setting toggles

**User story:** As any user managing settings, I want clear on/off toggles whose state I can perceive without relying on color alone.

#### Acceptance Criteria

8.1 WHEN a setting toggle is ON THEN it SHALL use the brand accent (gradient/blue-teal) AND convey "on" by a second cue (knob position and a check/dot), not color alone.
8.2 WHEN a setting toggle is OFF THEN it SHALL use a neutral gray surface with the knob in the off position; it SHALL NOT use red for a plain off state (red is reserved for destructive/error).
8.3 WHEN toggles are added THEN they SHALL appear in the role profile/settings pages where settings exist (at minimum: institution/admin settings — Bilingual, Attainment thresholds, Parent growth reports — plus notification preferences on each profile).
8.4 WHEN a toggle is interacted with in the prototype THEN it SHALL reflect state immediately (no Save step), consistent with toggle best practice.

> **Note (correction to initial brief):** the brief speculated "off possibly red." Research (Apple HIG; WCAG 1.4.1; setproduct toggle guidance) shows OFF should be **neutral gray** and red should be reserved for destructive/error meaning. This spec therefore uses gray for OFF and never relies on color alone for state.

## Requirement 9 — Neutralize colored card-tops that should be plain section cards

**User story:** As a staff user, I want alert/link cards to look like standard section cards unless a colored top is meaningfully communicating status.

#### Acceptance Criteria

9.1 WHEN the Admin "AI Governance" card renders (dashboard link card and `admin-governance.html`) THEN its dark/gradient top SHALL be replaced by the default section-card treatment.
9.2 WHEN the Coordinator "Curriculum gap detected" card renders (`coordinator-dashboard.html`) THEN its `--brand-gradient` top SHALL be replaced by the default section-card treatment.
9.3 WHEN a card-top color is removed THEN the card SHALL still present its title, icon, and content clearly using the standard `.pcard` / `.sec-h` pattern.

## Requirement 10 — Fix the empty-looking analytics card

**User story:** As an admin, I want the "Weekly active learners" card to show something meaningful, not an empty box.

#### Acceptance Criteria

10.1 WHEN the Admin analytics "Weekly active learners" card renders (`admin-analytics.html`) THEN it SHALL display a rendered sample chart (mini bar/line) rather than an empty interior.
10.2 WHERE sample data is shown THEN it SHALL carry a subtle "sample data" caption so it is not mistaken for live data (consistent with R17 don't-fake).
10.3 WHEN a reusable no-data state is needed THEN a standard empty-state pattern (icon + short headline + explanatory copy + optional action) SHALL be available for charts.

## Requirement 11 — Admin and Teacher "Me"/profile pages exist

**User story:** As an admin or teacher, I want a profile/"Me" page like the coordinator has, with the sections appropriate to my role.

#### Acceptance Criteria

11.1 WHEN `admin-profile.html` renders THEN it SHALL include: identity header, account/security, platform preferences (language/theme — relevant to AR/EN bilingual product), notification toggles, role & permissions, and a recent admin-activity/audit section.
11.2 WHEN `teacher-profile.html` renders THEN it SHALL include: identity header, teaching info (courses/sections), preferences, notification toggles, and security.
11.3 WHEN either profile page renders THEN it SHALL reuse the existing prototype design system and mirror the structure of `coordinator-profile.html`.
11.4 WHEN either profile page is reachable THEN the header profile chip / nav SHALL link to it consistently with the coordinator pattern.

## Requirement 12 — Build prototype sections for backend-supported gaps

**User story:** As the owner, I want the prototype to show the sections the backend already supports but no live UI renders, so the migration target is complete.

#### Acceptance Criteria

12.1 WHEN the Admin dashboard/analytics prototype renders THEN it SHALL include an **AI Co-Pilot Performance** panel (backed by `useAIPerformance.ts` in the real app) and a **PLO Attainment Heatmap** panel (backed by `useAdminPLOHeatmap.ts`).
12.2 WHEN the Teacher dashboard prototype renders THEN it SHALL include an **At-Risk students** panel (backed by `useAtRiskPredictions.ts`) and a **Teaching Impact** panel (backed by `useTeachingImpact.ts`).
12.3 WHERE a built prototype section corresponds to a real hook THEN the audit/spec SHALL record the hook path so migration can wire it; WHERE it does not (Coordinator Recovery Pathways) THEN it SHALL be labeled prototype-only per Requirement 3.
12.4 WHEN these sections render THEN they SHALL use the role-appropriate chrome/treatment (student gamified, staff professional) and the standard `.pcard`/`.sec-h` patterns.

## Requirement 13 — Verify rendered output

**User story:** As the owner, I want proof the refined prototype renders correctly on laptop and mobile.

#### Acceptance Criteria

13.1 WHEN prototype changes are complete THEN the changed pages SHALL be rendered via the existing Playwright helper (`_verify_proto.cjs`) at laptop (1440×900) and mobile (402×860) widths.
13.2 WHEN verification runs THEN screenshots SHALL be written under `prototype/_shots/` and reviewed for the intended changes (brand premium card, chrome separation, depth icons, toggles, neutralized card-tops, filled analytics card, new profile pages, new sections).
13.3 IF a rendered page shows a regression THEN it SHALL be fixed and re-verified before the task is considered done.

---

## Round 2 — additional presentation refinements (from review screenshots)

These were raised after a walkthrough of the running prototype. All are presentation-only (`prototype/`), same scope rules as Requirement 1.

## Requirement 14 — Learning Path (laptop) fills space and reads cleanly

**User story:** As a student on laptop, I want the Learning Path Journey view to be well organized with no large empty areas.

#### Acceptance Criteria

14.1 WHEN `path.html` renders on laptop THEN the top row SHALL present the Journey/Tree toggle AND a course-context control together (no lopsided empty band).
14.2 WHEN the Journey view renders on laptop THEN the left column SHALL contain enough content (e.g. a "Recent activity on this path" card) that it does not leave a tall empty gap beside the taller sticky detail panel.
14.3 WHEN the Knowledge Tree view renders THEN the course picker SHALL NOT be duplicated.

## Requirement 15 — Card sections are clean on mobile across roles

**User story:** As any user on mobile, I want card sections formatted as cleanly as the student Progress page.

#### Acceptance Criteria

15.1 WHEN a card section renders on mobile (<640px) THEN it SHALL use consistent radius, comfortable KPI grid gaps, and non-overflowing headers.
15.2 WHEN a content card uses a heavy colored header bar THEN it SHALL be replaced by the standard `.sec-h` chip header for consistency (verified: this pattern existed on `progress.html`; both its card headers were standardized).

## Requirement 16 — Student progress bars use the brand gradient

**User story:** As a student, I want my progress bars to use the brand gradient, not flat blue.

#### Acceptance Criteria

16.1 WHEN a horizontal progress bar renders in a student view (`dashboard.html`, `learn.html`, `course.html`, `progress.html`) THEN its fill SHALL use `var(--brand-gradient)` (teal→blue), not a flat single blue.
16.2 WHERE the role is staff/institution THEN progress fills SHALL remain flat/professional (not the student gradient).
16.3 WHERE an outcome is below target THEN the "needs attention" bar MAY use the semantic amber/red treatment (Requirement 17), which is distinct from positive progress.

## Requirement 17 — Semantic "needs-attention" meter + professional institution variant

**User story:** As a designer, I want the threshold-colored "needs attention" bar formalized, with a professional non-gradient variant for the institution side.

#### Acceptance Criteria

17.1 The threshold-colored bar SHALL be recognized as a **semantic meter** (status encoded by color; native equivalent is HTML `<meter>`), reusable as `.emeter` with `.strong/.good/.attention/.critical` modifiers.
17.2 WHEN used on the institution side THEN a flat, non-gradient professional variant (`.emeter.pro`, muted solid tones) SHALL be available.
17.3 A review variation of the professional meter SHALL be added to a variations file (`_institution-variations.html`) so the user can choose the treatment later.

## Requirement 18 — Student dashboard shows an additional course

**User story:** As a student, I want my dashboard "My Courses" to reflect more of my enrolment.

#### Acceptance Criteria

18.1 WHEN the student dashboard "My Courses" strip renders THEN it SHALL include at least 5 course cards, consistent in style with the existing cards.

## Requirement 19 — Student "recently submitted" is redesigned

**User story:** As a student, I want a cleaner recent-results section.

#### Acceptance Criteria

19.1 WHEN the recent-results section renders (`learn.html`) THEN it SHALL use the standard section-card pattern (`.sec-h` chip header + a scannable divided list with per-row score colored by grade band), replacing the previous bordered-card treatment.

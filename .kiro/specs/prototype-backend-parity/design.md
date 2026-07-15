# Design — Prototype ↔ Backend Parity & Presentation Refinements

## 1. Overview

Two deliverables:

- **A. Parity audit** — a section-level map (below) of backend capability vs. what any UI renders, plus a gap register the team can act on later.
- **B. Prototype refinements** — presentation-only changes in `prototype/`, several driven by the web research summarized in §4.

All build work is confined to `prototype/`. `src/` is read-only reference. This complements `.kiro/specs/ui-prototype-migration/` (route-level) by operating at the **section** level and on **prototype design** quality.

Ground-truth method: `read_file` + PowerShell `Select-String` (the workspace `grep_search` returns false negatives, confirmed repeatedly).

---

## 2. Section-level parity matrix (redesigned dashboards)

Redesigned dashboards live at `src/components/shared/{Admin,Coordinator,Teacher,Student,Parent}DashboardNew.tsx`, gated by the `newUiDashboards` flag.

Legend: **Rendered** = shown by the `*New` component with real data · **Sample** = shown but presentational/mock · **Dropped** = offered by legacy/route but not by `*New` · **No UI** = backend exists, nothing renders it.

### 2.1 Admin

| Section | Backend hook/query | `*New` status | Notes |
|---|---|---|---|
| Welcome hero | `useAdminDashboardAggregate` | Rendered | |
| KPI row (users/active/programs/courses) | `useAdminDashboardAggregate` | Rendered | |
| Users by role | `useAdminDashboardAggregate` | Rendered | |
| Recent activity | (legacy) | Dropped | comment in `AdminDashboardNew` admits it stays on legacy |
| AI Co-Pilot Performance | `useAIPerformance.ts` | **No UI** | hook exists; "Co-Pilot" appears only in a comment block |
| PLO Attainment Heatmap | `useAdminPLOHeatmap.ts` | **No UI** | hook never invoked; type only imported by orphan `PLODrillDownDialog.tsx` |
| OBE quick-access | (legacy) | Dropped | |

### 2.2 Coordinator

| Section | Backend hook/query | `*New` status | Notes |
|---|---|---|---|
| Action-hub hero (3 chips) | — | Rendered | |
| KPI row | aggregate | Rendered | |
| Attainment alerts — AI narrative | `useCoordinatorAiInsights` | Rendered (real) | |
| Attainment alerts — below-target PLOs | `useCoordinatorOutcomeAttainment` | Rendered (real) | |
| Curriculum gap MiniCard | — | Sample | presentational |
| Accreditation evidence MiniCard | — | Sample | presentational |
| CQI MiniCard | `useCQIPlans` | Rendered (real) | |
| Program timeline MiniCard | `useAcademicCalendarEvents` | Rendered (real) | |
| Insight Rail | — | Sample | mostly presentational |
| Attainment trends chart | `useCoordinatorAttainmentTrends` | Elsewhere | only at `/coordinator/outcome-chain` (`CoordinatorOutcomeAttainmentNew`), not the dashboard |
| Recovery Pathways | **none** | Prototype-only | no coordinator recovery hook/component exists |

### 2.3 Teacher

| Section | Backend hook/query | `*New` status | Notes |
|---|---|---|---|
| Welcome hero | `useTeacherDashboardAggregate` | Rendered | |
| KPI row (pending/graded/attainment/at-risk count) | `useTeacherDashboardAggregate` | Rendered | at-risk **count** only |
| Mastery snapshot (MasteryRing) | aggregate | Rendered | |
| Bloom's coverage | aggregate | Rendered | |
| Triage CTA | — | Rendered | |
| At-Risk students (detail list) | `useAtRiskPredictions.ts` | **No UI** | `AIAtRiskWidget.tsx` + `AtRiskStudentRow.tsx` are orphans |
| Teaching Impact | `useTeachingImpact.ts` | **No UI** | hook exists, nothing renders it |
| Tutor handoffs | `useTeacherHandoffs` | Elsewhere | only at `/teacher/tutor-handoffs`; `TeacherHandoffCard.tsx` orphan |
| AI feedback draft | `useAIFeedbackDraft` | Elsewhere | only inside `GradingInterface` |

### 2.4 Student

| Section | Backend hook/query | `*New` status | Notes |
|---|---|---|---|
| Welcome hero (XP/Level/Streak) | `useStudentDashboardAggregate` | Rendered | |
| Your next step | aggregate | Rendered | |
| KPI row | aggregate | Rendered | |
| Mastery snapshot | aggregate | Rendered | |
| Upcoming deadlines | aggregate | Rendered | |
| AI Tutor entry | aggregate | Rendered | |
| Mastery recovery | `useMasteryRecovery` | Elsewhere | student route `/student/courses/:courseId/recovery/:cloId` (`MasteryRecoveryPage`), not surfaced on dashboard |

### 2.5 Parent

| Section | Backend hook/query | `*New` status | Notes |
|---|---|---|---|
| Welcome hero | `useParentDashboardAggregate` | Rendered | |
| KPI row (children/courses/attainment/deadlines) | aggregate | Rendered | |
| Your children overview | aggregate | Rendered | |

Parent `*New` renders all aggregate fields — no section-level drop found.

---

## 3. Gap register (actionable)

### 3.1 Backend-without-UI (build prototype section now; wire real hook at migration)

| # | Gap | Real hook (migration target) | Prototype target |
|---|---|---|---|
| G1 | Admin AI Co-Pilot Performance | `src/hooks/useAIPerformance.ts` | panel on admin dashboard/analytics |
| G2 | Admin PLO Attainment Heatmap | `src/hooks/useAdminPLOHeatmap.ts` | heatmap panel |
| G3 | Teacher At-Risk students | `src/hooks/useAtRiskPredictions.ts` | at-risk list panel on teacher dashboard |
| G4 | Teacher Teaching Impact | `src/hooks/useTeachingImpact.ts` | impact panel on teacher dashboard |

### 3.2 Elsewhere-but-not-on-dashboard (surface exists at another route; optional dashboard entry)

| # | Capability | Where it lives today |
|---|---|---|
| E1 | Coordinator attainment trends | `/coordinator/outcome-chain` |
| E2 | Teacher tutor handoffs | `/teacher/tutor-handoffs` |
| E3 | Student mastery recovery | `/student/courses/:courseId/recovery/:cloId` |

### 3.3 Prototype-without-backend (flag; backend to be built later)

| # | Concept | Status |
|---|---|---|
| P1 | Coordinator Recovery Pathways | **No backend.** No coordinator recovery hook/component; `useMasteryRecovery` is student-scoped. Prototype-only. |
| P2 | Coordinator Curriculum gap / Accreditation evidence panels | Sample content in live app too; not wired. |

### 3.4 Orphan components (implemented, mounted nowhere)

`AIAtRiskWidget.tsx`, `AtRiskStudentRow.tsx`, `TeacherHandoffCard.tsx`, `PLODrillDownDialog.tsx`. These are migration assets (already built + tested) that the prototype sections above can map onto.

> Route-level gaps are tracked in `ui-prototype-migration/coverage-matrix.md`; this register is section-level and does not duplicate those rows.

---

## 4. Design decisions (research-backed)

Content below was rephrased for compliance with licensing restrictions; sources are linked inline.

### 4.1 Chrome separation — sidebar / top nav / right rail

Dense screens rely on visual dividers, spacing, and surface contrast to stay legible ([tubik: visual dividers](https://blog.tubikstudio.com/visual-dividers-user-interface/)); data-dense layouts do best with a tight, consistent spacing grid ([designing for data density](https://paulwallas.medium.com/designing-for-data-density-what-most-ui-tutorials-wont-teach-you-091b3e9b51f4)).

**Decision:**
- **Sidebar** = solid **white** surface, separated by a right border + soft shadow.
- **Content** = sits on a subtly **tinted canvas** (slate-50) so the white chrome stands apart.
- **Right rail** = independent white cards with a consistent column gap (not fused to the main column).
- **Header** = delineated from content by surface + hairline border/shadow.
- Student chrome may be more gamified; staff chrome stays professional.

### 4.2 Icons — depth without colored chips

3D/depth icons read through subtle shadow, gradient, and light rather than a flat colored tile ([cssauthor 3D icons](https://cssauthor.com/free-3d-icons-and-illustration-packs-for-ui-design/); [flat-icons: what are 3D icons](https://flat-icons.com/what-are-3d-icons)). Neumorphism achieves a soft "extruded" look with subtle shadows + gradients ([neumorphism 2025](https://medium.com/@saimass07363059/neumorphism-in-ui-design-the-future-or-just-a-trend-c1bfca6e553d)), but must remain instantly legible ([wpwebify](https://www.wpwebify.com/blog/best-3d-social-media-icons-for-modern-website-design/)).

**Decision:** glyphs get a soft inner gradient + soft drop shadow on a very light neutral surface — **no saturated color chip**. Student: slightly glassy/playful depth. Staff: restrained monochrome glyph with subtle depth.

### 4.3 Toggles — accessible on/off

ON is typically an accent color (blue/green); OFF is neutral gray ([setproduct toggle guide](https://www.setproduct.com/blog/toggle-switch-ui-design)). Critically, do **not** rely on color alone — add a position/shape/checkmark cue ([Apple HIG: toggles & switches](https://developers.apple.com/design/human-interface-guidelines/watchos/elements/toggles-and-switches/); [WCAG 1.4.1 via atomica11y](https://www.atomica11y.com/accessible-design/toggle-switch/)). Toggles take effect immediately, no Save ([uxtweak toggle best practices](https://www.uxtweak.com/guides/research/toggle-button-design/)).

**Decision:** ON = brand gradient + knob right + tiny check; OFF = neutral gray + knob left. **Never red for plain off** (red reserved for destructive/error). This corrects the brief's "off possibly red" guess.

### 4.4 Empty chart states

An empty state should explain *why* there is no data and offer a next action, not show a blank frame ([Supabase design system: empty states](https://supabase.com/design-system/docs/ui-patterns/empty-states); [PatternFly empty state](https://patternfly.org/v4/design-guidelines/usage-and-behavior/empty-state); [pencil&paper empty states](https://pencilandpaper.io/articles/empty-states/)). Skeleton/axis scaffolds are fine during load ([UX SE: placeholder graphs](https://ux.stackexchange.com/questions/125806/displaying-placeholder-skeleton-screen-for-a-large-graph)).

**Decision (Weekly active learners):** render a real **sample mini bar chart** with a subtle "sample data" caption (this is a presentation prototype, so showing the intended filled state is most useful), and keep a reusable empty-state block (icon + headline + copy + CTA) for genuine no-data.

### 4.5 Admin/Teacher profile "Me" pages

Common account/profile sections: identity header, preferences (theme/language/default role), security (credentials/MFA), roles & permissions, notifications, and activity/audit ([Snowflake profile settings](https://docs.snowflake.com/en/user-guide/ui-snowsight-profile); [Snowflake admin user mgmt](https://docs.snowflake.com/en/user-guide/admin-user-management); [Salesforce user management](https://www.salesforce.com/resources/guides/salesforce-user-management-guide/)).

**Decision:**
- **Admin profile:** identity header + account/security + platform preferences (language/theme — relevant to AR/EN bilingual) + notification toggles + role & permissions + recent admin activity/audit.
- **Teacher profile:** identity header + teaching info (courses/sections) + preferences + notification toggles + security.
- Both mirror `coordinator-profile.html` and reuse the prototype design system.

---

## 5. Prototype implementation notes

Design-system files: `prototype/shared.css` (~47KB), `prototype/shared.js` (~46KB). Key selectors: `.pcard` (card), `.sec-h .chip` (section-header icon), `.bottom-bar` (sidebar), `.right-rail`, `.app-header`, `.side-upgrade` (upgrade card), `.hdr-profile` (header profile chip), `.top-search`. `shared.js`: `repointNav()`, `buildRail()` (`data-norail`), `buildSidebarExtra()` (`.side-upgrade`), `buildProfileChip()`.

Files to touch:

| Concern | Files |
|---|---|
| Premium card brand + student-only (R4) | `shared.css` `.side-upgrade`, `shared.js` `buildSidebarExtra` |
| Sidebar white card (R5) | `shared.css` `.bottom-bar` |
| Nav/rail separation (R6) | `shared.css` `.app-header`, `.right-rail`, layout canvas |
| Depth icons (R7) | `shared.css` `.sec-h .chip` (+ nav icon styles) |
| Toggles (R8) | new `.edv-toggle` component in `shared.css`; used in profiles |
| Card-top neutralize (R9) | `admin-governance.html`, `admin-dashboard.html` (governance link card), `coordinator-dashboard.html` (curriculum-gap card) |
| Empty analytics card (R10) | `admin-analytics.html` (+ reusable `.chart-empty` in `shared.css`) |
| Admin/Teacher profile (R11) | new `admin-profile.html`, `teacher-profile.html` (mirror `coordinator-profile.html`) |
| Backend-gap sections (R12) | admin dashboard/analytics (G1,G2), teacher dashboard (G3,G4) |

## 6. Verification

Run `node _verify_proto.cjs` (static server already serving `prototype/` on :8080). Capture laptop 1440×900 + mobile 402×860 for every changed page; review shots in `prototype/_shots/` against the intended changes; fix and re-verify any regression. Prototype dir is untracked (branch `main`) — no commits.

---

## 7. Round 2 — presentation refinements (implemented)

From a walkthrough of the running prototype. All `prototype/`-only.

### 7.1 Learning Path laptop layout (R14)
`.path-grid` is `minmax(0,1fr) 380px` on laptop with a sticky detail panel. The detail panel is taller than the journey column, so CSS grid left a tall empty gap beside it. Fix: (a) wrapped the view toggle in a `flex justify-between` row and added a right-aligned course-context `.tree-picker` chip; (b) added a "Recent activity on this path" card to the bottom of the left column so it balances the panel height; (c) removed the duplicate course picker from the Tree header.

### 7.2 Mobile card consistency (R15)
Audit (Select-String) showed the heavy colored header-bar card pattern existed only on `progress.html`. Standardized both its card headers ("Progress by Course", "CLOs Needing Attention") to the `.sec-h` chip pattern, and added an `@media (max-width:639px)` block to `shared.css` (consistent `.pcard` radius, comfortable KPI grid gap, `.sec-h .more` no-wrap).

### 7.3 Student gradient progress bars (R16)
Student horizontal bars converted to `var(--brand-gradient)`: `learn.html` (4 course bars), `course.html` (progress bar). `dashboard.html` + `progress.html` already used the gradient. Course mastery **rings** (SVG stroke) remain flat blue — converting a stroke to a gradient needs an SVG `<linearGradient>` def; out of scope for "bars" and left as a follow-up note.

### 7.4 Semantic meter (R17)
Formalized as `.emeter` in `shared.css` (`.strong/.good/.attention/.critical`; default fill = brand gradient) plus a flat professional institution variant `.emeter.pro`. This is the standard "status-by-color" meter (native `<meter>`). A side-by-side professional-vs-student review showcase was added to `_institution-variations.html` (`#semantic-meter`).

### 7.5 Extra student course (R18) + recently-graded redesign (R19)
`dashboard.html` My Courses: added a 5th card (MA210 · Statistics, consistent ring style). `learn.html`: "Recently Submitted" redesigned into a "Recently graded" `.pcard` (sec-h chip + divided list; each row = icon + title + course·date·+XP + band-colored score + hover chevron).

### 7.6 Backend-gap sections built (R12)
Implemented the section-level gaps from §3.1 in the prototype so the migration target is complete: Admin **AI Co-Pilot performance** + **PLO attainment heatmap** (`admin-analytics.html`); Teacher **At-risk students** + **Teaching impact** (`teacher-dashboard.html`); Coordinator **Recovery pathways** (`coordinator-dashboard.html`, tagged "Concept" — gap P1, no backend). Field names mirror the real hooks (`AIPerformanceMetrics`, `AdminPLOHeatmapRow`, `AtRiskPredictionData`, `TeachingImpactMetrics`) so wiring at migration is mechanical.

# Page-Archetype Pattern Library (P0)

> **Companion to** `design.md` (§15 coverage model, §3 component strategy, §18 responsive
> strategy), `requirements.md` (R16 coverage, R18 responsive), and `coverage-matrix.md`
> (which archetype each route uses).
>
> **Purpose:** every un-mocked (design-system-derived) screen is assembled from ONE of the
> archetypes below — never styled one-off. Each archetype is a documented composition of the
> P0 primitives + existing shared components, with the responsive rules baked in. Read the
> production page first (R16.6), pick the archetype, re-skin, keep every hook.

---

## P0 primitives available to all archetypes

Built in P0 (presentation-only, token-bound, dark-mode + reduced-motion aware):

| Primitive                                                   | Import                              | Use                                                                                                                                     |
| ----------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`.card-elevated`** (CSS utility, `src/index.css`)         | class                               | Soft layered shadow + hover lift on any `Card`/container. Lift only on `(hover: hover)`; disabled under reduced motion.                 |
| **`.btn-tactile`** (CSS) via **Button `variant="tactile"`** | `@/components/ui/button`            | Pressable brand CTA (solid bottom edge, compresses on `:active`). Reduced-motion safe.                                                  |
| **`SeverityIcon`**                                          | `@/components/shared/SeverityIcon`  | Leading status tile (tinted + halo). `severity`: high/med/low/info/brand/neutral; `size`: sm/md/lg. Pair with text — never color alone. |
| **`MasteryRing`**                                           | `@/components/shared/MasteryRing`   | SVG progress ring. `tone="auto"` colors by attainment threshold; `tone="brand"` = gradient.                                             |
| **`SectionHeader`**                                         | `@/components/shared/SectionHeader` | Section title with gradient icon chip + optional action (RTL-safe `ms-auto`).                                                           |
| **`KPICard`** (restyled)                                    | `@/components/shared/KPICard`       | KPI value now deep brand blue (`valueClassName`, default `text-sky-700`); pass a semantic color for status values.                      |

**Existing shared components** to reuse (do not re-create): `GradientCardHeader` (full
gradient bar for card tops — distinct from `SectionHeader`), `WelcomeHero`, `PrimaryCTA`,
`DataTable`, `EmptyState` (+ ~40 variants) / `InlineEmpty`, `Shimmer`, `ErrorState`,
`ConfirmDialog`, `ConsistencyScoreRing` (pre-existing ring; `MasteryRing` supersedes for new
work). Primitives (`ui/`): `Card`, `Button`, `Badge`, `Tabs`, `Dialog`, `Sheet`, `Form`, etc.

---

## Responsive & adaptive conventions (R18 / §18) — apply to EVERY archetype

These are **binding** for all archetypes and primitives. There is **no device toggle and no
user-agent sniffing** — the UI adapts to viewport + input capability.

### Breakpoints (Tailwind v4 defaults; `lg` is the desktop/sidebar threshold)

| Token  | Min width | Typical layout shift                                              |
| ------ | --------- | ----------------------------------------------------------------- |
| (base) | 0         | Mobile-first single column; bottom tab nav.                       |
| `sm`   | 640px     | 2-col KPI grids; inline filters.                                  |
| `md`   | 768px     | Multi-column content; hero stats visible.                         |
| `lg`   | 1024px    | **Sidebar appears**; drawer/bottom-nav retire; full multi-column. |
| `xl`   | 1280px    | Wider content max-width; more columns.                            |
| `2xl`  | 1536px    | Cap content width; avoid over-stretch.                            |

### Rules

1. **Mobile-first**: author base styles for the smallest screen; add complexity at `sm→2xl`.
2. **Container queries** (`@container`, Tailwind v4) for reusable slot-adaptive components, so
   a primitive responds to its container, not just the viewport. Mark the parent
   `@container` and use `@sm:`/`@md:` on children where the component may live in a narrow slot.
3. **Capability, not device name**:
   - `(pointer: coarse)` / `(hover: none)` → touch targets **≥44×44px**, no hover-only affordances.
   - `(hover: hover)` → hover/`title` enhancements (e.g. `.card-elevated` lift) apply here only.
4. **Content reflow**: single column on mobile → grid on larger screens (e.g.
   `grid-cols-2 md:grid-cols-4` for KPIs). **Data tables degrade** to horizontal scroll or a
   card list on small screens.
5. **Viewport units + safe areas**: use `100dvh` (not `100vh`) and `env(safe-area-inset-*)`
   for full-height / notched mobile surfaces (e.g. focus mode, drawers).
6. **RTL**: logical props only (`ms-/me-/ps-/pe-/start/end`); drawers use RTL-aware transforms.
7. **Reduced motion**: all transitions/animations gate on `prefers-reduced-motion` (primitives
   already do).
8. **Verify** every screen at 360 / 768 / 1024 / 1440 × {touch, pointer} × {LTR, RTL} ×
   {light, dark} (V.7).

---

## The archetypes

Each: **when to use → composition → responsive → worked skeleton.** Skeletons are
illustrative (real Tailwind v4 + Shadcn + hooks); they are not copy-paste-final.

### 1. Dashboard

- **When:** role landing pages (`*Dashboard`).
- **Composition:** `WelcomeHero` → KPI row (`KPICard` ×N) → section cards (`Card` +
  `GradientCardHeader` or `SectionHeader`) bound to the role aggregate hook. `PrimaryCTA` for
  the single next action (student). `SeverityIcon` for triage rows (teacher).
- **Responsive:** KPI grid `grid-cols-2 md:grid-cols-4 gap-4`; section cards stack on mobile,
  2-col from `lg`. Hero stats `hidden md:flex`.
- **Skeleton:**
  ```tsx
  <div className="space-y-6">
    <WelcomeHero name={name} userRole={role} subtitle={t(...)} stats={...} />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard icon={Users} label={t("kpi.users")} value={data.users} />
      {/* semantic value example: */}
      <KPICard icon={AlertTriangle} label={t("kpi.atRisk")} value={data.atRisk}
               valueClassName="text-red-600" iconBgClass="bg-red-50" iconColorClass="text-red-600" />
    </div>
    <Card className="card-elevated overflow-hidden">
      <GradientCardHeader icon={Activity} title={t("section.recent")} />
      <div className="p-6">{/* ...hook data... */}</div>
    </Card>
  </div>
  ```

### 2. List / index

- **When:** browse collections (courses, PLOs, assignments, leaderboard, marketplace).
- **Composition:** `SectionHeader` + filters (**`nuqs`** URL state) + card-grid or `DataTable`
  - pagination + `EmptyState` variant. One `tactile`/gradient CTA max in the header.
- **Responsive:** filters stack on mobile (`flex-col sm:flex-row`); card grid
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; table degrades to card list < `md`.
- **Skeleton:**
  ```tsx
  <div className="space-y-6">
    <SectionHeader
      icon={BookOpen}
      title={t("courses.title")}
      action={<Button variant="tactile">{t("courses.new")}</Button>}
    />
    <div className="flex flex-col sm:flex-row gap-3">
      {/* nuqs-bound filters */}
    </div>
    {isLoading ? (
      <Shimmer className="h-64" />
    ) : items.length ? (
      <DataTable columns={cols} data={items} />
    ) : (
      <NoCourses />
    )}
  </div>
  ```

### 3. Management table (CRUD)

- **When:** admin/coordinator/teacher management (semesters, departments, fees, gradebook,
  question bank, surveys, attendance).
- **Composition:** restyled `DataTable` + row actions (`DropdownMenu`) + `ConfirmDialog` for
  destructive ops + `EmptyState`. Status cells use `Badge` (+ `SeverityIcon` where useful).
- **Responsive:** horizontal scroll wrapper `overflow-x-auto` on small; sticky first column
  where helpful; actions in an overflow menu on mobile.

### 4. Form (create / edit)

- **When:** all create/edit pages (users, courses, CLOs, quizzes, challenges…).
- **Composition:** Shadcn `Form` + `Field`/`Label`/`Input`/`Select`/`Textarea` + Zod resolver
  (reuse existing schemas) + `tactile` submit + `Loader2` pending. Auth-grade field styling.
- **Responsive:** single column mobile → `sm:grid-cols-2` for short fields; sticky footer
  action bar on mobile (`sticky bottom-0` + safe-area). Submit ≥44px.
- **Note:** never expose a role picker the backend ignores (self-signup = student).

### 5. Detail (entity)

- **When:** entity detail pages (CLO detail, course detail, challenge detail, team profile,
  thread detail, announcement detail).
- **Composition:** `SectionHeader` (title + actions) → `Tabs` (pill style) → related sections
  (`Card`s) → `MasteryRing`/`Badge` for status. Compose from existing hooks.
- **Responsive:** tabs scroll horizontally on mobile; two-column detail collapses to one.

### 6. Wizard / stepper

- **When:** onboarding, bulk import, generate-questions, complete-profile, reassessment.
- **Composition:** progress indicator + step panels + `tactile` next/back. Immersive frame
  (minimal chrome). Reuse existing step logic/hooks.
- **Responsive:** full-width steps on mobile; `100dvh`; large touch targets; sticky step nav.

### 7. Full-screen focus

- **When:** `FocusModePage` (outside `StudentLayout`), `AdaptiveQuizSession`, `PostQuizReview`,
  mastery recovery.
- **Composition:** no sidebar/header chrome; centered content; `MasteryRing` / timer /
  question card. Preserve that focus mode renders **outside** the student shell (R3.3).
- **Responsive:** `min-h-[100dvh]`, safe-area insets, single column, huge tap targets.

### 8. Analytics / report

- **When:** reports, curriculum matrix, coverage heatmap, sankey, trends, tutor analytics,
  question analytics, team health, marketplace analytics.
- **Composition:** filter bar (`nuqs`) + KPI cards + **Recharts** charts in `Card`s +
  `SectionHeader`. Empty/loading via `EmptyState`/`Shimmer`. Never color-only — pair legends
  with labels.
- **Responsive:** charts in responsive containers (width 100%); 1-col mobile → grid `lg+`;
  wide matrices/heatmaps use `overflow-x-auto`.

### 9. Settings

- **When:** profile, institution settings, notification preferences, session management.
- **Composition:** sectioned `Card`s + `SectionHeader` per group + toggles (`Switch`), selects,
  and (where relevant) read-only/roadmap tiers labeled as such (R17.4). Save via existing hooks.
- **Responsive:** single column; labels above controls on mobile, side-by-side from `sm`.

### 10. State templates (cross-cutting)

- **Applies to every archetype** (R9.2):
  - **Loading** → `Shimmer` / `DataTable` skeleton (never full-page spinner).
  - **Empty** → shared `EmptyState` / `InlineEmpty` variant.
  - **Error** → `ErrorState` / error boundary.
- Component-level, not page-level.

---

## Static / prose (non-archetype)

`TermsPage`, `PrivacyPage`, `PublicPortfolio` — design-system typography in a shell-less,
readable container (max-width prose, brand tokens). Public portfolio is a Detail variant with
no authenticated chrome.

---

## Authoring checklist for a derived screen (R16.6)

1. Read the production page → inventory data, fields, actions, empty/loading/error states.
2. Pick the archetype (see `coverage-matrix.md`).
3. Re-skin with P0 primitives + archetype; keep **every** hook/mutation.
4. Apply the responsive rules above.
5. Pass the gates: functional parity · en+ar (LTR/RTL) · light+dark · a11y · perf ≥ baseline ·
   flag on · old component removable (design.md §14).

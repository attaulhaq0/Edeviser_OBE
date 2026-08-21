# Prototype Layout Responsiveness Audit

Date: 2026-08-11  
Scope: `prototype/` only

## Worktree safety

The repository was already heavily modified before this task. Existing changes included many prototype pages and unrelated files outside `prototype/`. This work preserved those changes and limited project-file edits for this task to `prototype/`.

## Root causes found

1. The canonical laptop canvas in `shared.css` reserved the existing 264px sidebar and 328px right rail with margins, but also capped `.page-content` at 1160px and then 1320px. Once the remaining center track exceeded those caps, the unused width appeared as a dead strip immediately before the fixed rail.
2. A prior `>= 2000px` exception removed the cap only for `body[data-dashboard]`. Detail pages for every role remained capped, so the defect was systemic even when dashboards looked better.
3. The no-rail shared rule retained a separate 1280px cap. Many no-rail pages locally overrode it, creating two competing page-canvas contracts.
4. The dynamically loaded admin refinement layer reintroduced a 1160px page cap after `shared.css`.
5. Primary grid descendants did not have one consistent shrink contract. Some explicit two-, three-, and four-card rows could retain intrinsic width at compact laptop/tablet sizes.
6. A few page-owned laptop grids activated too early: Learning Path could create a 400px detail track below a usable two-column width, and Coordinator CQI forced four columns at 768px.
7. Secondary mobile issues found during QA included a crowded Student header, a closed off-canvas Student drawer contributing overflow geometry, and Gradebook's wide table needing stricter containment.

`shared.js` does not calculate main width, detect zoom, or reserve a ghost rail. It injects `.right-rail` only when `.page-content` exists and `data-norail` is absent. The width defect was CSS-driven.

## Shared selectors changed

- Added canonical prototype shell tokens using the existing dimensions exactly:
  - `--app-sidebar-width: 264px`
  - `--app-right-rail-width: 328px`
  - `--app-page-gutter: 40px`
  - `--app-section-gap: 20px`
- Updated the sidebar, header offset, main canvas, right rail, and full-height Tutor offset to reuse those tokens.
- Changed the standard laptop `.page-content` contract to `width:auto`, `min-width:0`, and `max-width:none` while retaining the existing shell margins and padding.
- Added `min-width:0` to verified grid descendants and `max-width:100%` to direct page-canvas children.
- Removed the 1160/1280/1320px primary-canvas caps and the dashboard-only ultra-wide exception.
- Kept the rail hidden below 1100px and kept no-rail pages on a two-column `sidebar | fluid main` shell.
- Added compact composition breakpoints for explicit `lg-row` grids, verified page-owned split grids, Student course cards, and four-card rows.
- Added root-level inline clipping so only page-level overflow is suppressed; table wrappers retain their own horizontal scrolling.

## Page-specific overrides fixed

- `path.html`: laptop split rules are gated to desktop and are stacked by the shared compact split contract below 900px.
- `coordinator-cqi.html`: four CQI columns now activate at 900px and use `minmax(0,1fr)`; smaller widths use one column.
- `teacher-gradebook.html`: the table wrapper is explicitly width/min-width constrained with inline-size containment; the intentionally wide table remains horizontally scrollable.
- `admin-refinement.css`: removed both active 1160px page caps and broadened the internal admin grid collapse point to match the actual center-track width when the rail is present.
- `student-refinement.css`: closed AI drawers no longer occupy off-canvas geometry, and nonessential header intelligence copy is hidden at phone widths.

## Fixed-width rules removed

- Standard `.page-content`: `max-width:1160px`
- No-rail `.page-content`: `max-width:1280px`
- Ultra-wide `.page-content`: `max-width:1320px`
- Admin refined `.page-content`: `max-width:1160px`
- Dashboard-only `>= 2000px` max-width exception (made unnecessary by the global contract)

## Fixed-width rules retained intentionally

- Sidebar: 264px
- Injected right rail: 328px
- Page gutters: 40px at standard desktop widths, fluid up to 72px at very wide widths
- Immersive lesson/auth content: 600px readability measure
- `.single-col`: 640px deliberate focused-content measure
- Page-owned contextual columns (roughly 280–400px) at widths where their split layouts are active
- Gradebook and other data-table minimum widths inside horizontal overflow wrappers
- Dialogs, drawers, profile controls, charts, icons, and prose measures that are not primary page canvases

## Special shell exceptions

- `data-norail` pages reclaim the full area after the sidebar and do not reserve 328px.
- Immersive pages retain their focused centered layout and do not receive the standard three-part shell.
- The full-height Tutor page retains its custom chat layout and only uses the existing sidebar offset on laptop.
- The role launcher and design-reference pages do not use `.page-content` and were not forced into the application shell.

## Viewport QA

Automated Chromium checks covered 21 representative pages and 10 widths (210 combinations):

- Widths: 390, 768, 1024, 1280, 1440, 1680, 1920, 2160, 2304, 2560
- Student: dashboard, learning path, Tutor, progress
- Parent: dashboard, growth, support
- Teacher: dashboard, triage, students, gradebook, handoffs
- Coordinator: dashboard, outcomes, curriculum, CQI, accreditation
- Admin: dashboard, analytics, governance, structure

Verified in the matrix:

- Standard main canvas left/right boundaries match the available shell track.
- Sidebar remains 264px on laptop layouts.
- Visible right rail remains 328px and disappears at the existing breakpoint.
- No-rail pages have no ghost rail reservation.
- Page-level horizontal scrolling is disabled; intentional table/carousel overflow remains contained locally.
- Compact explicit grids stack/reflow before their cards become unusably narrow.
- 2304px and 2560px canvases continue to the rail with no dead strip.

Representative visual captures were inspected at 390, 768, 1024, 1280, 1440, and 2304px, including a before/after 2304px Progress comparison. Temporary screenshots were removed after review to honor the `prototype/`-only final file scope.

## Zoom QA

Reduced browser zoom is equivalent to a wider CSS viewport for this layout. A 1440px physical window maps approximately to:

- 100% -> 1440 CSS px
- 90% -> 1600 CSS px
- 80% -> 1800 CSS px
- 75% -> 1920 CSS px
- 67% -> 2149 CSS px

The viewport matrix covers those effective widths and extends through 2304/2560 CSS px. No zoom detection, `devicePixelRatio` branch, JavaScript scaling, CSS `zoom`, or `transform:scale()` was added.

## Mobile and tablet QA

- 390px: mobile bottom navigation remains full width; right rail is hidden; standard pages are not forced into laptop split grids.
- 768px: rail remains hidden; explicit two/three-column rows and contextual split grids stack where the remaining center width is too narrow.
- 1024px: the sidebar remains fixed, the rail remains hidden, and main content uses the full remaining track.
- Gradebook keeps an inner horizontal table scroller without creating a usable page-level horizontal scroll.

## Known limitations

- Headless Chromium does not apply browser UI zoom shortcuts, so zoom percentages were validated through their equivalent CSS viewport widths rather than browser-chrome zoom controls.
- Prototype pages load Tailwind and fonts from CDNs; visual QA requires those assets to be reachable. Geometry checks are local and do not depend on production application code.
- Very wide prose remains governed by existing local text/card measures. No content or typography redesign was introduced.


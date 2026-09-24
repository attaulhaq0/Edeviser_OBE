# Premium visualization within Edeviser's calm-academic direction

**Status: senior research and implementation direction within the existing frontend master goal.** This is not a new product direction, library installation, visual approval or completion checklist. Product authority remains the launch contract; architecture follows `frontend-design-system-strategy.md`; execution/evidence stays in `docs/audits/frontend-forensic-remediation-ledger.md`.

## Executive decision

Premium should mean **clear, trustworthy academic evidence and an excellent working experience**, not more charts, gradients or animation. Keep the current React/Vite/Tailwind/Shadcn foundation and Recharts/TanStack Table as the starting point. Build one governed visualization language and a small set of task-focused patterns. Add a specialist library only when an equivalent-data prototype demonstrates a capability/performance advantage that justifies its maintenance and licensing cost.

The highest-value immediate investment is not a new chart engine. It is consistent chart framing, typography, semantics, state handling, interaction, accessibility and responsive behavior across current consumers.

## 1. Research scope and evidence

The dedicated web-search tool timed out. Public search-result pages were successfully retrieved through DuckDuckGo HTML, then findings were checked against official library/product/W3C sources. Search-result snippets were used for discovery, not as feature, performance or licensing proof. One industry roundup was discovered but its fetched body was truncated, so no rankings or quantitative claims from it are adopted.

Primary sources inspected include Recharts, shadcn chart documentation, visx, Apache ECharts, TanStack Table/Virtual/Charts, AG Grid's official repository and W3C complex-image guidance. Some product pages exposed mostly navigation in this fetch surface. Toddle is used for its school-workflow taxonomy, not a claim that authenticated competitor screens were visually evaluated. Linear's redesign article is dated2024; its hierarchy/alignment lessons are relevant, not represented as a new2026 invention.

Version caution: Edeviser declares Recharts3.8.1-compatible and TanStack Table8.21.3-compatible dependencies. Current upstream `main` documentation can describe a different release. In particular, TanStack Table's versioned Intent skills are documented for v9+, not our installed v8. TanStack Charts' current official README explicitly identifies the Alpha line and warns of breaking minor releases. Verify exact package/peer versions before any installation.

### Current code: why a new library alone would not solve the problem

The inspected source already uses Recharts directly in multiple shared and role-specific views. A generated bundle named RechartsWrapper is not evidence of an application-owned chart design layer; no such wrapper was established by source inspection.

- `src/components/shared/StudyTimeChart.tsx:41–64,102–124,153–189` embeds English month/title/filter text, literal selected colors,11px axes and tooltip fallback-to-zero. These need a shared locale/presentation/state contract; replacing the engine alone would leave the same defects.
- `src/pages/teacher/quiz-analytics/QuizCLOCorrelationPage.tsx:34–50` defines English taxonomy labels and a local six-color palette. Standardize presentation without changing its imported academic discrepancy logic.
- `src/components/shared/DataTable.tsx:25–76,93–101` already composes TanStack Table and distinguishes first load from background refetch, with client/server pagination inputs. Preserve those contracts. It is not evidence of virtualization, global server sorting or validated pending-state contrast merely because those library capabilities exist.

Additional source review found:
- `tokens.css` already declares paired chart colors, but the inspected TSX consumers do not use those chart-token names. `TeamHealthChart.tsx` instead owns another grid/tick/line/threshold/tooltip recipe. Existing tokens need real consumers before another renderer is introduced.
- Installed Recharts defaults Line animation to `auto` and Cartesian chart accessibility to enabled. Do not incorrectly describe the library as having no OS-motion/accessibility support. The gap is connecting the application's stored reduction choice and testing actual interactions; Framer Motion configuration does not configure Recharts.
- `HeatmapGrid` already has a semantic ramp and roving keyboard behavior. Preserve those capabilities while improving labels, spatial direction and dense-cell inspection. `CoverageHeatmapView` has useful table/numeric structure; it needs refinement rather than a blind rewrite.
- The current DataTable server-page branch still applies a local sorted-row model without a lifted sorting callback. Active course-list callers pass a paginated slice, so clicking its sort header orders that slice, not the full queried dataset. This is an application contract issue, not a reason to buy another grid.
- Active gradebook code has both existing calculation/export behavior and local threshold paint. Preserve native scale/calculation/export semantics while consolidating presentation. A similarly named standalone matrix without established consumers must not be mistaken for the active page.

These are source findings, not claims that all charts have been rendered or that a library benchmark has been run. They justify upgrading our shared visualization design layer first.

## 2. What should visibly change

### Information hierarchy

- Give each view a clear academic question, a visible cohort/course/time scope and a primary next action.
- Prefer one dominant analytical view with a restrained row of supporting metrics to a wall of equal-weight KPI cards.
- Put essential interpretation next to the chart: measure, period, coverage/population and limitations. Show source/freshness only when known; distinguish retrieval time from the time evidence was recorded.
- Keep operational tasks close to the evidence: inspect a learner, review an assessment, open a curriculum mapping or examine underlying records, subject to existing permission contracts.
- Use progressive disclosure for secondary breakdowns. Do not hide essential units, missing-data status or filtering context in hover-only tooltips.

### Visual craft

- Retain the existing Source Sans3/Plus Jakarta/Noto Arabic families. Refine their hierarchy and numeric alignment rather than adding another font for novelty.
- Use consistent plot insets, axis-label treatment, tooltip rows, legend spacing, selected-series behavior and toolbar placement.
- Keep cards and plots quiet: semantic surfaces, fine separators, restrained elevation and generous space where reading requires it. No glass haze behind data, unnecessary card-in-card nesting or hover-lift on passive reading surfaces.
- Reserve brand blue/teal for focus and identity. Separate categorical series colors, ordered intensity scales, diverging changes and semantic statuses.
- Use a perceptually ordered palette where appropriate, but validate the final renderer colors/contrast. Switching every existing hex value to a modern color notation is not itself a quality improvement.
- Keep mascots for appropriate student/family moments and genuine known achievements, not as decoration on every analytical chart.

### Interaction quality

- Filtering, selection, reset, drill-down and return navigation should behave consistently. Preserve meaningful view state in existing route/query mechanisms.
- Support tap and keyboard equivalents for hover, brushing and zooming. Let important tooltip details remain inspectable rather than disappear under the pointer.
- Preserve stable row/series identifiers. A course must not change color merely because a filter or sort changed its array index.
- Show truthful loading, partial, empty, unavailable, stale, error and permission states. A premium empty state is better than fabricated bars or a false zero.
- Use short, purposeful transitions; honor both stored and OS reduction. CSS or MotionConfig alone does not prove a separate chart engine's animation is disabled.

## 3. Role-specific visualization priorities

| Role | Primary need | Recommended default presentation |
| --- | --- | --- |
| Teacher | Find work needing attention and inspect assessment evidence | Focused assessment/learner table, comparable outcome trends, distribution or item-analysis views with drill-down |
| Coordinator | Understand curriculum coverage and evidence gaps | Outcome-by-course matrix, explicit coverage/denominators, linked detail views and comparable trends |
| Admin | Understand institution-level operational/academic signals | Restrained summaries and cohort comparisons, clear scope/freshness, privacy-aware detail access |
| Student | Understand current evidence and the next supported action | Readable outcome rows, a small number of meaningful trends and contextual progress—not a miniature BI console |
| Parent | Understand released learning evidence and support a child | Clear summaries, simple comparable trends and actual supported actions; avoid unexplained technical heatmaps and unsupported delivery claims |

Role selects task composition and permissible detail, not a separate visual library or palette. Native results/model/scale/version and existing academic calculations remain authoritative.

### Example target composition — teacher assessment workspace

```text
Assessment overview       [Term] [Class] [Outcome set]       [Review work]
Scope / release status / recorded-evidence time

Measured coverage         Awaiting review         Recorded results

[ Main comparable outcome view                    ] [ Review priorities ]
[ Shared legend + concise interpretation           ] [ Authorized links  ]

[ Detailed assessment matrix / accessible data view                     ]
```

This is a layout proposal, not a data snapshot or implemented screen. It gives the main decision more space than decorative metrics, keeps context visible, and preserves a path from summary to evidence.

## 4. Choose the visual form from the question

| Question | Good starting form | Guardrail |
| --- | --- | --- |
| How did this measured result change over time? | Line/point or small-multiple trend | Preserve null gaps and actual observation dates; do not smooth/extrapolate unmeasured learning or compare incompatible scales |
| Which categories differ? | Sorted horizontal bars or dot plot | Label units and comparison scope; do not truncate bar baselines to exaggerate differences |
| Where is coverage missing? | Matrix/heatmap plus accessible table | Missing/unmeasured is distinct from zero/low; use labels/patterns, not color alone |
| How are results distributed? | Distribution or ordered category bars | Show population/coverage; apply existing suppression/privacy policy, never invent a new frontend threshold |
| How are curriculum entities connected? | Matrix or focused relationship view first | A Sankey is justified only when its weights/flow meaning are real and explained; mappings are not automatically quantities of learning |
| What should I act on? | Ranked, filterable table with evidence detail | Actions require existing authorization and truthful acknowledgement; charts must not manufacture decisions |

Avoid making radial gauges, radar charts, pie charts, 3D effects or Sankey diagrams the default simply because they look more elaborate. Keep valid specialized uses when they serve a demonstrated question.

## 5. Library decision matrix

| Option | Verified upstream position | Edeviser decision |
| --- | --- | --- |
| **Recharts + shared application chart recipes** | React/SVG composition; MIT. Already a project dependency. | **Default.** Improve existing consumers first. Reuse one frame/tooltip/legend/formatter/token contract rather than another engine. |
| **shadcn chart components** | Built with Recharts; current docs cover v3, config separate from data, CSS variables and accessible-layer integration. | Useful adoption reference/potential generated primitive. Do not copy demo colors, English formatting, raw controls or templates wholesale; preserve repository generated-code custody and current themes. |
| **TanStack Table + selective TanStack Virtual** | Table is headless; v8 does not include virtualization. Virtual is a separate headless library. MIT. | Keep the existing table base. Virtualization is a plausible first added capability for a measured large scrollable grid/list—not automatically for a ten-row paginated table. Keyboard, row identity and assistive-technology behavior still need implementation. |
| **visx v4 modules** | Low-level, React-owned visualization components; current docs require React18/19; MIT. Pick individual packages. | Conditional for a genuinely bespoke evidence/coverage visualization that current composition cannot express cleanly. Greater design and accessibility ownership, not an automatic premium skin. |
| **Apache ECharts** | Canvas and SVG renderers, modular imports and accessibility/decal facilities; Apache2.0 with notices/subcomponent terms. | Conditional, route-lazy specialist for measured dense/complex visualization needs. Compare the same data and interactions against the current renderer before adoption. Do not load two engines globally. |
| **AG Grid** | Community MIT; Enterprise commercial. Official matrix places range/clipboard, pivot/grouping, Excel export and other advanced features in Enterprise. | Evaluate only for a demonstrated spreadsheet-grade assessment workflow whose engineering savings justify integration/licensing. Not a purchase to make ordinary tables look premium. No price/contract approval assumed. |
| **TanStack Charts** | Official Alpha; regular0.x releases may break across minor versions; upstream main can be unreleased. MIT. | Watchlist or isolated experiment, **not the default engine for this remediation**. Its typed grammar is interesting, but maturity/compatibility costs need evidence. |

Do not add a second complete dashboard kit, another animation framework, a new icon family or several overlapping chart engines. The current stack can already produce a premium interface. Library capabilities and vendor performance claims are not Edeviser benchmarks.

### Important operational caveats

- Recharts accessibility support must be verified for the installed version and actual chart/tooltip composition. An accessibility flag is not blanket WCAG conformance.
- ECharts' handbook requires its Aria component to be imported/enabled for the documented features. Descriptions and decals do not replace keyboard operation or an accessible data alternative; check exact option names against the pinned version rather than copying mixed-version examples.
- ECharts' Canvas/SVG guidance explicitly calls for workload/device experimentation. Do not turn its approximate element-count guidance into an untested universal threshold.
- visx provides building blocks, so custom interactions, layouts, descriptions and tests remain our responsibility.
- Grid range editing, clipboard, export and formulas can introduce licensing, data-integrity and permission requirements. None is approved merely by selecting a library.

## 6. A governed visualization layer—not another framework

Recommended ownership:

```text
Existing API/domain contracts and authorized data
    → explicit evidence/view-state model
    → shared visualization frame and controls
    → a few chart/matrix/table recipes
    → renderer-specific adapter where necessary
```

The frame should establish title/description, filters, plot region, legend, concise explanation, coverage/source status, data alternative and actions. Favor composition slots over a giant configuration object with dozens of unrelated booleans. Keep renderer capabilities available; do not recreate the entire Recharts/ECharts API behind an opaque abstraction.

Start with a small family: trend, category comparison, coverage matrix and distribution, plus evidence-table/detail composition. Add shared semantic visualization tokens for axes, grids, series, selected/muted states, missing data and tooltip surfaces. Values belong to the design-system owner, not page-specific palettes.

The renderer must not calculate new attainment policy, infer a privacy threshold, classify a native grade, fill missing observations with zero or turn a backend failure into a successful action. Preserve filtering/authorization for the chart, its table alternative and exports alike.

Keep **observed evidence separate from AI interpretation**. A generated explanation should be labeled as such and point back to available evidence; it must not fabricate confidence, improvement or causality. A recommended intervention belongs behind the existing human-review/authorization boundary. Grid formulas or visualization transforms must not become a second authoritative grading engine.

## 7. Accessibility, Arabic and performance are part of premium

- W3C guidance calls for identification plus an adequate text representation of complex visual information. Provide a concise summary and structured underlying data where appropriate; a giant `aria-label` is not a usable substitute for a navigable table.
- Use color-independent cues and distinguish unavailable data. High contrast must retain series meaning, not collapse every series to the same visual mark.
- Verify actual Arabic glyphs, mixed-script identifiers and numeric/date formatting against configured locale/time/calendar semantics.
- Do not blindly reverse every chart because text is RTL. Decide and test axis direction according to the chart's meaning and the product convention; localize controls and descriptions separately.
- Keep chart containers measurable at first render and reserve their layout space. Handle hidden tabs, resizing and enlarged text without clipping.
- Virtualized grids must preserve cell/row identity, focus, editing state and truthful row counts. Provide a usable alternative when virtualization compromises a reading workflow.
- Defer heavy visualization code to the routes that need it. Measure initial/route transfer, interaction latency, update/scroll cost and memory on representative devices and datasets. Do not report emitted assets or hypothetical gzip size as measured network delivery.
- No screenshot or browser visual inspection was performed for this research. Our application's current rendered matrices remain scoped evidence, not proof that every visualization already meets this direction.

## 8. Implementation sequence inside the existing goal

1. Audit and classify current chart consumers, their actual measurements and their task purpose.
2. Establish one visualization frame/token/formatter/state contract using the existing engine.
3. Prove three representative vertical slices: a teacher assessment workflow, coordinator coverage matrix and parent/student evidence summary, including Arabic, dark/high-contrast, keyboard/touch and missing/error states.
4. Register approved recipes/examples in the existing catalog and eventual real-source explorer, with explicit evidence scope.
5. Benchmark any proposed extra engine/virtualizer using equivalent data, interaction and accessibility requirements. Record exact version, peer compatibility, license/notice requirements, lazy-loading cost, maintenance owner and rollback.
6. Migrate remaining consumers and only then retire duplicate recipes or dependencies with proof. Keep the single ledger as the acceptance tracker.

A new library is accepted only when it solves a concrete capability/performance problem or materially reduces verified implementation cost. A prettier default screenshot is insufficient.

## References and provenance

**Search discovery:** [React visualization search](https://html.duckduckgo.com/html/?q=Recharts+visx+Apache+ECharts+accessible+React+charts), [TanStack Charts maturity search](https://html.duckduckgo.com/html/?q=TanStack+Charts+alpha+beta+2026+official), [school workflow search](https://html.duckduckgo.com/html/?q=site%3Atoddleapp.com+gradebook+assessment+progress+reports+curriculum+maps). Dedicated search-tool timeout is not presented as success; these public search pages did return results.

**Primary product/design references:**
- [Toddle assessments/gradebook](https://www.toddleapp.com/product/assessments-gradebook/) and [curriculum planning](https://www.toddleapp.com/product/curriculum-planning/) — product taxonomy, not authenticated usability proof.
- [Linear redesign article](https://linear.app/now/how-we-redesigned-the-linear-ui) — hierarchy, alignment, quiet chrome and theme-system reasoning; dated2024.
- [W3C WAI complex images](https://www.w3.org/WAI/tutorials/images/complex/) — descriptions and structured alternatives, updated2026.

**Primary library/version/licensing references:**
- [Recharts project](https://github.com/recharts/recharts) and [MIT license](https://github.com/recharts/recharts/blob/main/LICENSE).
- [shadcn chart documentation](https://ui.shadcn.com/docs/components/chart).
- [TanStack Table](https://github.com/TanStack/table), [v8 virtualization guide](https://github.com/TanStack/table/blob/v8/docs/guide/virtualization.md), [v8 MIT license](https://github.com/TanStack/table/blob/v8/LICENSE).
- [TanStack Virtual](https://github.com/TanStack/virtual) and [MIT license](https://github.com/TanStack/virtual/blob/main/LICENSE).
- [visx documentation/status](https://github.com/airbnb/visx) and [MIT license](https://github.com/airbnb/visx/blob/master/LICENSE).
- [ECharts accessibility](https://echarts.apache.org/handbook/en/best-practices/aria/), [Canvas versus SVG](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/), [license and subcomponent terms](https://github.com/apache/echarts/blob/master/LICENSE).
- [AG Grid official feature/license matrix](https://github.com/ag-grid/ag-grid) — its product-page request returned403, so the official repository was used; no price claim.
- [TanStack Charts official Alpha status](https://github.com/TanStack/charts) — pin release-specific documentation before any experiment.

No libraries were installed, no paid license was purchased and no backend/domain contract was changed by this research.

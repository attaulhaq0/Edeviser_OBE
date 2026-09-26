# Edeviser frontend design-system strategy — principal assessment

**Status: approved for staged implementation by the user's instruction to incorporate and fix this entire report in the existing master goal (revision33). This is not an implemented platform or a second completion checklist.** The founder-approved launch contract remains product authority. `src/design-system/README.md` is the current design-system entrypoint; `docs/audits/frontend-forensic-remediation-ledger.md` remains the sole remediation/evidence tracker. Approval establishes required work, not installation, verification or deployment. Optional MCP/registry/platform choices require recorded evidence-based decisions; required architectural fixes may not be deferred simply to claim completion.

The user's visualization-focused premium-design follow-up is documented in [Premium visualization within the calm-academic direction](./premium-visualization-strategy.md). It keeps the current stack as the default, specifies task-focused visual/interaction improvements and defines evidence/licensing conditions for any additional chart/grid library. Research does not itself install or approve commercial tools; implementation remains in the same master goal.

## Executive judgment

The current React/Vite/Tailwind/Shadcn stack is a viable foundation. A framework rewrite is not required to make Edeviser coherent or redesignable. However, the repository is a **partially consolidated system**, not yet a finished scalable design platform. Shared tokens and repaired components help, but legacy patterns, conflicting guidance and uneven adoption still make changes unpredictable and give new AI agents multiple competing examples.

Scalability here has distinct meanings:
- **Visual:** one controlled decision updates its intended consumers.
- **Engineering:** teams add features without duplicating primitives or overriding each other.
- **Redesign:** branding, component appearance and workflow changes have separate scopes.
- **AI assistance:** an agent can discover approved APIs/examples and is checked by executable policy.
- **Runtime:** delivery size, large lists, rendering and network cost remain measured separately. Design-system architecture is not evidence of backend/student-capacity scalability.

## 1. Design direction

A calm academic workspace: task-oriented school workflows, quiet consistent chrome, strong reading hierarchy, a clear primary action and progressive disclosure. Preserve Edeviser's blue/teal identity, appropriate mascot use and distinctive typography. Precision Light and Obsidian Dark should have deliberate surfaces and readable states. Staff may need dense collections; students/families may need clearer next-action narratives. These are task/density compositions, not five unrelated palettes.

Reading/display preferences are supporting accessibility infrastructure, not the main redesign. They do not replace the remaining work on course, assessment, reporting, communication and family journeys.

## 2. Evidence from the current repository

| Observed source | Architectural implication |
| --- | --- |
| `src/design-system/README.md:43–53` specifies foundations, environment owners, primitives, patterns and retirement. | The intended separation is sound, but a written target is not universal adoption. |
| `src/design-system/tokens.css:3–102` contains font families, scales, brand/reference colors and semantic colors. | Central change points exist; reference, semantic and component responsibilities still need clearer boundaries and usage enforcement. |
| `src/design-system/primitives/index.ts:9–26` re-exports generated Shadcn components. | There is an adoption facade rather than another primitive implementation. Import policy and supported application-level recipes must become unambiguous. |
| `src/design-system/patterns/KPICard.tsx:15–35` accepts arbitrary color class overrides and has fixed prototype geometry, raw colors and hover lift. | Merely importing a shared component does not guarantee a token-driven or future-redesign-safe result. |
| `src/design-system/patterns/EMeter.tsx:35–55,109–118` has literal palettes/inline fill selection and treats non-finite input as zero. | Appearance and data-state semantics both need governed contracts; moving hex values alone would not make unknown data truthful. Academic classification must remain outside generic presentation. |
| `src/design-system/PARITY.md:3–24,50–68` calls prototype fidelity the reference and gives raw prototype values priority; README describes a calm-academic migration away from those islands. | A fresh agent can follow a plausible but conflicting instruction. Historical reference and current authority need an explicit boundary. Do not delete active prototype tooling to resolve a documentation conflict. |
| `components.json:3,14,22` uses `new-york`, `rtl:false`, and an empty registry map. | Current runtime RTL repairs are not proof that future generated components will be RTL-ready or use an Edeviser registry. This configuration needs a reviewed migration, not a blind toggle. |
| The ledger keeps source inventory, scoped browser proof and customer readiness distinct. | This is valuable governance. A count of passing tests or discovered routes is not a percentage of completed product redesign. |

Additional enforcement/discoverability findings:
- `eslint.config.js:15,37–50` excludes generated UI and enables general React/TypeScript/accessibility rules, not semantic-token, logical-CSS or design import-boundary enforcement. `package.json` separates `lint` and `lint:design`; the inspected workflow files do not invoke `lint:design`.
- `scripts/design-lint/check.mjs:6,41–45,65–70` is intentionally a source-text scanner, including comments/fixtures. Its narrow utility checks do not classify icon/status context or cover most literal paint/import forks. Its fixture tests prove scanner behavior, not repository compliance.
- No general Storybook configuration, source stories or component-gallery surface was found in the inspected project configuration/source. The existing mascot catalog is useful domain metadata, not a general component catalog.
- Names alone are not proof of duplication: `AdminPrimitives.tsx` delegates its section header to the shared pattern, while other recipes still contain literal paint/hover behavior. Classify contracts and consumers, rather than deleting everything named Admin or Hawdex.

These are source observations, not live deployment claims. Line numbers reflect the review-start snapshot and may move. **Immediate documentation improvements made during this assessment:** root/nearest AGENTS now link the design-system entrypoint; README maps the current font/environment/control owners and import choices; PARITY is explicitly historical and no longer claims priority over the current contract. These documentation changes do not implement the proposed catalog, lint rules, token pipeline or Storybook.

## 3. Recommended hierarchy

```text
Product and experience rules
  └─ Reference tokens: approved raw palette, scales, families, dimensions
      └─ Semantic tokens: canvas, surface, text, action, focus, status
          └─ Component recipes/tokens where genuinely needed
              └─ Accessible primitive adoption layer
                  └─ Shared patterns: headers, cards, states, forms, collections
                      └─ Page templates: collection / detail / form / workspace
                          └─ Domain feature composition
                              └─ Thin route entrypoints
```

Theme, direction, typography, density and accessibility are coordinated environment inputs across this hierarchy. Role/tenant authorization is **not** a theme concern. Role may select a layout, density or permitted actions; it must not require a separate button/card library.

Keep a parallel data boundary:

```text
Existing API contracts → owned query/mutation hooks → framework-free domain rules
  → explicit view states → presentation patterns
```

A generic meter should not choose an academic attainment band or turn an unavailable measurement into zero. Components consume domain decisions; they do not silently redefine them.

### Practical API rule

Prefer finite semantic choices such as emphasis, density and meaningful status to unrestricted `iconBgClass`/`valueClassName` paint overrides. Keep deliberate composition escape hatches, but document and review them. Do not create a universal component with dozens of unrelated booleans.

“No hardcoding” should mean **no uncontrolled repeated design decisions**, not no literal values anywhere. Approved token definitions, native minimum target sizes, licensed brand art and data-driven geometry require explicit values. Those values need the correct owner.

## 4. How a future complete redesign would work

| Change | Intended scope after consolidation | Current caveat |
| --- | --- | --- |
| Palette, type scale, radius, spacing, elevation | Token definitions and generated/consumed theme output | Legacy literal styles and escape hatches can still ignore the change. |
| New visual treatment of cards, inputs, dialogs | Shared primitive adoption and patterns | Some duplicate/legacy implementations remain. |
| Different navigation, information hierarchy or task flow | Shell/page templates and selected feature compositions | No honest architecture can promise a workflow redesign from one CSS file. |
| New institution branding | Validated, bounded brand configuration plus contrast tests | Do not fork code or academic semantics per school. |
| Another web application | Reuse a versioned design package once interfaces are stable | A second real consumer should justify packaging/distribution work. |
| Native/mobile platform | Reuse token/semantic decisions; implement platform-appropriate UI | Web React components are not automatically native components. |

The target is a bounded, testable redesign—not “change one file and everything is finished.” API, authorization and native academic-result contracts should remain stable when changing presentation.

## 5. Current techniques worth adopting, with limits

### A. Interoperable typed tokens

The official technical-reports index and the published **Format and Resolver modules** directly confirm **2025.10, published 2025-10-28, as stable**. Both are Final Community Group Reports, explicitly not W3C Standards or Standards-Track Recommendations. This is an interchange/context-resolution foundation, not a complete design-system implementation.

The now-accessible published specifications sharpen PR04's acceptance requirements:
- Token types must be explicit, inherited or resolved from references—not guessed from names or values. Token/group structure, reserved names and typed values need validation.
- State the pipeline's writer/reader/resolver support boundaries. A tool claiming full format-reading support must implement the required reference behavior, including JSON Pointer, and reject invalid/circular references; a narrow export must not be advertised as a complete general-purpose implementation.
- Preserve unknown `$extensions` and use supported `$deprecated` metadata when retiring tokens; do not lose vendor metadata during translation.
- Keep the Format module separate from the Resolver module. The latter models sets, modifiers, contexts and an explicit resolution order. Prefer independent concerns where possible; verify every supported final theme/contrast/density combination rather than duplicating a palette per role.
- Intentional, documented context precedence is different from ad hoc CSS specificity contests. It still requires validation and rendered contrast checks.

Sources: [published Format module](https://www.designtokens.org/TR/2025.10/format/) and [published Resolver module](https://www.designtokens.org/TR/2025.10/resolver/).

Recommended path: formalize reference/semantic ownership now; then evaluate a lossless migration of portable tokens to a pinned DTCG-compatible authoring/build pipeline. Have **one authoring source** and generated outputs with drift checks. Do not maintain independent editable CSS, JSON and Figma token sets. Do not force every contextual CSS expression or viewport calculation into a portable primitive token.

Current canonical CSS should remain authoritative until a tested migration explicitly changes that decision. A token compiler is optional infrastructure, not the source of design quality.

### B. Executable component documentation

Pilot Storybook on the most reused components/patterns, importing real source, the real CSS graph and representative environment providers. Document states, semantics, localization, keyboard behavior, long content and large text—not just a default screenshot.

Stories should support interaction/accessibility checks and reviewed visual baselines. They supplement, not replace, actual application routes, auth lifecycle tests, performance checks or live-backend attestation.

### C. AI-readable component manifests and MCP

Storybook's official documentation describes generated component/docs manifests and MCP tools for discovering APIs/examples and running tests. It explicitly marks the AI capabilities and manifest schema as **preview**. Pilot and pin them behind an adapter; retain ordinary Markdown/types/stories as a tool-independent fallback. Do not make a changing preview schema a production dependency.

A useful catalog must identify the approved import, purpose, props/variants, required states, localization constraints, examples, verification scope, lifecycle responsibilities, status and replacement for deprecated components. Generate API details from source/stories; do not create a second hand-maintained prop catalog.

The refreshed official Storybook documentation also matters operationally:
- Its default `manifest` tag includes stories/docs; curate or exclude compatibility and unsuitable examples rather than exposing every historical example as a new-work recommendation.
- React API extraction is configurable; the docs recommend `react-docgen-typescript` for detail/accuracy, with a performance tradeoff.
- With `experimentalDocgenServer`, development JSON manifest endpoints can return404 by design; a built manifest or the documented service/debugger is the appropriate verification surface. Do not hardcode one assumed development endpoint.
- The manifest schema remains preview, not a stable public API. Version/adapt any integration and retain the source/Markdown fallback.

Edeviser now has its own seven-entry source-derived component-catalog pilot with a read-only CI check and scoped tests. **That local JSON schema is neither a DTCG token document nor a Storybook manifest.** The pilot and one fresh-agent example do not establish a complete explorer, rendered-story coverage or general AI reliability; current evidence remains in the ledger.

### D. Registry distribution

shadcn MCP supports discovery and installation from configured registries. An Edeviser registry could help bootstrap another frontend. It does not automatically keep copied source synchronized. Within the current application, prefer existing imports to repeatedly installing new copies. Pin/allowlist sources and review generated changes/dependencies.

### E. First-class RTL generation and context

The current shadcn docs describe RTL migration and direction support, but automatic transforms are limited to newer styles; this repository uses `new-york`. Investigate a scoped, version-pinned migration and a single direction context, preserving current appearance and APIs. Test popup placement, keyboard direction, icons and logical animation behavior. Do not flip `rtl:true` and declare every existing primitive fixed.

The refreshed migration guidance specifically excludes Calendar, Pagination and Sidebar from automatic migration, and flags a logical-slide issue in `tw-animate-css` with explicit portal direction as a workaround. Our generated-primitive custody rule still applies: use reviewed generation/adoption, not unreviewed manual edits copied from a generic guide. Directional arrows may need mirroring; brand assets and nondirectional symbols must not be indiscriminately flipped.

### F. Deterministic cascade and component-responsive layouts

Use documented CSS layer/adoption ownership and logical properties. Introduce container queries where a component's available container—not the global viewport—determines layout. Do not blanket-rewrite working code or add a second styling framework. Cascade migration must account for unlayered rules and the different ordering of important declarations; compilation and actual-browser tests are required.

**Source detection is a separate ownership boundary.** Tailwind's official v4 documentation says it scans source as text, not through JavaScript's runtime import graph. Unimported examples and tests can therefore change emitted CSS. Use complete static class names; dynamic fragments are not a reliable generation contract. The documented `source()`, `@source`, `@source not` and `source(none)` controls can define boundaries, but existing prototype/test exclusions must be migrated with dependency and build proof—not applied broadly to hide missing production classes.

This is already a measured Edeviser concern: the fresh-agent example was not runtime-imported, yet one unique flex-basis utility added47 bytes to the production stylesheet. Removing exactly that emitted rule restored the previous CSS hash. Round23 then corrected the actual production source boundary with a narrow exclusion of that benchmark directory: the full production build again emitted byte-identical234501B CSS, while the example's19 tests and explicit utility generation remained available. Keep usability, source isolation and rendered quality as separate claims; this does not justify broadly excluding other fixtures or prototypes. [Official source-detection guidance](https://tailwindcss.com/docs/detecting-classes-in-source-files).

## 6. Make AI generation predictable

The intended agent path is:
1. Read root/nearest AGENTS and the approved product constraints.
2. Read one concise current design entrypoint and consult the approved component catalog.
3. Inspect the nearest feature/public barrel and comparable approved stories.
4. Compose existing patterns; keep queries/ownership and domain rules in their established layers.
5. Implement English/Arabic, responsive and truthful state behavior together.
6. Run applicable lint/type/unit/interaction/accessibility/browser gates.
7. Submit evidence and clearly label anything captured but not visually reviewed.

Agents must not infer permission to install arbitrary registry code, edit generated primitives manually, promote snapshots, inspect production secrets or make live business writes. MCP is discovery/tool transport—not a correctness or authorization guarantee. A registry for UI source must not become a source of real student/tenant data.

Success should be tested with a fresh agent on representative new-screen tasks: can it find the approved API, avoid deprecated examples, create all required states and pass the same gates without private instructions or palette overrides? Do not call the repository AI-friendly based only on the existence of AGENTS.md.

## 7. Enforcement and migration recommendation

1. **Resolve authority first (G01/G03).** Reconcile current guidance and historical parity references; document the real font/environment/adoption entrypoints. Preserve protected files and active tooling. Mark legacy components explicitly rather than presenting every export as equally approved.
2. **Establish approved contracts (G03/G04).** Standardize the high-reuse patterns and page families. Favor a few coherent APIs over a large generic schema-driven UI engine.
3. **Make the contracts executable (G02/G08).** Pilot real-source stories/catalog generation, import-boundary checks, token-reference checks and a no-new-violations design-policy ratchet. Separate an inventory scanner from a meaningful CI gate. Review legacy exceptions by owner; do not simply bless the current baseline forever.
4. **Migrate vertical slices (G04/G05/G06).** For each route family, connect real data/states, migrate its sections, verify EN/AR, both themes, keyboard/touch and reflow, then mark that scope. Do not create another global theme island per role.
5. **Govern change and release (G07/G09).** Track consumers, deprecations and replacements; use codemods when APIs change; preserve rollback and user modifications. A future design version requires reviewed visual changes and regression evidence, not snapshot auto-approval.

The ledger remains the execution tracker for these milestones. This assessment adds reasoning, not a competing task-status register.

## 8. What not to add by default

- A Next.js/React rewrite solely to modernize the appearance.
- Microfrontends or one library per role in a single application.
- A new styling/animation framework alongside the existing ones.
- A full custom token platform when a standards-compatible build can suffice.
- Runtime LLM-generated UI or production write access to solve development guidance.
- Premature package/registry infrastructure before the canonical APIs are stable.
- Another layer of important CSS overrides over unresolved ownership.

## Research scope and references

Initial research was limited by a search-connector configuration error and failed direct requests to the token site. After the user reported access restored, two fresh search attempts (a four-query batch and then one narrower query) still timed out after60 seconds each. No search results were returned, so a broad current-market survey is not claimed. **Direct official-page access now works:** the DTCG index and published Format/Resolver modules were fetched successfully, alongside current shadcn RTL guidance, Storybook's official manifest documentation source and Tailwind's official source-detection documentation. The substantive requirements above were refreshed from those primary sources. No new framework, token compiler, Storybook or MCP server was installed by this documentation update; the separately implemented local catalog is identified explicitly.

In the subsequent premium-visualization research, the dedicated search tool again timed out, but **public DuckDuckGo HTML search pages successfully returned discovery results**. Relevant results were then checked against official project documentation and licenses. The linked visualization report records that successful fallback, current-versus-installed version distinctions, selected-library decisions and inaccessible/truncated sources; it does not retroactively claim the earlier tool calls succeeded.

- [DTCG technical reports — directly reverified stable-version index](https://www.designtokens.org/technical-reports/)
- [DTCG Format Module2025.10 — published specification](https://www.designtokens.org/TR/2025.10/format/)
- [DTCG Resolver Module2025.10 — contexts and resolution order](https://www.designtokens.org/TR/2025.10/resolver/)
- [DTCG official repository and stable-version table](https://github.com/design-tokens/community-group)
- [Storybook component/docs manifests — preview status and source extraction](https://storybook.js.org/docs/ai/manifests)
- [Storybook MCP overview — capabilities, framework support and preview status](https://storybook.js.org/docs/ai/mcp/overview)
- [shadcn MCP — registry discovery/installation](https://ui.shadcn.com/docs/mcp)
- [shadcn RTL — supported styles, migration limits and portal-direction caveat](https://ui.shadcn.com/docs/rtl)
- [Tailwind source detection — explicit source and exclusion controls](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Official Storybook manifest source — preview, extraction and curation details](https://github.com/storybookjs/storybook/blob/next/docs/ai/manifests.mdx)
- [Official Tailwind source-detection documentation source](https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/detecting-classes-in-source-files.mdx)

**Bottom line:** keep the viable stack, complete consolidation, and improve governance/discoverability before scaling the number of new screens. The next maturity step is an executable, versioned design contract—not more ad hoc components and not a fashionable framework rewrite.

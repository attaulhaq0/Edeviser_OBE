# Edeviser design system — current wiring and migration contract

The target is one shared **Precision—Light / Obsidian—Dark** system with semantic role overrides, not five independently styled component libraries. Consolidation is in progress. The [forensic remediation ledger](../../docs/audits/frontend-forensic-remediation-ledger.md) distinguishes verified repairs from remaining work; this document does not certify every component or route.

Product direction follows the founder-approved launch contract maintained in the shared project workspace; that externally authored product/governance document is not included in this frontend-only checkpoint. Its K–12 learning-intelligence direction is a target, not evidence of deployed or customer-ready behavior. Keep the ledger's scoped local verification separate from full launch certification.

**For new frontend work:** start here after the root/nearest AGENTS instructions. [PARITY.md](./PARITY.md) records an earlier prototype-fidelity contract and active migration references; it does not authorize reintroducing raw prototype colors, hover lifts, fixed text or light/LTR-only behavior over the current semantic/accessibility contract. The [principal architecture assessment](../../docs/architecture/frontend-design-system-strategy.md) is approved for staged implementation under the master goal. Its approval does not mean every catalog, token-tooling or Storybook/MCP capability is already installed or verified; use the current status and scoped evidence below and in the ledger.

## Completion standard for the product-wide redesign

The shared shell and selected pattern tests are milestones, not a definition of 100% completion. The final acceptance boundary covers **every active role route, its sections/cards, and its reachable interaction states**:

- Maintain a route-to-owner inventory, including aliases and shared modules. Each active page must compose the canonical patterns and semantic theme contracts; an unused legacy file passing source checks is not evidence for a routed screen.
- Remove page-local light-only/dark-only surface, text, border, focus and status islands. Define paired semantic presentation once at the design-system owner, then consume it without competing inline colors, duplicated theme tables or escalating important overrides. Document deliberate brand-asset colors and data-driven geometry separately; neither is permission for a page to invent another theme.
- Preserve generated primitive ownership. Necessary adoption must use supported props and one explicit shared recipe—not generated forks or one wrapper per role. Role identity/density are governed compositions of the same system.
- Verify populated, loading, empty, partial, error and permission states where reachable; hover, focus, active, disabled and selected controls; live theme/language changes; long content and enlarged text. Include mobile safe areas and overlay/focus interactions, not only static desktop screenshots.
- Use actual rendered components and inspected images/layout/paint. Font-family declarations alone do not prove loaded glyphs. Mocked business seams must be labeled; a successful isolated fixture is not an authenticated end-to-end or live-backend claim.
- Preserve academic calculations, routes, permissions and API payloads with regression tests. No invented counts, confidence or unmeasured results may be introduced to make a card look complete.
- Complete the relevant ordered lint/type/unit/build/smoke/browser, locale, dependency and performance checks. Leave failures and untested scope explicit; do not reduce thresholds or reclassify normal text to obtain a passing report.

These are **acceptance requirements still being implemented**, not a claim the present repository meets them. The ledger remains the evidence authority.

## Redesign decision — calm academic workspace

The selected direction is **school-first workflows with precise workspace craft**, not a clone of another product or a new skin over unresolved overrides.

| Reference | Evidence reviewed | Adopt for Edeviser | Do not copy |
| --- | --- | --- | --- |
| [Toddle product overview](https://www.toddleapp.com/product/product-overview/) and [assessment module](https://www.toddleapp.com/product/assessments-gradebook/) | Public product taxonomy: curriculum, assessment, portfolios, reporting, communication and class operations | Organize around the actual learning/teaching task and role journey | Marketing claims as proof of authenticated usability; unrelated assessment semantics |
| [Linear's published redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | Its documented work on sidebar/tab/header alignment, hierarchy, density, theme aliases and environment stress tests | Quiet chrome, deliberate density, consistent surfaces and measured light/dark hierarchy | A developer-tool information architecture or compressed student touch controls |
| [Notion's view/filter/group reference](https://www.notion.com/help/views-filters-and-sorts) | Public help taxonomy, not a logged-in product review | Consider focused views and progressive disclosure for complex collections | Turning every learner task into a configurable database interface |

These are selected public references, not an exhaustive current-market comparison. The search connector was unavailable during the initial research; official URLs were fetched directly. Product screenshots/authenticated competitor workflows have not yet been independently evaluated.

### Intended experience (target, not completed coverage)

- **Precision Light:** clean, softly separated surfaces, strong reading hierarchy and restrained blue/teal identity. No rainbow of competing dashboard panels.
- **Obsidian Dark:** deliberate canvas/card/popover elevations, readable secondary text and visible controls—not inverted light colors or neon decoration.
- **Typography:** current canonical content uses self-hosted Source Sans 3, Plus Jakarta Sans for headings/brand, and Noto Sans Arabic for Arabic. The optional Latin reading face is OpenDyslexic; unsupported scripts retain the declared fallback stack. `fonts.css` owns declarations/URLs and `fontPreferences.ts` owns verified optional activation/retry. Keep brand and content responsibilities distinct; a declared family is not loaded-glyph evidence.
- **Density:** compact, scannable academic workspaces for staff; clearer next-action and progress narratives for students/families. One shared component system with explicit density/composition choices, not per-role forks.
- **Mobile:** prioritize the current task, one primary action and reachable navigation. Recompose tables, filters, action groups and detail panels; do not simply shrink desktop grids or hide overflowing controls.
- **Motion:** short, interruptible feedback and purposeful transitions. Existing CSS/Motion capabilities are the starting point; no additional animation framework by default. Static reading surfaces do not lift on hover as if they were buttons. Reduced motion must preserve visible status and functionality.
- **Intelligence:** evidence and supported next actions, with clear human approval boundaries. No invented confidence, scores, causal claims or autonomous academic writes.

### Ownership contract

1. **Foundations:** tokens.css owns brand, typography scales, surfaces, semantic fill/foreground pairs and motion defaults. The [portable color pilot](../../docs/design-system/PORTABLE-TOKENS.md) exports only 16 selected normal light/dark literals from that CSS; its generated JSON is not another editable source, Resolver implementation, or all-token adoption proof. Light defaults precede dark overrides. Domain meaning is separate from role identity.
2. **Theme/locale/accessibility:** explicit owners select the root theme and typography preferences; component rules must not silently defeat them. Inspect inline styles as well as stylesheet layers and specificity.
3. **Role scope:** small consumed semantic overrides at role boundaries, carried into portals. An inherited alias is resolved where declared; rebinding a dependency on a descendant is not enough.
4. **Primitives:** existing generated Shadcn implementations remain the primitive source; their design-system exports are facades, not duplicate implementations. Use supported composition/regeneration rather than hand-forking generated code.
5. **Patterns:** one implementation per reusable header, surface, state, collection and navigation behavior. Pages compose these; they do not introduce another palette, hover recipe or typography system.
6. **Overrides:** repair the owning rule rather than append a competing stylesheet or !important patch. Runtime inline values are appropriate for data-driven geometry, not a parallel theme. Keep necessary className customization explicit and verify its rendered behavior.
7. **Retirement:** inventory imports, exports, dynamic references, tests and assets before deletion. Remove obsolete implementations only after callers migrate and replacements pass. Necessary tests/docs/build checks are not runtime bloat and must not be deleted merely because they do not ship to the browser.

Acceptance is per route family: real rendered light/dark and LTR/RTL, web/mobile reflow, long content, loading/empty/error/permission/partial states, keyboard/touch/focus, portal inheritance and reduced motion. A declaration count or successful compile is not whole-product redesign evidence. The consolidated ledger remains the implementation/evidence record; do not create parallel completion checklists.

## Current source entrypoints

These are repository-source relationships, not a deployment attestation.

| Responsibility | Existing entrypoint |
| --- | --- |
| Application stylesheet import | [main.tsx](../main.tsx) |
| Single Tailwind + token compilation graph; shared layout/interaction styles | [index.css](../index.css) |
| Shared palette, semantic colors, typography, motion and shell dimensions | [tokens.css](./tokens.css) |
| Canonical self-hosted face declarations and URLs | [fonts.css](./fonts.css) |
| Paired high-contrast semantics and reduced-motion backstop | [accessibility.css](./accessibility.css) |
| Supported portal layers and scroll defaults | [portals.css](./portals.css) |
| Shared control focus, minimum targets and logical adoption | [controls.css](./controls.css) |
| One account/device preference owner around routes and overlays | [AccessibilityPreferencesProvider.tsx](../providers/AccessibilityPreferencesProvider.tsx) |
| Stored reduction adds to platform MotionConfig preference | [AccessibilityMotion.tsx](../providers/AccessibilityMotion.tsx) |
| Optional font resource loading/verification, without duplicate URL ownership | [fontPreferences.ts](../lib/fontPreferences.ts) |
| Adopted Shadcn primitives, re-exported without duplicating implementations | [primitives/index.ts](./primitives/index.ts) |
| Shared composition patterns (some still require migration) | [patterns/index.ts](./patterns/index.ts) |
| Existing Hawdex public primitive facade, including the active Logo | [hawdex/primitives.ts](./hawdex/primitives.ts) |
| Production-owned mascot catalog and assets | [mascot/index.ts](./mascot/index.ts) |
| Public design-system exports | [index.ts](./index.ts) |
| Shared role shell and responsive navigation ownership | [RoleAppShell.tsx](../app/RoleAppShell.tsx) |
| Shared responsive brand/destination contract | [RoleBrandLink.tsx](../components/shared/RoleBrandLink.tsx) |
| One localized default-close generated Dialog adoption (pilot) | [LocalizedDialogContent.tsx](../components/shared/LocalizedDialogContent.tsx) |

```text
src/main.tsx
  └─ src/index.css                         (one Tailwind compilation graph)
       ├─ src/design-system/fonts.css
       ├─ src/design-system/tokens.css
       ├─ src/design-system/accessibility.css
       ├─ src/design-system/portals.css
       └─ src/design-system/controls.css
```

**Tokens are imported and affect the application now.** Keep them in index.css's Tailwind compilation graph. Importing the token stylesheet separately from JavaScript does not reliably make its `@theme` names available when Tailwind generates semantic utilities. Do not restore the former two-entry arrangement or duplicate token declarations in a new stylesheet to mask missing utilities.

`primitives/index.ts` adopts the existing generated components in `src/components/ui/`; do not hand-edit those generated files to create another design system. Shared application components belong in `src/components/shared/`, while domain/role composition lives in the relevant feature modules and route layouts. No `design-system/themes/` directory is currently part of this map.

### Choosing imports for new work

| Need | Preferred entry | Important limit |
| --- | --- | --- |
| Basic controls and surfaces | `@/design-system/primitives` | This facade adopts generated Shadcn; it is not a second implementation. Existing direct `ui/*` imports remain migration work, not proof of a fork by themselves. |
| Reusable presentation | `@/design-system/patterns` | Prefer reviewed patterns such as PCard, SectionHeader and StatePanel. Not every exported pattern is fully migrated; check its source and ledger scope. |
| Cross-feature behavior | The relevant `@/components/shared/*` component | This directory is not uniformly legacy: account-menu, reading-dialog and other shared behavior belong here. Do not rebuild them separately per role. |
| Dismissible default-close dialogs | `@/components/shared/LocalizedDialogContent` | Uses the generated DialogContent with `showCloseButton={false}`, constrains its intrinsic grid track for long forms, and supplies one localized logical 44px close. Controlled external triggers should pass `returnFocusRef` for focus restoration; an ordinary Radix DialogTrigger retains native focus ownership. Intentional no-close approval/consent/celebration dialogs keep their existing owner. The edge-to-edge SearchCommand palette uses a documented custom in-flow translated close instead of this absolute-close wrapper. Other callers remain unmigrated. |
| Domain feature | Its public `@/features/<domain>` barrel | Do not reach into another feature's internals or move academic decisions into generic UI. |
| Compatibility exports | Existing Hawdex/Admin/older facades only when required by the current consumer | A name is not proof of duplication. Inventory behavior and callers before replacing or retiring it; do not use an unreviewed compatibility implementation as a new default. |

There is not yet a complete approved component catalog or enforced import boundary. This map is guidance, not a claim that the repository is policy-clean. Ordinary ESLint and the separate source-text design scanner have different scopes; scanner unit tests do not prove the real application has no design violations.

The [seven-entry pilot catalog](../../docs/design-system/catalog/README.generated.md) combines curated adoption guidance with source-derived TypeScript APIs and typechecked examples. Its [curated metadata](../../docs/design-system/catalog/pilot.json) is not a second prop specification. Run `npm run check:design-catalog` for read-only source/example validation and artifact drift; regenerate explicitly with `npm run generate:design-catalog` after review. The CI typecheck workflow now invokes the read-only command; this is catalog-integrity enforcement, not a whole-repository semantic design-policy gate. Catalog text fingerprints and comparisons normalize CRLF/LF without changing literal escape sequences; they are not binary asset hashes. Native props are partially summarized, compatibility examples are not new-work defaults, and evidence links do not attest execution. This pilot does not install Storybook, an MCP server, a registry or a whole-repository import policy.

The [design-policy no-growth guide](../../docs/design-system/DESIGN-POLICY-RATCHET.md) documents a local, explicit-baseline authored-TS candidate comparison. It is **not yet a required CI gate**: the trusted remote main baseline lacks the reviewed scanner. A no-growth result retains unresolved debt and cannot certify imports, CSS cascade, visual contrast, role states, RTL or accessibility.

The [real-source Storybook pilot](../../docs/design-system/STORYBOOK-PILOT.md) adds only eight reviewed pattern stories using the actual CSS/i18n and simulated palette/direction/root scale. It never mounts auth/profile-owned providers, imports live route data, or promotes an unchecked visual baseline. A built local story is **not** an authenticated application route.

## Color and action ownership

- Preserve the brand anchors and active Hawdex Logo. Brand blue `--brand-primary` is not automatically a safe normal-text color; semantic text/action colors can be darker without recoloring brand assets or changing domain-status meaning.
- Pair fills with their matching foreground tokens. Bright dark-theme fills need dark ink, not automatically white labels.
- The shared tactile recipe consumes `--action-primary`, `--action-primary-text`, `--action-primary-hover` and `--action-primary-active`. These tokens are defined in both theme scopes; consumers must not depend on private fallback hex colors.
- `color-scheme` follows the theme for browser-native controls. Source-pair checks alone do not certify composited buttons: hover opacity, ancestor surfaces, text size and actual CSS cascade matter.
- The `.dark` class belongs on the document root in the application. A portal must carry the necessary role scope rather than assume it inherits a role-shell ancestor.
- Existing `[data-role]` accent declarations are not proof of consumed, isolated overrides. That migration remains tracked in the ledger; do not fork token files by role.

## Compatibility and remaining work

Hawdex and pattern exports still coexist. Some patterns retain hardcoded styling, duplicate behavior or incomplete localization. Keep public facades and their consumers stable until dependency evidence supports a consolidation; do not delete an active Logo, curriculum facade or mascot asset as if it were an unused prototype.

`prototype/` is legacy reference material. Do not add runtime imports of its CSS, JavaScript or CDN Tailwind. Retirement requires dependency proof and reviewed application-owned visual baselines; passing unit or shell-fixture tests alone is insufficient. See [PARITY.md](./PARITY.md) for the existing migration reference and [AUTHENTICATION.md](./AUTHENTICATION.md) for auth composition guidance. Those documents remain subject to the ledger's unresolved findings, not blanket fidelity claims.

**Build-source ownership:** Tailwind scans files as text, separately from runtime imports. A development-only example can therefore add production CSS even when no application route imports it. Verify emitted rules and source boundaries; use the documented `@source`/`@source not` controls only with dependency and build proof. Do not broadly exclude existing tests/prototypes or safelist palettes to hide missing production classes. [Official source-detection reference](https://tailwindcss.com/docs/detecting-classes-in-source-files).

The production entry currently excludes only `src/__tests__/fixtures/design-agent-benchmark` from automatic detection. Its source and19 behavior tests remain; explicit test/explorer compilation can still request the valid utilities. The measured47-byte leak was removed and the previous production CSS hash restored exactly. This is a narrow boundary, not authorization to exclude other tests, examples or prototypes without proof.

## Verification

Run lint → TypeScript → unit tests before relevant build/browser checks. Useful focused commands:

```sh
npm test -- src/__tests__/unit/cssEntry.test.ts src/__tests__/unit/actionTokenContrast.test.ts src/__tests__/unit/designSystemDocs.test.ts
node --test scripts/shell-navigation.regression.mjs
npm run i18n:check
npm run check:portable-tokens  # selected opaque colors; export-only, no CSS generation
```

The real shell fixture exercises shared chrome with isolated business data and ancillary widgets; it does not attest authenticated pages, backend policy, physical notches, every font or every application surface. Its contrast checks reject unsupported paint rather than invent an opaque background. The source design-policy scanner still needs semantic triage; passing selected color tests does not make all of its matches resolved.

Review guidance: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Keep all user-facing strings bilingual, use logical CSS, honor reduced motion and preserve keyboard/assistive-technology behavior.

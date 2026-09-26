# Historical prototype comparison — not application visual approval

The `visual/` suite is isolated by `playwright.visual.config.ts`. Its `visual/references/*.png` files are **old prototype snapshots**, not founder-approved, application-owned, bilingual, authenticated or customer-ready baselines. Keep them as migration references; do not replace them automatically or describe a passing cross-implementation diff as pixel-perfect product approval. The [frontend remediation ledger](../docs/audits/frontend-forensic-remediation-ledger.md) remains the acceptance tracker. The approved product direction is in the founder's launch contract maintained outside this frontend-only checkpoint.

## Current measurable scope

- `screen-map.ts` has five active (`rebuilt: true`) **dashboard** comparisons against prototype light/LTR PNGs, each with four viewports (360, 768, 1024, 1440). Their historical `maxDiffRatio: 0.6` permits up to **60% mismatched pixels**; it is not a release, accessibility or fidelity certificate. Other map rows are not asserted. Do not weaken these limits or flip flags just to obtain green.
- `parity.spec.ts` now fails rather than skipping when an active reference is missing. A protected route requires a present, parseable role storageState; neither file presence nor token-shaped JSON proves a live/authorized actor. The exact final URL and light/English/LTR root are checked before a screenshot; font readiness must settle, but that does not prove loaded glyphs. A test cannot certify the role's data, provider-owned persisted preferences, physical display, or image appearance without independent review.
- The RTL spec under `tests/e2e/rtl/` has its separate snapshot path and fail-closed missing-baseline policy. Its mocked source tests are not a reviewed EN/AR rendered route. The full five-role, state, theme, viewport and accessibility matrix remains open.

## Candidate capture (never baseline promotion)

`npm run test:visual:capture` currently serves the *prototype* only. It creates unique **CAPTURED_UNREVIEWED** files under ignored `test-results/visual-candidates/<run-id>/`, not `visual/references/`. The capture code uses exclusive creation; existing PNGs and other worktree assets cannot be overwritten. CDN styling/fallback fonts and the absence of real user data mean a prototype candidate is not a production-scene reference. This command is **not** authority to update Git snapshots.

`npm run test:visual` compares active app routes to retained prototype references. Do **not** launch it against an arbitrary Vite/dev URL or a live user session; it starts an application server and will fail if appropriate role states are unavailable. The default root Playwright config also installs Preview seeding hooks and is not a substitute for this isolated visual config. Candidate review, application-owned approved baselines, safe exact-head authenticated fixture collection, reviewed captures and two themes/two languages must be established before a release visual gate can be called complete. No current model session has approved the rendered images.

## Safe review path still to implement

1. Collect application-owned scenes using a separately governed fake-data or valid Git-linked Preview role fixture; label build hash, role/tenant, theme, locale, viewport, interaction state, font loading and auth/data seams.
2. Have a human/image-capable reviewer inspect paint, contrast, layout, focus and sensitive content. Record reviewer, source identity, approved reference bytes and rollback; the old prototype PNGs remain historical.
3. Validate the exact reviewed app baselines and every reachable route/state in a read-only no-update comparison. Missing, stale, unreviewed, redirected or unauthenticated scenes must fail—not become ignored/skipped.

This is a migration aid and evidence backlog, not a second completion checklist or permission to merge/deploy.

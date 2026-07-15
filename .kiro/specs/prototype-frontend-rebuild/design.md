# Design — Prototype Frontend Rebuild (Path A)

## 0. Decision record

- **Strategy:** Path A — clean-room rebuild of the **presentation layer** in a new
  `design-system/` + `features/` tree, cut over route-by-route, then delete legacy.
- **Stack (unchanged):** React 18 + TypeScript (strict) + Vite (SPA) + Tailwind v4
  (`@theme`) + Shadcn/ui + Lucide + TanStack Query. No framework/language change —
  the ~200 hooks, auth, i18n, realtime, and RLS bindings are React/TS and are kept.
- **Design source of truth:** the prototype (`prototype/*.html`, `shared.css`). Its
  files never ship; its *values* are extracted into `src/design-system/tokens.css`.
- **Canonical brand gradient:** `linear-gradient(93.65deg,#14b8a6 5.37%,#0382bd 78.89%)`
  (prototype exact; supersedes the legacy `135deg`).
- **Design system shape:** ONE shared foundation (tokens) + ONE shared primitive
  library; **per-role modularization only at the composition layer** (`features/{role}`),
  with optional `[data-role]` accent scopes. Not forked per role.

## 1. Why the stack stays (and the prototype can't be "connected")

The prototype is static HTML with CDN Tailwind, `shared.css`, hardcoded data, and
`toast()`/`confirm()` stubs. It cannot bind to Supabase. "Frontend replacement"
therefore means: **build a new React UI that reproduces the prototype pixel-for-pixel
and consumes the existing hooks.** Because we keep hooks/services, the language is
fixed to React/TS; any other choice would force rewriting the data layer, violating
the "keep services and hooks" constraint.

## 2. Layered design-system architecture

| Layer | Contents | Location | Shared / per-role |
| --- | --- | --- | --- |
| L1 Foundations | tokens: color, gradient (93.65deg), type ramp, radius, shadow, motion, dark, domain (Bloom/outcome/attainment/gamification), `[data-role]` accents | `design-system/tokens.css` | **Shared** (+ scoped accents) |
| L2 Primitives | Button (+tactile), Card (+elevated), Badge, Input, Select, Table, Dialog, Sheet, Tabs, Tooltip, Toast | `design-system/primitives/` | **Shared** |
| L2 Patterns | MasteryRing, SectionHeader, KPICard, SeverityIcon, StatCard, ProgressRing, chat bubbles, confetti/XP-float, EmptyState, ErrorState, Shimmer | `design-system/patterns/` | **Shared** |
| L2 Mascot | character system | `design-system/mascot/` (assets from `prototype/characters` + `brand`) | **Shared** |
| L3 Composition | role dashboards, widgets, page layouts, flows | `src/features/{role}/` | **Per-role (modular)** |
| App shell | router, providers, role layouts, chrome (Header/Sidebar/MobileTabBar) | `src/app/` | Shared shell, role-configured |

**Data/logic layers are untouched:** `src/hooks`, `src/lib`, `src/providers`,
`src/types` stay exactly as-is and are imported by `features/`.

### Rationale (answering "separate DS per profile?")
Forking tokens/primitives per role → drift + 5× maintenance + broken dark mode.
Layering gives the intended flexibility instead:
- **Global change** (brand color/radius) = 1 edit in `tokens.css` → all roles.
- **Role change** (student dashboard) = isolated in `features/student/`.
- **Role identity** (accent) = a few vars in `[data-role="student"]`.

## 3. Token strategy (L1)

`design-system/tokens.css` (this slice) holds the extracted prototype values as
Tailwind v4 `@theme` + `:root` vars + `.dark` overrides + `[data-role]` scopes.
Key points:
- Gradient angle **93.65deg** adopted (approved).
- **Dark mode** values are NET-NEW (prototype is light-only) → require a dark
  design review before cutover.
- **RTL** is not a token concern; components use logical props (`ms/me/ps/pe/start/end`).
- At **P0 wiring**, `tokens.css` becomes canonical and the legacy brand block in
  `src/index.css` is retired (index.css keeps the Shadcn oklch base + `@custom-variant`).

## 4. Pixel-perfect methodology (how "exactly like the prototype" is enforced)

1. **Extract tokens 1:1** (done in `tokens.css`).
2. **Primitive parity map** — each prototype class → one React component, matched
   padding/radius/shadow/color/animation. Maintain a mapping table in
   `design-system/PARITY.md` (authored in P0).
3. **Icons** — map every prototype emoji to a Lucide icon (emoji are OS-variant,
   not pixel-stable).
4. **Assets** — port `prototype/characters/` + `prototype/brand/` verbatim.
5. **Visual-regression gate** — Playwright screenshot diff (existing
   `playwright.config.ts` + `e2e/`): capture the prototype screen (served static)
   and the rebuilt React screen at 360/768/1024/1440; fail above a small pixel
   threshold. Storybook for component review; optional Chromatic/Loki in CI.
6. **Fidelity caveat** — the prototype defines **light + LTR only**. Dark mode and
   Arabic/RTL are net-new design deliverables, gated separately (can't be "diffed"
   against a prototype that lacks them).

## 5. Routing & navigation

- Keep `AppRouter.tsx` route **paths** and guards verbatim; the rebuild swaps the
  element rendered at each route (new `features/` component), not the path.
- Nav is data-driven (`src/lib/navItems.ts`) — reuse the data; restyle the Sidebar/
  Header/MobileTabBar. Student grouped nav (learn/tools/growth/community) preserved.
- `/student/focus/:sessionId` stays outside the student shell (full-screen).
- Preserve `StudentLayout` onboarding gate, `EmailVerificationBanner`, `GuidedTour`,
  `SkipToMain` → `#main-content`, `usePageViewLogger`.

## 6. Coverage: build everything, including what the prototype lacks

The prototype mocks ~40 read/list happy-path screens (0 real CRUD — its admin
"invite" is a `toast()`). The app has **164 routes**. Every route is enumerated and
classified **P / P\* / D** in `missing-screens-catalog.md`, with the required
net-new sub-UI per screen (forms, modals, detail, wizard steps, empty/loading/
error/success). D-class screens are composed from L2 primitives + page archetypes
(Dashboard, List, Table, Form, Detail, Wizard, Focus, Analytics, Settings, State).

## 7. Phased roadmap

- **P0 — Foundation:** wire `tokens.css`; build L2 primitives + patterns + mascot;
  author `PARITY.md`; stand up Storybook + Playwright visual-regression harness.
- **P1 — App shell & nav:** router integration, role layouts, Header/Sidebar/
  MobileTabBar; auth screens (preserve background + lockout + side-effects).
- **P2 — Dashboards:** all 5 role dashboards, bound to existing aggregate hooks.
- **P3 — All modules (incl. missing):** every remaining route from the catalog —
  P/P\* matched to the mock, D composed from archetypes; build all CRUD/modals/
  detail/wizard/state screens; add Admin Security + Transcript.
- **P4 — Cutover:** flip routes to the new tree behind flags; run full parity +
  regression + i18n + dark + a11y + perf + responsive gates per screen.
- **P5 — Legacy deletion (clean codebase):** see §8.

## 8. Legacy-UI deletion protocol (the "clean codebase" end state)

**Principle: delete last, per unit, only after proof of no impact.** Never big-bang.

Per-screen gate before deleting its legacy counterpart:
1. New screen **built** and routed.
2. **Visual + functional parity** passed (screenshot diff + regression row green).
3. Shipped as **default** (flag on).
4. **Soaked** on preview/production with no regressions for the agreed window.
5. **Zero remaining imports** of the legacy file — proven by `npx tsc --noEmit`
   (build stays green) **and** `knip` (no references/dead exports).

Then delete that legacy file in its **own revertible PR** (no backend/hook edits).

**Final cleanup PRs (after ALL screens cut over & soaked):**
- Remove legacy `src/pages/**` and superseded `src/components/**` not reused by
  `design-system/`/`features/`.
- Remove the feature flags + old/new split wrappers so each screen is a single
  component.
- **RETAIN the `prototype/` folder** (owner decision) — keep it as the living
  design reference for future adjustments. It is never imported by `src/` (G.2)
  and has zero runtime/bundle impact, so it stays without compromising the clean
  codebase.
- Run `tsc --noEmit`, `knip`, full test suite, and the visual-regression suite
  green before merge.

**Why the app is never affected:** backend/hooks/services are untouched throughout;
deletions only remove code with **zero remaining references** (proven mechanically);
each removal is isolated and revertible. Order guarantees the app always has a
working screen for every route — the legacy one until the new one is proven, then
only the new one.

**Timing:** deletion begins **only after P4** (a route is cut over + soaked), and
completes as a dedicated **P5** once every route is on the new UI. Rough sequencing:
P0–P2 build in parallel with zero deletions; P3 builds remaining screens; P4 cuts
over and soaks; P5 deletes legacy + flags (the `prototype/` folder is **retained** per owner decision).

## 9. Risks & mitigations

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | Rebuild balloons (164 screens + all net-new CRUD/modals/detail/state) | Archetype-driven composition; build shared patterns once; catalog is the burn-down list. |
| R2 | Dark mode + RTL absent from prototype → under-scoped | Treat as explicit net-new deliverables with their own gates; don't hide them under "pixel-perfect." |
| R3 | Deleting legacy breaks a route | Mechanical proof (tsc + knip) + soak + per-unit revertible PRs; delete only post-cutover. |
| R4 | Auth side-effects/onboarding gate regress | Reuse `useAuth`/layout gate; never bypass to `supabase.auth`; test not-onboarded student. |
| R5 | Two token sources (index.css vs tokens.css) diverge pre-cutover | tokens.css not imported until P0 wiring; then it's canonical and legacy brand block retired. |
| R6 | Discarding the ~56% in-place reskin already done | Reuse its P0 primitives (MasteryRing/SectionHeader/etc.) and analysis; don't re-derive. |
| R7 | Prototype demo aids leak in (device toggle, CDN Tailwind, shared.css, emoji) | Lint/PR rule blocks `prototype/` imports + CDN; emoji→Lucide; real breakpoints only. |
| R8 | Non-existent roles (super-admin/advisor) requested | Out of scope; separate backend+RLS+types spec. |

## 10. Definition of done

Per screen: visual-regression within threshold · functional parity · en+ar ·
light+dark · a11y (axe/keyboard) · perf ≥ baseline (lazy routes, no CDN Tailwind) ·
regression green · legacy counterpart deleted (tsc+knip clean). Project: flags
removed, single implementation per route; the `prototype/` folder is **retained**
as the design reference (never imported by `src/`).

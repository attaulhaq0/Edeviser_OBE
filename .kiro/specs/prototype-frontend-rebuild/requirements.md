# Requirements — Prototype Frontend Rebuild (Path A)

## Introduction

Edeviser will replace its **entire front-end presentation layer** with a clean-room
rebuild in the **prototype's design language**. The prototype (`prototype/*.html`,
`shared.css`, `shared.js`) is the **visual/UX source of truth**; it is a static
mockup and its files never ship. The rebuild is implemented in the existing stack
(React 18 + TypeScript + Vite + Tailwind v4 + Shadcn/ui + Lucide + TanStack Query)
and binds to the **existing, unchanged** backend, hooks, and services.

This is a **Frontend Replacement** (Path A): build the new UI in parallel under a
new design system + `features/` tree, cut over route-by-route, then **delete the
legacy UI** to leave a clean codebase — all without affecting the running app.

This spec supersedes the in-place reskin approach of `ui-prototype-migration` for
any screen it covers; that spec's analysis (coverage matrix, archetypes, risks)
remains valid reference input.

### Scope

- **In scope:** every front-end screen for the **5 existing roles** (admin,
  coordinator, teacher, student, parent) + public/auth; the design system (tokens,
  primitives, patterns, mascot); routing/layout/navigation; and the **net-new
  screens the prototype never drew** (most CRUD forms, modals, detail pages,
  wizards, and empty/loading/error/success states — see `missing-screens-catalog.md`).
- **Out of scope:** backend, database, RLS, edge functions, RPCs, storage, auth
  logic, business rules, and any new roles ("super admin" / "academic advisor" do
  not exist in `UserRole` and are a separate backend effort).

## Requirement 1 — Backend, hooks, and services are never modified

1.1 The rebuild SHALL NOT modify `supabase/**`, `src/hooks/**` (existing behavior),
`src/lib/queryKeys.ts`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`,
`src/lib/auditLogger.ts`, `src/providers/AuthProvider.tsx`, `RouteGuard.tsx`, or
`src/types/database.ts`.
1.2 Every screen SHALL consume an existing TanStack Query hook and SHALL NOT call
`supabase.*` directly from a component.
1.3 Mutations SHALL reuse existing mutation hooks (audit + invalidation already
handled).
1.4 New aggregate/presentation hooks MAY be added following existing patterns; they
compose existing hooks/RPCs and add no new writes.

## Requirement 2 — Pixel-perfect fidelity to the prototype

2.1 All design values SHALL derive from `design-system/tokens.css`, extracted 1:1
from the prototype; components SHALL use tokens only (no arbitrary hex).
2.2 The brand gradient SHALL be the prototype's exact `linear-gradient(93.65deg,
#14b8a6 5.37%, #0382bd 78.89%)` as the canonical value.
2.3 Each prototype primitive (`.pcard`, `.btn3d`, `.sec-h`, `.pill`, `.tab-btn`,
`.stat-chip`, chat bubbles, mastery ring, XP/confetti animations) SHALL be
re-implemented as a tokenized React/Shadcn component matching it visually.
2.4 Emoji icons in the prototype are placeholders and SHALL be mapped to **Lucide**
(or a fixed icon set) for cross-platform stability.
2.5 Prototype assets under `prototype/characters/` and `prototype/brand/` SHALL be
brought over as real assets.
2.6 A **visual-regression gate** (Playwright screenshot diff at 360/768/1024/1440)
SHALL enforce parity against the prototype screen before a screen ships.
2.7 The prototype's device-frame + `📱/💻` toggle are demo aids and SHALL NOT ship;
responsiveness SHALL use real breakpoints.

## Requirement 3 — Complete coverage (build what the prototype lacks)

3.1 EVERY production route (see `missing-screens-catalog.md`) SHALL be rebuilt in
the new design system — including the ~93 design-system-derived screens with no
prototype reference.
3.2 For every entity, the required **Create / Edit / Delete** surfaces, **detail**
pages, **confirmation modals**, **wizard steps**, and **empty/loading/error/success**
states SHALL be designed in the prototype language (the prototype provides read/list
happy-paths only; these are net-new).
3.3 Two backend-without-UI capabilities SHALL get new screens: an **Admin Security
console** (`blocked_ips`/`rate_limit_events`/`check-login-rate`) and a **Transcript
viewer** (`generate-transcript` + `transcripts` bucket).
3.4 Net-new screens SHALL NOT invent behavior beyond existing backend capability;
anything past current backend is labeled roadmap/disabled.

## Requirement 4 — Route, RBAC, auth, i18n/RTL, dark-mode, a11y preserved

4.1 Every route in `AppRouter.tsx` (incl. `/student/focus/:sessionId` outside the
student shell, index redirects, `*`) SHALL still resolve; deep links/bookmarks
unchanged. Route paths and guard `allowedRoles` SHALL NOT change.
4.2 Auth SHALL preserve the existing background (dark gradient + doodle overlay +
logo + frosted card), lockout, login side-effects, and self-signup=student.
4.3 All copy SHALL come from i18next (`en` + `ar`), logical CSS props only; RTL is
**net-new** verification (prototype is LTR-only).
4.4 Dark mode SHALL be delivered via the `.dark` class; dark palettes are **net-new**
(prototype is light-only) and require design review.
4.5 A11y SHALL meet WCAG AA (SkipToMain, keyboard order, focus rings, ≥44px targets,
reduced-motion, status = color + icon/text).

## Requirement 5 — Single, shared, role-modular design system

5.1 Tokens (L1) and primitives (L2) SHALL be a single shared source; the system
SHALL NOT be forked per role.
5.2 Role-specific work SHALL live in `src/features/{role}/` (L3 composition).
5.3 Per-role visual identity (if any) SHALL be expressed as scoped accent tokens
(`[data-role="…"]`), never a duplicated system.

## Requirement 6 — Parallel build, safe cutover, then legacy deletion

6.1 The new UI SHALL be built in parallel (`design-system/` + `features/` + new
routes) without altering legacy screens until each replacement passes its gate.
6.2 Cutover SHALL be route-by-route (or grouped) behind a flag; reversible.
6.3 A legacy screen/component SHALL be **deleted only after** its replacement is (a)
built, (b) visual + functional parity passed, (c) shipped as default, (d) soaked
with no regressions, and (e) confirmed to have **zero remaining imports** (via
`tsc --noEmit` + `knip`).
6.4 Final cleanup SHALL remove legacy `src/pages/**`/components and feature flags,
leaving a clean single-implementation codebase. The `prototype/` folder SHALL be
**RETAINED** (owner decision) as the living design reference for future
adjustments; it is never imported by `src/` (G.2) and has zero runtime/bundle
impact, so keeping it does not compromise the clean codebase.
6.5 Every deletion SHALL be its own revertible PR and SHALL NOT change backend/hooks.

## Requirement 7 — Verification gates (Definition of Done per screen)

Visual-regression diff within threshold ✓ · functional parity (data/actions/
mutations/permissions/empty-loading-error) ✓ · en + ar ✓ · light + dark ✓ · a11y
(axe/keyboard) ✓ · performance ≥ baseline, routes lazy, no CDN Tailwind ✓ ·
regression row green ✓ · legacy counterpart removable ✓.

## Non-goals

- No new backend/tables/RLS/roles.
- No porting of prototype CSS/JS/CDN Tailwind into `src/`.
- No architecture change to routing/state/data (keep hooks/services/providers).

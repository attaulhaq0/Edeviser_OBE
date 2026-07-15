---
inclusion: always
description: "STRICT: the prototype is the ONLY source of truth for visual/UX design. Never take design from the deployed/legacy UI."
---

# Prototype Fidelity — the ONLY design source of truth (STRICT, non-negotiable)

Every screen, component, and pixel MUST match the **prototype**. The owner's rule:
**"Everything matches the exact prototype. I do not want any design thing from the
deployed UI."** This rule governs all visual/UX decisions and overrides any
conflicting guidance elsewhere.

## Single source of truth

- The prototype — `prototype/*.html`, `prototype/shared.css`, `prototype/shared.js`
  — is the **sole authority** for every visual/UX decision: color, gradient,
  spacing, radius, shadow, typography, layout, motion, iconography, and each
  component's look + behavior.
- These prototype files **never ship** (guardrail G.2) — only their **values and
  structure** are reproduced, via `src/design-system/tokens.css` (extracted 1:1)
  and the `@/design-system` components, per the `src/design-system/PARITY.md`
  contract.

## Never pull design from the deployed / legacy UI

Do **NOT** copy, infer, or "keep" any design decision from what's currently
deployed. Specifically forbidden as design sources:

- **Shadcn "New York" neutral defaults** in `src/components/ui/*` — their oklch
  grayscale `--primary` (near-black) is NOT the brand. Use Shadcn only as a
  headless/structural primitive, restyled to the prototype via tokens.
- **Legacy styling in `src/components/shared/*`** that predates the rebuild.
- **The legacy CTA utility `from-teal-500 to-blue-600`** (deployed). The canonical
  prototype primary fill is `var(--brand-gradient)` =
  `linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)`. Use the token, never
  the legacy utility, in all new/rebuilt work.
- Any layout or pattern lifted from a legacy `src/pages/**` screen — rebuild it
  from that screen's prototype reference instead.

## When the prototype doesn't define it → STOP and ask

If a needed value, state, or pattern is not in the prototype (e.g. a CRUD form,
delete confirm, or error state the static mock never drew), do **not** invent it
from the deployed UI or generic Shadcn defaults. Compose it from existing
`@/design-system` primitives + `tokens.css` values following the nearest prototype
archetype, and if that is ambiguous, **ask the owner** before shipping a look.

## How to implement (every time)

1. Build from `@/design-system` (primitives + patterns + mascot) — never from
   `@/components/shared/*` or raw `@/components/ui/*` in screens.
2. Use only `src/design-system/tokens.css` values (extracted from
   `prototype/shared.css`). No arbitrary hex, spacing, radius, or shadow.
3. Follow `src/design-system/PARITY.md`: §A class→component map, §B emoji→Lucide,
   §C per-screen tolerances. It is the fidelity contract.
4. Icons: prototype emoji → Lucide per §B (except content/gamification art §B.7).
   Never ship raw emoji as chrome.

## Proof of match (not vibes)

- A screen "matches the prototype" only when its Playwright visual-parity check
  passes: set `appPath` + flip `rebuilt: true` in `visual/screen-map.ts`, then
  `npm run test:visual` green at all four viewports (360/768/1024/1440) within its
  §C tolerance. Capture references + run parity on the same machine.
- **Scope:** the prototype is **light mode + LTR only**. Dark mode and Arabic/RTL
  are NET-NEW (PARITY §E) — designed for parity, reviewed separately, and cannot be
  diffed against the prototype.

## Adopted-from-legacy components are provisional — validate, don't trust

A few `@/design-system` patterns are currently **re-exported** from
`@/components/shared/*` (e.g. `MasteryRing`, `WelcomeHero`, `SeverityIcon`,
`GradientCardHeader`). Under this rule they are provisional: each MUST be validated
against its PARITY §A prototype class and **reskinned or internalized** if it
diverges. "It's what the deployed app already had" is never a justification.

## Hard "never"s

- Never use the Shadcn neutral primary as the brand color.
- Never introduce pink/purple/violet/rose/fuchsia or glassmorphism, or any
  treatment absent from the prototype.
- Never copy a legacy screen's layout; rebuild from the prototype reference.
- Never ship a screen as "done/prototype-matched" without its green visual-parity
  check.

## Precedence

This rule is authoritative for visual/UX decisions and **overrides**
`design-system.md` and `component-patterns.md` wherever they conflict. In
particular, where any doc or existing code cites `from-teal-500 to-blue-600`, the
canonical `var(--brand-gradient)` (93.65deg) wins for all new/rebuilt work. (The
~180 legacy usages are retired by the P0.2 token-canonicalization / P5 cleanup, not
by treating them as a design source.)

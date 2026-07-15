# Edeviser Design System (Path A rebuild)

The **single, shared** design system for the rebuilt UI. Extracted 1:1 from the
approved prototype (`prototype/*.html`, `shared.css`) and re-implemented as real
Tailwind v4 tokens + React/Shadcn primitives. The prototype HTML is the **visual
spec** only — it never ships.

> Full plan: `.kiro/specs/prototype-frontend-rebuild/` (requirements, design,
> tasks, missing-screens-catalog).

## Architecture — layered, not per-role-forked

The system is **shared**; only the *composition* layer is per-role. This gives
both easy global changes (edit tokens once) and easy role-specific changes (edit
one role folder) without drift.

| Layer | Location | Shared or per-role? |
| ----- | -------- | ------------------- |
| **L1 Foundations** — tokens (color, gradient, type, radius, shadow, motion, dark, role-accents) | `design-system/tokens.css` | **ONE shared source** (+ optional `[data-role]` accent scopes) |
| **L2 Primitives** — Button, Card, Badge, Input, Table, Dialog, Tabs, etc. | `design-system/primitives/` | **ONE shared library** (role-agnostic) |
| **L2 Patterns** — MasteryRing, SectionHeader, KPICard, SeverityIcon, StatCard, chat bubbles, mascot | `design-system/patterns/`, `design-system/mascot/` | **Shared** |
| **L3 Composition** — role dashboards, widgets, page layouts, flows | `src/features/{role}/…` | **Per-role (modular)** |

### Why not a separate design system per role?

Forking tokens/primitives per role causes drift (the teal stops matching), 5×
maintenance, and broken dark mode. A **global change** (brand color, radius)
should be one edit in `tokens.css`; a **role change** should be isolated to
`features/{role}/`; a **role identity tweak** is a few scoped vars in the
`[data-role="…"]` block. That is the maintainable version of "separate files per
profile."

## Folder layout (target)

```
src/
  design-system/
    tokens.css            # L1 — canonical tokens (this slice) — 93.65deg gradient
    themes/               # optional split of dark / role-accent scopes as it grows
    primitives/           # L2 — Button, Card, Badge, Input, Table, Dialog, Tabs…
    patterns/             # L2 — MasteryRing, SectionHeader, KPICard, SeverityIcon…
    mascot/               # character system (assets from prototype/characters + brand)
    index.ts              # barrel export
  features/               # L3 — role-modular composition ("a folder per profile")
    student/  teacher/  coordinator/  parent/  admin/
  app/                    # router, providers, role layouts
  hooks/  lib/  providers/  types/   # KEPT AS-IS (backend/data layer, untouched)
```

## Hard rules

1. **Never** import `prototype/shared.css`, `prototype/shared.js`, or CDN Tailwind
   into `src/`. Re-declare values as tokens here.
2. Components consume **existing hooks** (`src/hooks/*`) — never `supabase.*`
   directly.
3. No arbitrary hex in components — reference tokens only.
4. Every primitive verified in **light + dark** and **LTR + RTL** (logical CSS
   props) before use. Dark + RTL are **net-new** (the prototype defines neither).
5. Emoji icons in the prototype are placeholders → use **Lucide** equivalents.

## Status

`tokens.css` is **additive and not yet imported** — zero runtime impact until the
P0 wiring task in the spec. Nothing here affects the current app.

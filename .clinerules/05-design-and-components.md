# Design System & Components (adapted from Kiro steering/design-system.md, component-patterns.md, prototype-fidelity.md)

## Design System
- Follow the Shadcn/ui (New York) design language with Tailwind CSS v4.
- Use the established design tokens and spacing conventions; do not invent new ad-hoc styles.
- Maintain visual consistency with the existing prototype and production UI.

## Component Patterns
- Use Shadcn/ui components for all interactive elements — never raw HTML.
- Custom shared components live in `src/components/shared/`.
- Icon wrappers/badges in section/card headers MUST use transparent (`bg-transparent`) or white liquid glass (`bg-white/80 border border-slate-200/60 backdrop-blur-xs`) backgrounds — never solid colored fills.
- Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) not physical (`ml-*`, `mr-*`).

## Prototype Fidelity
- The `prototype/` directory contains HTML fidelity references for UI screens.
- When building or refining UI, match the prototype's layout, spacing, and component usage unless a design decision explicitly overrides it.
- Keep production UI consistent with the approved prototype look-and-feel.
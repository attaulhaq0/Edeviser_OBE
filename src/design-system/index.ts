// =============================================================================
// Design system — single import surface (prototype design language).
//
// Screens should build from HERE, not from the legacy `@/components/shared/*`
// app components. This makes the eventual transformation to the prototype UI a
// mechanical swap of imports rather than a rewrite.
//
//   import { PageHeader, SectionCard, KPICard, EMeter, Button, Card } from "@/design-system";
//
// Layers:
//   - primitives/ — Shadcn ui/* adopted as the L2 primitive layer.
//   - patterns/   — prototype-faithful compositions (SectionHeader, KPICard,
//                   PCard, SectionCard, HeroCard, StatusDot, StatePanel, EMeter).
//   - mascot/     — living character system (Foxi/Owlie/Pengu).
//   - tokens.css  — L1 foundations (imported at cutover; the live index.css
//                   already carries the canonical 93.65deg --brand-gradient).
// =============================================================================

export * from "./primitives";
export * from "./patterns";

// Mascot: pure catalog/resolvers + the two components.
export * from "./mascot";
export { default as MascotCharacter } from "./mascot/MascotCharacter";
export type { MascotCharacterProps } from "./mascot/MascotCharacter";
export { default as MascotCompanion } from "./mascot/MascotCompanion";
export type { MascotCompanionProps } from "./mascot/MascotCompanion";

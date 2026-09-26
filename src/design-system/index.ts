// =============================================================================
// Design system — shared public export surface during Precision/Obsidian migration.
//
//   import { PageHeader, SectionCard, KPICard, EMeter, Button, Card } from "@/design-system";
//
// Layers:
//   - primitives/ — existing generated Shadcn ui/* components, re-exported.
//   - patterns/   — shared compositions; remaining migration gaps are in README.md
//                   and the forensic remediation ledger, not blanket parity claims.
//   - mascot/     — production-owned character system (Foxi/Owlie/Pengu).
//   - tokens.css  — active foundations imported by src/index.css in the same
//                   Tailwind compilation graph. main.tsx loads index.css once.
// Application chrome in components/shared still owns real shared behavior.
// Keep active Hawdex facades and Logo exports stable while consolidating APIs.
// =============================================================================

// Compatibility exports — preserve active Hawdex consumers during consolidation.
export { AccentDot, IconBox, Logo } from "./hawdex/primitives";
export { HBadge, HAvatar, HButton, HCard, ProgressRing } from "./hawdex/components";
export { HexBadge, TIER_COLORS, CLAY } from "./hawdex/gamification";
export type { BadgeTier } from "./hawdex/gamification";

export * from "./primitives";
export * from "./patterns";

// Mascot: pure catalog/resolvers + the two components.
export * from "./mascot";
export { default as MascotCharacter } from "./mascot/MascotCharacter";
export type { MascotCharacterProps } from "./mascot/MascotCharacter";
export { default as MascotCompanion } from "./mascot/MascotCompanion";
export type { MascotCompanionProps } from "./mascot/MascotCompanion";

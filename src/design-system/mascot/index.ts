/**
 * L2 mascot / character system (shared).
 *
 * Living mascots — Foxi (companion) · Owlie (AI tutor) · Pengu (habit buddy) —
 * ported from the prototype `EdvCharacter` system, with assets copied under
 * ./assets (src/ never imports from prototype/, guardrail G.2). Every appearance
 * maps to a real product / gamification state; see ../PARITY.md §B.7.
 *
 * This barrel re-exports ONLY the pure catalog + resolvers (types, asset maps,
 * `pickMascot`, `mascotForMoment`, `CHARACTER_SKINS`). The components are
 * imported directly to avoid `react-refresh/only-export-components` warnings:
 *   import MascotCharacter from "@/design-system/mascot/MascotCharacter";
 *   import MascotCompanion from "@/design-system/mascot/MascotCompanion";
 *
 * Complements the existing `@/components/shared/Mascot` (i18n coaching-text
 * bubble): pair `mascotForMoment(moment)` here with that copy for a full
 * character + speech coaching unit.
 */
export * from "./characters";

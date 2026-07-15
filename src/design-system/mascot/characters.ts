// =============================================================================
// Mascot character system — catalog + pure resolvers (L2)
// =============================================================================
//
// Living mascots: Foxi (companion) · Owlie (AI tutor) · Pengu (habit buddy).
// Ported 1:1 from the prototype's `EdvCharacter` system (prototype/shared.js)
// and its assets (prototype/characters/*), which are copied into
// ./assets/characters/* so `src/` never imports from `prototype/` (guardrail G.2).
//
// Every appearance maps to a real product / gamification state (greeting, XP,
// level-up, streak, weak CLO, tutor, reflection). Emotion → filename is the
// authoritative map from the prototype; missing emotions fall back to `default`.
//
// This module is PURE (no JSX/DOM) so it is fully unit- + property-testable and
// safe to re-export from the mascot barrel.
// =============================================================================

import type { MascotMomentId } from "@/lib/mascotGuidance";

/** The three living mascots. */
export type CharacterId = "foxi" | "penguin" | "owl";

/** Product role each character embodies (drives default selection). */
export type CharacterRole = "companion" | "tutor" | "habit-buddy";

/** Expressive emotions (superset across characters; each maps to a PNG pose). */
export type CharacterEmotion =
  | "default"
  | "happy"
  | "excited"
  | "celebrating"
  | "proud"
  | "playful"
  | "smart"
  | "studious"
  | "focused"
  | "curious"
  | "encouraging"
  | "magical"
  | "wise"
  | "worried"
  | "concerned"
  | "nervous"
  | "annoyed"
  | "level-up"
  | "victory"
  | "thinking"
  | "walking"
  | "beacon"
  | "signal";

/** Render sizes (px) — ported from the prototype `.chr-*` scale. */
export type CharacterSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Motion presets — ported from the prototype character keyframes. */
export type CharacterAnimation = "none" | "float" | "in" | "wave" | "pop" | "nudge";

export const CHARACTER_IDS: readonly CharacterId[] = ["foxi", "penguin", "owl"];

export const CHARACTER_NAMES: Record<CharacterId, string> = {
  foxi: "Foxi",
  penguin: "Pengu",
  owl: "Owlie",
};

export const CHARACTER_ROLES: Record<CharacterId, CharacterRole> = {
  foxi: "companion",
  owl: "tutor",
  penguin: "habit-buddy",
};

/** Exact prototype `.chr-*` pixel sizes. */
export const SIZE_PX: Record<CharacterSize, number> = {
  xs: 46,
  sm: 64,
  md: 104,
  lg: 150,
  xl: 200,
};

/**
 * Authoritative emotion → filename map (from prototype `EdvCharacter.ASSETS`),
 * extended so every shipped pose is addressable. Missing emotions fall back to
 * `default`.
 */
export const CHARACTER_ASSETS: Record<
  CharacterId,
  Partial<Record<CharacterEmotion, string>>
> = {
  foxi: {
    default: "foxi-default.png",
    happy: "foxi-smiling.png",
    excited: "foxi-excited.png",
    celebrating: "foxi-celebrating.png",
    proud: "foxi-proud.png",
    playful: "foxi-playful.png",
    smart: "foxi-smart.png",
    studious: "foxi-studious.png",
    focused: "foxi-studious-2.png",
    curious: "foxi-curious.png",
    encouraging: "foxi-signal-beacon-3.png",
    magical: "foxi-magical.png",
    wise: "foxi-learning-portal.png",
    worried: "foxi-worried.png",
    concerned: "foxi-nervous.png",
    nervous: "foxi-nervous.png",
    annoyed: "foxi-annoyed.png",
    "level-up": "foxi-level-up.png",
    victory: "foxi-glowing-coin.png",
    thinking: "foxi-studious.png",
    walking: "foxi-bridge-walk.png",
    beacon: "foxi-signal-beacon.png",
    signal: "foxi-signal-beacon-2.png",
  },
  penguin: {
    default: "penguin-blushing.png",
    happy: "penguin-blushing.png",
    excited: "penguin-blushing.png",
    celebrating: "penguin-blushing.png",
    proud: "penguin-blushing.png",
    concerned: "penguin-blushing.png",
  },
  owl: {
    default: "owl-wise.png",
    wise: "owl-wise.png",
    smart: "owl-wise.png",
    thinking: "owl-wise.png",
    concerned: "owl-concerned.png",
    worried: "owl-concerned-2.png",
  },
};

/**
 * Bundler-managed URL map for every copied PNG, keyed `"<character>/<file>"`.
 * `import.meta.glob` gives Vite-hashed URLs at build time and resolvable paths
 * in tests — so the catalog is validated against the real files (no drift).
 */
const globbed = import.meta.glob("./assets/characters/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const CHARACTER_ASSET_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(globbed).map(([path, url]) => {
    const parts = path.split("/");
    return [`${parts[parts.length - 2]}/${parts[parts.length - 1]}`, url];
  })
);

/** Brand logo (ported from prototype/brand). */
export const BRAND_LOGO_URL = (
  import.meta.glob("./assets/brand/edeviser-logo.png", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>
)["./assets/brand/edeviser-logo.png"];

/** Display name for a character (e.g. "Owlie"). */
export function characterName(character: CharacterId): string {
  return CHARACTER_NAMES[character] ?? character;
}

/**
 * Resolve the pose filename for a character + emotion, with the prototype's
 * fallback chain: exact emotion → `default` → first available. Never empty.
 */
export function resolveCharacterFile(
  character: CharacterId,
  emotion: string
): string {
  const set = CHARACTER_ASSETS[character] ?? CHARACTER_ASSETS.foxi;
  // Own-property only: guards against emotion strings that collide with
  // Object.prototype members (e.g. "valueOf", "toString"), which bracket access
  // would otherwise resolve to an inherited function instead of a filename.
  const own = Object.prototype.hasOwnProperty.call(set, emotion)
    ? (set as Record<string, string | undefined>)[emotion]
    : undefined;
  return own ?? set.default ?? (Object.values(set)[0] as string);
}

/** Resolve the bundled asset URL for a character + emotion. */
export function characterAssetUrl(
  character: CharacterId,
  emotion: string
): string {
  const file = resolveCharacterFile(character, emotion);
  return CHARACTER_ASSET_URLS[`${character}/${file}`] ?? "";
}

// ─── Gamification / product-state resolver ───────────────────────────────────

/** High-level product contexts the mascot reacts to. */
export type MascotContext =
  | "greeting"
  | "celebration"
  | "reward"
  | "tutor"
  | "needsAttention"
  | "habit"
  | "reflection"
  | "focus"
  | "empty";

/** Signals that pick the most fitting character + emotion. */
export interface MascotState {
  context?: MascotContext;
  /** Current login streak (days). */
  streakDays?: number;
  /** A CLO is below target — the mascot shows concern. */
  hasWeakClo?: boolean;
  /** The learner just leveled up. */
  leveledUp?: boolean;
  /** The learner just earned XP / a reward. */
  earnedXp?: boolean;
}

export interface MascotPick {
  character: CharacterId;
  emotion: CharacterEmotion;
}

/**
 * Pick the mascot character + emotion for a gamification / product state.
 * Ordered by signal strength (a level-up outranks a generic greeting).
 */
export function pickMascot(state: MascotState): MascotPick {
  if (state.leveledUp) return { character: "foxi", emotion: "level-up" };
  if (state.context === "celebration")
    return { character: "foxi", emotion: "celebrating" };
  if (state.earnedXp || state.context === "reward")
    return { character: "foxi", emotion: "victory" };
  if (state.context === "tutor") return { character: "owl", emotion: "wise" };
  if (state.context === "needsAttention" || state.hasWeakClo)
    return { character: "owl", emotion: "concerned" };
  if (state.context === "habit") return { character: "penguin", emotion: "happy" };
  if (state.context === "reflection")
    return { character: "penguin", emotion: "proud" };
  if (state.context === "focus") return { character: "foxi", emotion: "focused" };
  if (state.context === "empty") return { character: "foxi", emotion: "curious" };
  if (typeof state.streakDays === "number" && state.streakDays >= 7)
    return { character: "foxi", emotion: "proud" };
  return { character: "foxi", emotion: "happy" };
}

/**
 * Character + emotion for a coaching moment, integrating the existing
 * `mascotGuidance` moment vocabulary (so the character imagery and the i18n
 * speech copy stay aligned rather than forking).
 */
export function mascotForMoment(moment: MascotMomentId): MascotPick {
  switch (moment) {
    case "welcome":
      return { character: "foxi", emotion: "happy" };
    case "assessmentIntro":
      return { character: "owl", emotion: "wise" };
    case "emptyState":
      return { character: "foxi", emotion: "curious" };
    case "firstXp":
      return { character: "foxi", emotion: "victory" };
    case "firstEnrollment":
      return { character: "foxi", emotion: "excited" };
    case "password":
      return { character: "owl", emotion: "wise" };
  }
}

// ─── Marketplace companion skins (gamification economy) ───────────────────────

export type SkinRarity = "common" | "rare" | "epic" | "legendary";

export interface CharacterSkin {
  id: string;
  character: CharacterId;
  name: string;
  /** Pose shown as the skin's representative art. */
  emotion: CharacterEmotion;
  rarity: SkinRarity;
  /** Price in spendable XP (Edeviser has no separate currency). */
  priceXp: number;
  description: string;
}

/**
 * Companion skins sold in the marketplace (mirrors the prototype marketplace
 * data). Prices are spendable XP. Backend wiring happens at migration.
 */
export const CHARACTER_SKINS: readonly CharacterSkin[] = [
  {
    id: "foxi-classic",
    character: "foxi",
    name: "Foxi · Classic",
    emotion: "default",
    rarity: "common",
    priceXp: 0,
    description: "Default companion.",
  },
  {
    id: "foxi-scholar",
    character: "foxi",
    name: "Foxi · Scholar",
    emotion: "studious",
    rarity: "rare",
    priceXp: 450,
    description: "Cap & glasses look.",
  },
  {
    id: "foxi-magical",
    character: "foxi",
    name: "Foxi · Magical",
    emotion: "magical",
    rarity: "epic",
    priceXp: 560,
    description: "Sparkle particle trail.",
  },
  {
    id: "foxi-champion",
    character: "foxi",
    name: "Foxi · Champion",
    emotion: "celebrating",
    rarity: "legendary",
    priceXp: 1500,
    description: "Confetti-ready celebration skin.",
  },
  {
    id: "owl-night-sage",
    character: "owl",
    name: "Owl · Night Sage",
    emotion: "wise",
    rarity: "epic",
    priceXp: 800,
    description: "Swap companion entirely.",
  },
  {
    id: "penguin-habit-buddy",
    character: "penguin",
    name: "Pengu · Habit Buddy",
    emotion: "happy",
    rarity: "epic",
    priceXp: 800,
    description: "Swap companion entirely.",
  },
];

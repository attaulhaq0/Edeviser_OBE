// =============================================================================
// Mascot Guidance — pure moment→copy mapping logic (R35)
// =============================================================================
//
// The mascot acts as a coach that appears at high-value points in the student
// journey (welcome, assessment intros, empty states, first XP award, first
// enrollment, and password/auth screens). This module owns the *decision* of
// whether — and with what copy reference and tone — the mascot should speak at
// a given moment, kept pure and React/Supabase-free so it is fully unit- and
// property-testable.
//
// Two invariants from the requirements are encoded here:
//   • R35.4 — when guidance is disabled, no moment ever produces guidance.
//   • R35.5 — when no key moment is active, no guidance is produced; the
//     platform must function fully regardless of the guidance state.
//
// The actual bilingual copy lives in i18next (`common` namespace, `mascot.*`
// keys) so it is always available in both English and Arabic (R35.3); this
// module only resolves the *key* to read, never the literal string.

/** The discrete key journey moments at which the mascot can coach (R35.1, R35.2). */
export type MascotMomentId =
  | "welcome"
  | "assessmentIntro"
  | "emptyState"
  | "firstXp"
  | "firstEnrollment"
  | "password";

/**
 * Coaching tone for a moment. The presentation layer maps each tone to an icon
 * and accent so the logic stays decoupled from visuals.
 */
export type MascotTone = "cheer" | "guide" | "encourage";

/** Resolved guidance descriptor for an active, enabled moment. */
export interface MascotGuidance {
  /** The moment this guidance is for. */
  readonly moment: MascotMomentId;
  /** i18next key base whose `.title` / `.message` children hold the copy. */
  readonly i18nKey: string;
  /** Coaching tone, used by the UI to pick an icon and accent. */
  readonly tone: MascotTone;
}

interface MascotMomentDescriptor {
  readonly i18nKey: string;
  readonly tone: MascotTone;
}

/** All moment ids, ordered, for iteration in tests and validation. */
export const MASCOT_MOMENT_IDS: readonly MascotMomentId[] = [
  "welcome",
  "assessmentIntro",
  "emptyState",
  "firstXp",
  "firstEnrollment",
  "password",
] as const;

/**
 * Static moment→copy mapping. Each moment points at a `common`-namespace key
 * base (`mascot.moments.<moment>`) with `.title` and `.message` children, and
 * carries a coaching tone.
 */
export const MASCOT_MOMENTS: Readonly<
  Record<MascotMomentId, MascotMomentDescriptor>
> = {
  welcome: { i18nKey: "mascot.moments.welcome", tone: "cheer" },
  assessmentIntro: { i18nKey: "mascot.moments.assessmentIntro", tone: "guide" },
  emptyState: { i18nKey: "mascot.moments.emptyState", tone: "guide" },
  firstXp: { i18nKey: "mascot.moments.firstXp", tone: "cheer" },
  firstEnrollment: {
    i18nKey: "mascot.moments.firstEnrollment",
    tone: "encourage",
  },
  password: { i18nKey: "mascot.moments.password", tone: "encourage" },
} as const;

/**
 * Resolve the mascot guidance for a moment.
 *
 * Returns `null` — meaning "render nothing, the surface works without the
 * mascot" — when guidance is disabled (R35.4) or when no key moment is active
 * (R35.5). Otherwise returns the descriptor for the active moment.
 */
export function resolveMascotGuidance(input: {
  readonly enabled: boolean;
  readonly moment: MascotMomentId | null;
}): MascotGuidance | null {
  if (!input.enabled) return null;
  if (input.moment === null) return null;

  const descriptor = MASCOT_MOMENTS[input.moment];
  // Defensive: an unknown moment id (e.g. from loosely-typed callers) yields
  // no guidance rather than throwing, preserving the non-blocking guarantee.
  if (!descriptor) return null;

  return {
    moment: input.moment,
    i18nKey: descriptor.i18nKey,
    tone: descriptor.tone,
  };
}

/** Default mascot-guidance enablement when the student has no stored preference. */
export const MASCOT_ENABLED_DEFAULT = true;

/**
 * Parse a stored mascot-enabled preference value into a boolean. Pure so the
 * (localStorage) read can live in the hook layer while parsing stays testable.
 * Unknown/malformed values fall back to the default so the feature degrades
 * gracefully rather than breaking the surface.
 */
export function parseMascotEnabled(raw: string | null): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return MASCOT_ENABLED_DEFAULT;
}

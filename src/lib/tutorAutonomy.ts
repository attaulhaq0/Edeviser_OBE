import type { AutonomyLevel } from '@/lib/tutorSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Ordered autonomy levels from most restrictive to most permissive. */
const LEVEL_ORDER: readonly AutonomyLevel[] = ['L1', 'L2', 'L3'] as const;

/** Default autonomy level when no configuration is set. */
export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = 'L2';

/** Autonomy level descriptions for UI display. */
export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  L1: 'Hints Only',
  L2: 'Guided Discovery',
  L3: 'Direct Explanation',
};

/** Detailed descriptions for each autonomy level. */
export const AUTONOMY_DESCRIPTIONS: Record<AutonomyLevel, string> = {
  L1: 'The tutor asks guiding questions and provides hints but never reveals answers.',
  L2: 'The tutor provides scaffolded hints and partial explanations leading toward understanding.',
  L3: 'The tutor provides complete, direct explanations of concepts.',
};

// ─── Resolution Logic ───────────────────────────────────────────────────────

/**
 * Returns the numeric index of an autonomy level in the ordered scale.
 * L1 = 0 (most restrictive), L2 = 1, L3 = 2 (most permissive).
 */
function levelIndex(level: AutonomyLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

/**
 * Resolves the effective autonomy level for a tutor interaction.
 *
 * Resolution priority:
 * 1. Assignment-level config (most specific scope)
 * 2. CLO-level config
 * 3. Default (L2)
 *
 * The teacher-configured level acts as a ceiling. A student override
 * cannot exceed the teacher ceiling — if the student requests L3 but
 * the teacher set L1, the resolved level is L1.
 *
 * @param assignmentLevel - Teacher-configured level on the assignment (optional)
 * @param cloLevel - Teacher-configured level on the CLO (optional)
 * @param studentOverride - Student toggle preference: L1 or L3 (optional)
 * @returns The resolved AutonomyLevel
 */
export function resolveAutonomyLevel(
  assignmentLevel?: AutonomyLevel | null,
  cloLevel?: AutonomyLevel | null,
  studentOverride?: 'L1' | 'L3' | null,
): AutonomyLevel {
  // Teacher ceiling: assignment config takes precedence over CLO config
  const teacherCeiling: AutonomyLevel =
    assignmentLevel ?? cloLevel ?? DEFAULT_AUTONOMY_LEVEL;

  // No student override — use teacher ceiling directly
  if (!studentOverride) {
    return teacherCeiling;
  }

  // Student override cannot exceed teacher ceiling
  const ceilingIdx = levelIndex(teacherCeiling);
  const overrideIdx = levelIndex(studentOverride);

  return overrideIdx <= ceilingIdx ? studentOverride : teacherCeiling;
}

/**
 * Checks whether a given autonomy level is valid.
 */
export function isValidAutonomyLevel(level: unknown): level is AutonomyLevel {
  return typeof level === 'string' && LEVEL_ORDER.includes(level as AutonomyLevel);
}

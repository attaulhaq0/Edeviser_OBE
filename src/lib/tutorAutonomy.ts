/**
 * Tutor Autonomy Level Resolution
 *
 * Resolves the effective autonomy level for a tutor conversation based on:
 * 1. Assignment-level setting (highest priority)
 * 2. CLO-level setting (fallback)
 * 3. Default L2 (if neither is set)
 * 4. Student override: L1 ("Figure it out") always applies
 * 5. Student override: L3 ("Just explain it") is capped by teacher ceiling
 */

export type AutonomyLevel = "L1" | "L2" | "L3";

const AUTONOMY_LEVELS: readonly AutonomyLevel[] = ["L1", "L2", "L3"] as const;

export interface ResolveAutonomyInput {
  /** Teacher-configured autonomy level on the assignment (null if not set) */
  assignmentAutonomy: AutonomyLevel | null;
  /** Teacher-configured autonomy level on the CLO (null if not set) */
  cloAutonomy: AutonomyLevel | null;
  /** Student toggle override — can only be L1 or L3 (null if no override) */
  studentOverride: "L1" | "L3" | null;
}

/**
 * Resolves the effective autonomy level for a tutor interaction.
 *
 * Resolution order:
 * 1. If assignment has a tutor_autonomy_level set, use it as the base level
 * 2. Else if CLO has a tutor_autonomy_level set, use it as the base level
 * 3. Else default to L2
 * 4. Student override L1 ("Figure it out"): always use L1 regardless of base
 * 5. Student override L3 ("Just explain it"): use L3 but capped by teacher ceiling
 *    (the base level acts as the ceiling — student can't exceed it)
 */
export function resolveAutonomyLevel(input: ResolveAutonomyInput): AutonomyLevel {
  const { assignmentAutonomy, cloAutonomy, studentOverride } = input;

  // Step 1-3: Determine the base (teacher-configured) level
  const baseLevel: AutonomyLevel = assignmentAutonomy ?? cloAutonomy ?? "L2";

  // No student override — use the base level directly
  if (studentOverride === null) {
    return baseLevel;
  }

  // Step 4: Student selects L1 ("Figure it out") — always honor it
  if (studentOverride === "L1") {
    return "L1";
  }

  // Step 5: Student selects L3 ("Just explain it") — cap by teacher ceiling
  // The teacher ceiling is the base level (assignment > CLO > default)
  const ceilingIndex = AUTONOMY_LEVELS.indexOf(baseLevel);
  const overrideIndex = AUTONOMY_LEVELS.indexOf(studentOverride);
  const resolvedIndex = Math.min(overrideIndex, ceilingIndex);

  // Index is always valid since both inputs are valid AutonomyLevel values
  return (AUTONOMY_LEVELS[resolvedIndex] ?? "L2") as AutonomyLevel;
}

import type { AgentRisk, OperationalAutonomy } from "../contracts.ts";
import { requiresHumanApproval } from "../contracts.ts";

// Re-export for consumers (tests, orchestrator) that treat this policy module
// as the single import surface for autonomy types.
export type { AgentRisk, OperationalAutonomy } from "../contracts.ts";

/**
 * Operational autonomy levels (PDF §23):
 *   A0 observe only · A1 suggest & draft · A2 confirm before action ·
 *   A3 execute pre-approved low-risk actions automatically.
 *
 * Pedagogical tutor autonomy (L1/L2/L3) is a SEPARATE axis implemented in
 * chat-with-tutor; it never mixes with this scale.
 */

export const AUTONOMY_ORDER: readonly OperationalAutonomy[] = [
  "A0",
  "A1",
  "A2",
  "A3",
] as const;

export interface AutonomyCeilings {
  /** Institution-level policy ceiling (institution_settings). */
  institution?: OperationalAutonomy;
  /** Role default ceiling. */
  role?: OperationalAutonomy;
  /** Page-capability-matrix ceiling for the current route. */
  page?: OperationalAutonomy;
  /** Tool-declared maximum autonomy class. */
  tool?: OperationalAutonomy;
  /** User preference — may only LOWER the result (min rule enforces this). */
  userPreference?: OperationalAutonomy;
  /** Teacher/coordinator supervisor ceiling where applicable. */
  supervisor?: OperationalAutonomy;
}

const rank = (level: OperationalAutonomy): number =>
  AUTONOMY_ORDER.indexOf(level);

export const isOperationalAutonomy = (
  value: unknown
): value is OperationalAutonomy =>
  typeof value === "string" &&
  (AUTONOMY_ORDER as readonly string[]).includes(value);

/**
 * Effective autonomy is the MINIMUM of every supplied ceiling (PDF §23).
 * Unknown/invalid ceilings are ignored; absent ceilings do not raise the
 * result. Because the result is a minimum, a user preference can lower but
 * never exceed any policy ceiling.
 */
export const resolveEffectiveAutonomy = (
  ceilings: AutonomyCeilings
): OperationalAutonomy => {
  let effective: OperationalAutonomy = "A3";
  for (const ceiling of Object.values(ceilings)) {
    if (!isOperationalAutonomy(ceiling)) continue;
    if (rank(ceiling) < rank(effective)) effective = ceiling;
  }
  return effective;
};

/**
 * Whether an action of the given risk may be auto-executed at this effective
 * autonomy level. Write-class actions are PROTECTED_ACTIONS and ALWAYS
 * require a proposal + human approval — even at A3 (delegates to the
 * contracts.ts invariant so the two definitions can never diverge).
 */
export const mayAutoExecute = (
  action: string,
  risk: AgentRisk,
  effective: OperationalAutonomy
): boolean => {
  if (requiresHumanApproval(action, effective)) return false;
  if (effective !== "A3") return false;
  return risk !== "protected";
};

// Feature: Task 7.2 — institution-level A3 autonomy feature flags & rollback controls.
// Fail-closed policy module; the single sanctioned consumer surface for
// institution_autonomy_settings in the agent runtime.
//
// LIVE-DB CONTRACT (verified via MCP pg_catalog/pg_constraint 2026-08-27):
// - table institution_autonomy_settings: RLS ENABLED with ZERO client policies
//   (service-role-only writes) ⇒ readable ONLY from edge functions.
// - autonomy_ceiling CHECK (A0|A1|A2|A3); defaults: ceiling 'A2',
//   auto_execute_low_risk false, rollback_enabled true.
//
// Invariants (strict, unit-tested in src/__tests__/unit/institutionAutonomySettings.test.ts):
// I1  Missing/unreadable settings ⇒ UNCONFIGURED defaults (A2, auto-exec off,
//     rollback on). Never throws; can only NARROW autonomy vs the engine
//     default of A3-min.
// I2  Malformed/corrupt row ⇒ strict spec defaults (A2 + flags off) with
//     configured=true, so a corrupt row can never raise autonomy.
// I3  Effective autonomy = strict minimum of every ceiling INCLUDING the
//     institution ceiling (ceilings only lower, never raise).
// I4  Auto-execution requires ALL of: autoExecuteLowRisk=true, effective A3,
//     and a non-protected action (shared autonomy invariant). Protected
//     actions can NEVER auto-execute under any flag combination.
import {
  isOperationalAutonomy,
  mayAutoExecute,
  resolveEffectiveAutonomy,
  type AgentRisk,
  type AutonomyCeilings,
  type OperationalAutonomy,
} from "./autonomy.ts";

export interface InstitutionAutonomyFlags {
  readonly institutionAutonomyCeiling: OperationalAutonomy;
  readonly autoExecuteLowRisk: boolean;
  readonly rollbackEnabled: boolean;
}

export interface ResolvedInstitutionAutonomy {
  /** False when no row exists for the institution (DB defaults apply). */
  readonly configured: boolean;
  readonly flags: InstitutionAutonomyFlags;
}

/** Spec defaults (mirrors the table's column defaults exactly). */
export const INSTITUTION_AUTONOMY_DEFAULTS: InstitutionAutonomyFlags = {
  institutionAutonomyCeiling: "A2",
  autoExecuteLowRisk: false,
  rollbackEnabled: true,
};

const UNCONFIGURED: ResolvedInstitutionAutonomy = {
  configured: false,
  flags: INSTITUTION_AUTONOMY_DEFAULTS,
};

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Parses one raw institution_autonomy_settings row into bounded flags.
 * Fail-closed: any missing/invalid field falls back to the strict default,
 * never to a wider value.
 */
export const parseInstitutionAutonomySettings = (
  row: unknown
): ResolvedInstitutionAutonomy => {
  if (!isRecord(row)) return UNCONFIGURED;
  const ceiling = row.autonomy_ceiling;
  // I2: corrupt ceiling ⇒ strict defaults (configured=true, flags at floor).
  if (!isOperationalAutonomy(ceiling)) {
    return { configured: true, flags: INSTITUTION_AUTONOMY_DEFAULTS };
  }
  return {
    configured: true,
    flags: {
      institutionAutonomyCeiling: ceiling,
      autoExecuteLowRisk:
        isBoolean(row.auto_execute_low_risk) && row.auto_execute_low_risk,
      rollbackEnabled: isBoolean(row.rollback_enabled)
        ? row.rollback_enabled
        : INSTITUTION_AUTONOMY_DEFAULTS.rollbackEnabled,
    },
  };
};

/** Minimal structural client so the module stays unit-testable without the SDK. */
interface SettingsClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

/**
 * Loads the institution's autonomy flags. Unreadable settings (error, empty
 * institution id, transport failure) resolve to the UNCONFIGURED defaults —
 * this function NEVER throws and NEVER widens autonomy (I1).
 */
export const fetchInstitutionAutonomySettings = async (
  admin: SettingsClient,
  institutionId: string
): Promise<ResolvedInstitutionAutonomy> => {
  if (!institutionId) return UNCONFIGURED;
  try {
    const { data, error } = await admin
      .from("institution_autonomy_settings")
      .select("autonomy_ceiling,auto_execute_low_risk,rollback_enabled")
      .eq("institution_id", institutionId)
      .maybeSingle();
    if (error) return UNCONFIGURED;
    return parseInstitutionAutonomySettings(data);
  } catch {
    return UNCONFIGURED;
  }
};

/**
 * Strict-min effective autonomy including the institution ceiling (I3).
 * Every supplied ceiling can only lower the result.
 */
export const resolveEffectiveAutonomyWithInstitution = (
  ceilings: AutonomyCeilings,
  flags: InstitutionAutonomyFlags
): OperationalAutonomy =>
  resolveEffectiveAutonomy({
    ...ceilings,
    institution: flags.institutionAutonomyCeiling,
  });

/**
 * I4: institution-gated auto-execution decision. Requires BOTH the
 * institution flag AND the shared engine invariant (A3 + non-protected).
 * Protected actions always return false regardless of flags.
 */
export const mayAutoExecuteWithInstitutionPolicy = (
  action: string,
  risk: AgentRisk,
  effective: OperationalAutonomy,
  flags: InstitutionAutonomyFlags
): boolean =>
  flags.autoExecuteLowRisk === true && mayAutoExecute(action, risk, effective);

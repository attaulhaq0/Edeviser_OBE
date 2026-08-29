// Feature: Task 7.2 — institution-level A3 autonomy feature flags + rollback
// controls (edeviser-agentic-intelligence, Wave B closure).
//
// Fail-closed consumption layer over `institution_autonomy_settings` (live
// schema verified via MCP pg_catalog 2026-08-27):
//   operational_autonomy_ceiling       text CHECK A0|A1|A2|A3, NOT NULL DEFAULT 'A2'
//   auto_execute_low_risk  bool NOT NULL DEFAULT false
//   rollback_enabled       bool NOT NULL DEFAULT true
//   evaluation_thresholds  jsonb (consumed by the Task 7.4 evaluation harness)
//
// Contract:
//   - Unconfigured institution -> Postgres defaults (A2 ceiling, auto-exec OFF,
//     rollback ON): never more permissive than the schema default.
//   - Malformed row / store error -> SAFEST posture (A0, auto-exec OFF), never
//     throws: a settings outage can never raise agent autonomy (fail closed).
//   - resolveEffectiveAutonomyWithInstitution folds the institution ceiling
//     into the PDF 23 strict-minimum rule; it may only LOWER the result.
//   - mayAutoExecuteWithInstitutionPolicy requires BOTH institution flags true
//     AND effective A3 AND a non-protected action. Protected actions always
//     require a human-approved proposal regardless of any flag.

import {
  isOperationalAutonomy,
  resolveEffectiveAutonomy,
  type AutonomyCeilings,
  type OperationalAutonomy,
} from "./autonomy.ts";
import { isProtectedActionType } from "../contracts.ts";

export interface InstitutionAutonomySettings {
  /** False when the institution row is absent or fell back to defaults. */
  readonly configured: boolean;
  readonly institutionCeiling: OperationalAutonomy;
  readonly autoExecuteLowRisk: boolean;
  readonly rollbackEnabled: boolean;
}

/** Schema-default posture for a configured-but-default institution. */
export const DEFAULT_INSTITUTION_AUTONOMY: InstitutionAutonomySettings = {
  configured: false,
  institutionCeiling: "A2",
  autoExecuteLowRisk: false,
  rollbackEnabled: true,
};

/** Posture forced when the settings row cannot be trusted (fail closed). */
export const SAFE_INSTITUTION_AUTONOMY: InstitutionAutonomySettings = {
  configured: false,
  institutionCeiling: "A0",
  autoExecuteLowRisk: false,
  rollbackEnabled: true,
};

interface RawSettingsRow {
  readonly operational_autonomy_ceiling: unknown;
  readonly auto_execute_low_risk: unknown;
  readonly rollback_enabled: unknown;
}

const isRawSettingsRow = (value: unknown): value is RawSettingsRow =>
  typeof value === "object" &&
  value !== null &&
  "operational_autonomy_ceiling" in value &&
  "auto_execute_low_risk" in value &&
  "rollback_enabled" in value;

/**
 * Parses one settings row. Malformed fields collapse the WHOLE row to the safe
 * posture: a partially-valid row is treated as no row (never partially trust).
 */
export const parseInstitutionAutonomySettings = (
  row: unknown
): InstitutionAutonomySettings => {
  if (!isRawSettingsRow(row)) return SAFE_INSTITUTION_AUTONOMY;
  const {
    operational_autonomy_ceiling,
    auto_execute_low_risk,
    rollback_enabled,
  } = row;
  if (
    !isOperationalAutonomy(operational_autonomy_ceiling) ||
    typeof auto_execute_low_risk !== "boolean" ||
    typeof rollback_enabled !== "boolean"
  ) {
    return SAFE_INSTITUTION_AUTONOMY;
  }
  return {
    configured: true,
    institutionCeiling: operational_autonomy_ceiling,
    autoExecuteLowRisk: auto_execute_low_risk,
    rollbackEnabled: rollback_enabled,
  };
};

/** Minimal structural surface of the Supabase client this module needs. */
export interface AutonomySettingsFetcher {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string
      ): {
        maybeSingle(): Promise<{
          data: unknown;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

/**
 * Loads the institution's autonomy settings via the service-role client.
 * NEVER throws: any store error resolves to the safe posture so a settings
 * outage cannot raise the effective autonomy of a running agent.
 */
export const fetchInstitutionAutonomySettings = async (
  client: AutonomySettingsFetcher,
  institutionId: string
): Promise<InstitutionAutonomySettings> => {
  if (!institutionId) return DEFAULT_INSTITUTION_AUTONOMY;
  try {
    const { data, error } = await client
      .from("institution_autonomy_settings")
      .select(
        "operational_autonomy_ceiling,auto_execute_low_risk,rollback_enabled"
      )
      .eq("institution_id", institutionId)
      .maybeSingle();
    if (error) return SAFE_INSTITUTION_AUTONOMY;
    if (data === null) return DEFAULT_INSTITUTION_AUTONOMY;
    return parseInstitutionAutonomySettings(data);
  } catch {
    return SAFE_INSTITUTION_AUTONOMY;
  }
};

/**
 * Strict-minimum effective autonomy with the institution ceiling folded in.
 * Absent ceilings never raise the result (resolveEffectiveAutonomy invariant).
 */
export const resolveEffectiveAutonomyWithInstitution = (
  settings: InstitutionAutonomySettings,
  ceilings: Omit<AutonomyCeilings, "institution"> = {}
): OperationalAutonomy =>
  resolveEffectiveAutonomy({
    ...ceilings,
    institution: settings.institutionCeiling,
  });

/**
 * Auto-execution gate under institutional policy. Requires the institution's
 * auto-exec flag AND rollback control enabled AND effective A3 AND a
 * non-protected action. Protected actions always require human approval.
 */
export const mayAutoExecuteWithInstitutionPolicy = (
  action: string,
  risk: "read" | "low" | "protected",
  effective: OperationalAutonomy,
  settings: InstitutionAutonomySettings
): boolean =>
  settings.autoExecuteLowRisk &&
  settings.rollbackEnabled &&
  effective === "A3" &&
  !isProtectedActionType(action) && // canonical invariant, not the caller risk label
  risk !== "protected" &&
  action.length > 0;

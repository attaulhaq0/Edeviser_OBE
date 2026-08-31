// Feature: Task 7.2 institution-level A3 feature flags (edeviser-agentic-intelligence).
// Fail-closed contract: unconfigured -> schema defaults; malformed/errored store
// reads -> safest posture; strict-minimum folding; protected actions never auto-exec.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSTITUTION_AUTONOMY,
  SAFE_INSTITUTION_AUTONOMY,
  fetchInstitutionAutonomySettings,
  mayAutoExecuteWithInstitutionPolicy,
  parseInstitutionAutonomySettings,
  resolveEffectiveAutonomyWithInstitution,
} from "../../../supabase/functions/_shared/ai/policy/institution-autonomy";

// Imports follow the repo pattern used by agentOrchestrator.test.ts; internal
// .ts-relative imports inside supabase functions resolve under Vite.

describe("parseInstitutionAutonomySettings (Task 7.2)", () => {
  it("accepts a fully valid row", () => {
    const parsed = parseInstitutionAutonomySettings({
      operational_autonomy_ceiling: "A3",
      auto_execute_low_risk: true,
      rollback_enabled: true,
    });
    expect(parsed).toEqual({
      configured: true,
      institutionCeiling: "A3",
      autoExecuteLowRisk: true,
      rollbackEnabled: true,
    });
  });

  it("collapses a malformed ceiling to the SAFE posture (fail closed)", () => {
    expect(
      parseInstitutionAutonomySettings({
        operational_autonomy_ceiling: "A9",
        auto_execute_low_risk: true,
        rollback_enabled: true,
      })
    ).toEqual(SAFE_INSTITUTION_AUTONOMY);
  });

  it("collapses a partially-valid row — never partially trust", () => {
    expect(
      parseInstitutionAutonomySettings({
        operational_autonomy_ceiling: "A3",
        auto_execute_low_risk: "yes",
        rollback_enabled: true,
      })
    ).toEqual(SAFE_INSTITUTION_AUTONOMY);
  });

  it("treats non-object input as no row", () => {
    expect(parseInstitutionAutonomySettings(null)).toEqual(
      SAFE_INSTITUTION_AUTONOMY
    );
    expect(parseInstitutionAutonomySettings(42)).toEqual(
      SAFE_INSTITUTION_AUTONOMY
    );
  });
});

describe("fetchInstitutionAutonomySettings (Task 7.2)", () => {
  // The mock records the full query chain (table -> columns -> filters) so a
  // regression that drops the .eq("institution_id", ...) tenant filter or
  // queries the wrong table cannot pass silently (review hardening).
  const makeClient = (result: {
    data: unknown;
    error: { message: string } | null;
  }) => {
    const calls = {
      from: [] as string[],
      select: [] as string[],
      eq: [] as Array<[string, string]>,
    };
    const client = {
      from: (table: string) => {
        calls.from.push(table);
        return {
          select: (columns: string) => {
            calls.select.push(columns);
            return {
              eq: (column: string, value: string) => {
                calls.eq.push([column, value]);
                return { maybeSingle: () => Promise.resolve(result) };
              },
            };
          },
        };
      },
    };
    return { client: client as never, calls };
  };

  it("returns DEFAULTS when no row exists (never more permissive than schema)", async () => {
    const { client, calls } = makeClient({ data: null, error: null });
    const settings = await fetchInstitutionAutonomySettings(
      client,
      "00000000-0000-0000-0000-000000000001"
    );
    expect(settings).toEqual(DEFAULT_INSTITUTION_AUTONOMY);
    expect(settings.autoExecuteLowRisk).toBe(false);
    expect(calls.from).toEqual(["institution_autonomy_settings"]);
    expect(calls.select).toEqual([
      "operational_autonomy_ceiling,auto_execute_low_risk,rollback_enabled",
    ]);
    expect(calls.eq).toEqual([
      ["institution_id", "00000000-0000-0000-0000-000000000001"],
    ]);
  });

  it("returns SAFE posture when the store errors (fail closed, never throws)", async () => {
    const { client } = makeClient({ data: null, error: { message: "down" } });
    const settings = await fetchInstitutionAutonomySettings(
      client,
      "00000000-0000-0000-0000-000000000001"
    );
    expect(settings).toEqual(SAFE_INSTITUTION_AUTONOMY);
    expect(settings.institutionCeiling).toBe("A0");
  });

  it("returns DEFAULTS for an empty institution id without querying", async () => {
    let queried = false;
    const client = {
      from: () => {
        queried = true;
        throw new Error("must not be reached");
      },
    } as never;
    const settings = await fetchInstitutionAutonomySettings(client, "");
    expect(queried).toBe(false);
    expect(settings).toEqual(DEFAULT_INSTITUTION_AUTONOMY);
  });
});

describe("resolveEffectiveAutonomyWithInstitution (Task 7.2)", () => {
  it("lowers role A3 to the institution ceiling A1 (strict minimum)", () => {
    const effective = resolveEffectiveAutonomyWithInstitution(
      {
        configured: true,
        institutionCeiling: "A1",
        autoExecuteLowRisk: true,
        rollbackEnabled: true,
      },
      { role: "A3", tool: "A3" }
    );
    expect(effective).toBe("A1");
  });

  it("never RAISES above a lower role ceiling", () => {
    const effective = resolveEffectiveAutonomyWithInstitution(
      {
        configured: true,
        institutionCeiling: "A3",
        autoExecuteLowRisk: true,
        rollbackEnabled: true,
      },
      { role: "A0" }
    );
    expect(effective).toBe("A0");
  });
});

describe("mayAutoExecuteWithInstitutionPolicy (Task 7.2)", () => {
  const a3 = (flags: Partial<{ auto: boolean; rollback: boolean }>) => ({
    configured: true,
    institutionCeiling: "A3" as const,
    autoExecuteLowRisk: flags.auto ?? true,
    rollbackEnabled: flags.rollback ?? true,
  });

  it("allows low-risk auto-execution only under ALL conditions", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy("hint", "read", "A3", a3({}))
    ).toBe(true);
  });

  it("denies when the institution auto-exec flag is off", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy(
        "hint",
        "read",
        "A3",
        a3({ auto: false })
      )
    ).toBe(false);
  });

  it("denies when rollback control is disabled", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy(
        "hint",
        "read",
        "A3",
        a3({ rollback: false })
      )
    ).toBe(false);
  });

  it("denies below A3 even with flags on", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy("hint", "read", "A2", a3({}))
    ).toBe(false);
  });

  it("ALWAYS denies protected actions — human approval is unconditional", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy(
        "propose_create_ilo",
        "protected",
        "A3",
        a3({})
      )
    ).toBe(false);
  });
});

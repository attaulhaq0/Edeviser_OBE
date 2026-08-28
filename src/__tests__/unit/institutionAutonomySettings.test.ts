// Feature: Task 7.2 — institution-level A3 autonomy flags (edeviser-agentic-intelligence).
// Covers the fail-closed parsing/loading/effective-autonomy/auto-execution
// invariants I1–I4 documented in
// supabase/functions/_shared/ai/policy/institution-autonomy.ts.
import { describe, expect, it } from "vitest";

import {
  INSTITUTION_AUTONOMY_DEFAULTS,
  fetchInstitutionAutonomySettings,
  mayAutoExecuteWithInstitutionPolicy,
  parseInstitutionAutonomySettings,
  resolveEffectiveAutonomyWithInstitution,
} from "../../../supabase/functions/_shared/ai/policy/institution-autonomy.ts";

const ROW = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  autonomy_ceiling: "A3",
  auto_execute_low_risk: true,
  rollback_enabled: true,
  ...overrides,
});

describe("parseInstitutionAutonomySettings (I1/I2 fail-closed)", () => {
  it("Property 7.2-I1: null/undefined rows resolve to unconfigured defaults", () => {
    for (const input of [null, undefined]) {
      const resolved = parseInstitutionAutonomySettings(input);
      expect(resolved.configured).toBe(false);
      expect(resolved.flags).toEqual(INSTITUTION_AUTONOMY_DEFAULTS);
    }
  });

  it("Property 7.2-I1: non-object rows (strings/arrays/numbers) resolve to unconfigured defaults", () => {
    for (const input of ["A3", [], 7, true]) {
      const resolved = parseInstitutionAutonomySettings(input);
      expect(resolved.configured).toBe(false);
      expect(resolved.flags.autoExecuteLowRisk).toBe(false);
      expect(resolved.flags.institutionAutonomyCeiling).toBe("A2");
    }
  });

  it("Property 7.2-I2: malformed ceiling forces strict defaults even with wide flags", () => {
    const resolved = parseInstitutionAutonomySettings(
      ROW({ autonomy_ceiling: "A9" })
    );
    expect(resolved.configured).toBe(true);
    expect(resolved.flags).toEqual(INSTITUTION_AUTONOMY_DEFAULTS);
  });

  it("Parses valid rows exactly", () => {
    const resolved = parseInstitutionAutonomySettings(
      ROW({ autonomy_ceiling: "A1", auto_execute_low_risk: false })
    );
    expect(resolved).toEqual({
      configured: true,
      flags: {
        institutionAutonomyCeiling: "A1",
        autoExecuteLowRisk: false,
        rollbackEnabled: true,
      },
    });
  });

  it("Non-boolean auto_execute_low_risk falls closed to false; rollback falls back to true", () => {
    const resolved = parseInstitutionAutonomySettings(
      ROW({ auto_execute_low_risk: "yes", rollback_enabled: undefined })
    );
    expect(resolved.flags.autoExecuteLowRisk).toBe(false);
    expect(resolved.flags.rollbackEnabled).toBe(true);
  });
});

describe("fetchInstitutionAutonomySettings (I1: never throws, never widens)", () => {
  const clientWith = (result: { data: unknown; error: unknown }) => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve(result) }),
      }),
    }),
  });

  it("Returns unconfigured defaults on transport/selector errors", async () => {
    const resolved = await fetchInstitutionAutonomySettings(
      clientWith({ data: null, error: { message: "boom" } }),
      "11111111-1111-4111-8111-111111111111"
    );
    expect(resolved.configured).toBe(false);
    expect(resolved.flags).toEqual(INSTITUTION_AUTONOMY_DEFAULTS);
  });

  it("Returns unconfigured defaults when no row exists", async () => {
    const resolved = await fetchInstitutionAutonomySettings(
      clientWith({ data: null, error: null }),
      "11111111-1111-4111-8111-111111111111"
    );
    expect(resolved.configured).toBe(false);
  });

  it("Parses a live row and tolerates throwing clients", async () => {
    const ok = await fetchInstitutionAutonomySettings(
      clientWith({ data: ROW({}), error: null }),
      "11111111-1111-4111-8111-111111111111"
    );
    expect(ok.flags.institutionAutonomyCeiling).toBe("A3");
    const throwing = {
      from: (): never => {
        throw new Error("network down");
      },
    } as unknown as Parameters<typeof fetchInstitutionAutonomySettings>[0];
    await expect(
      fetchInstitutionAutonomySettings(throwing, "x")
    ).resolves.toEqual({
      configured: false,
      flags: INSTITUTION_AUTONOMY_DEFAULTS,
    });
  });

  it("Empty institution id short-circuits to unconfigured defaults", async () => {
    const resolved = await fetchInstitutionAutonomySettings(
      clientWith({ data: ROW({}), error: null }),
      ""
    );
    expect(resolved.configured).toBe(false);
  });
});

describe("resolveEffectiveAutonomyWithInstitution (I3 strict-min)", () => {
  it("Institution ceiling lowers the effective autonomy", () => {
    expect(
      resolveEffectiveAutonomyWithInstitution(
        { tool: "A3", role: "A3" },
        { ...INSTITUTION_AUTONOMY_DEFAULTS, institutionAutonomyCeiling: "A0" }
      )
    ).toBe("A0");
  });

  it("Other ceilings can lower below the institution ceiling", () => {
    expect(
      resolveEffectiveAutonomyWithInstitution(
        { page: "A1" },
        { ...INSTITUTION_AUTONOMY_DEFAULTS, institutionAutonomyCeiling: "A3" }
      )
    ).toBe("A1");
  });

  it("Absent ceilings never raise the result above the institution ceiling", () => {
    expect(
      resolveEffectiveAutonomyWithInstitution(
        {},
        { ...INSTITUTION_AUTONOMY_DEFAULTS, institutionAutonomyCeiling: "A2" }
      )
    ).toBe("A2");
  });
});

describe("mayAutoExecuteWithInstitutionPolicy (I4 protected shield)", () => {
  const A3_FLAGS = {
    institutionAutonomyCeiling: "A3" as const,
    autoExecuteLowRisk: true,
    rollbackEnabled: true,
  };

  it("Auto-executes only at effective A3 with the flag on and a low risk", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy("tutor_hint", "low", "A3", A3_FLAGS)
    ).toBe(true);
  });

  it("Blocks when the institution flag is off", () => {
    expect(
      mayAutoExecuteWithInstitutionPolicy("tutor_hint", "low", "A3", {
        ...A3_FLAGS,
        autoExecuteLowRisk: false,
      })
    ).toBe(false);
  });

  it("Blocks below effective A3", () => {
    for (const level of ["A0", "A1", "A2"] as const) {
      expect(
        mayAutoExecuteWithInstitutionPolicy("tutor_hint", "low", level, A3_FLAGS)
      ).toBe(false);
    }
  });

  it("NEVER auto-executes protected actions under any flag combination", () => {
    for (const ceiling of ["A0", "A1", "A2", "A3"] as const) {
      for (const flag of [true, false]) {
        expect(
          mayAutoExecuteWithInstitutionPolicy(
            "propose_create_ilo",
            "protected",
            "A3",
            {
              institutionAutonomyCeiling: ceiling,
              autoExecuteLowRisk: flag,
              rollbackEnabled: true,
            }
          )
        ).toBe(false);
      }
    }
  });
});

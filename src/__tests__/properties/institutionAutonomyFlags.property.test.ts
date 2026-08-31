// Feature: Task 7.2 institution-level A3 feature flags (edeviser-agentic-intelligence).
// Property 1 (7.2+7.3): PROTECTED_ACTIONS can NEVER auto-execute through the
//   institution policy layer, for every settings combination — even with
//   auto_execute_low_risk=true, rollback_enabled=true, ceiling A3.
// Property 2 (7.2): any flag off, or any non-A3 effective autonomy, disables
//   auto-execution for every action/risk combination.
// Property 3 (7.2): with both flags on, ceiling A3, and a non-protected
//   read/low-risk action, auto-execution is possible (flags actually enable A3).
// Property 4 (7.2): effective autonomy never exceeds the institution ceiling
//   (strict-minimum invariant at the institution layer).
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  mayAutoExecuteWithInstitutionPolicy,
  resolveEffectiveAutonomyWithInstitution,
  type InstitutionAutonomySettings,
} from "../../../supabase/functions/_shared/ai/policy/institution-autonomy";
import {
  AUTONOMY_ORDER,
  type OperationalAutonomy,
} from "../../../supabase/functions/_shared/ai/policy/autonomy";
import { PROTECTED_ACTIONS } from "../../../supabase/functions/_shared/ai/contracts";

const autonomyArb = fc.constantFrom(...AUTONOMY_ORDER);
const riskArb = fc.constantFrom("read", "low", "protected" as const);
const settingsArb: fc.Arbitrary<InstitutionAutonomySettings> = fc.record({
  institutionCeiling: autonomyArb,
  autoExecuteLowRisk: fc.boolean(),
  rollbackEnabled: fc.boolean(),
  configured: fc.boolean(),
});
const PROTECTED_SET: ReadonlySet<string> = new Set(PROTECTED_ACTIONS);
const rank = (level: OperationalAutonomy): number =>
  AUTONOMY_ORDER.indexOf(level);

describe("Property 1 (7.2): PROTECTED_ACTIONS never auto-execute via institution flags", () => {
  it("mayAutoExecuteWithInstitutionPolicy === false for all protected actions x settings", () => {
    let checked = 0;
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ACTIONS),
        riskArb,
        settingsArb,
        (action, risk, settings) => {
          checked += 1;
          const effective = resolveEffectiveAutonomyWithInstitution(settings);
          return (
            mayAutoExecuteWithInstitutionPolicy(
              action,
              risk,
              effective,
              settings
            ) === false
          );
        }
      ),
      { numRuns: 200 }
    );
    expect(checked).toBe(200);
  });
});

describe("Property 2 (7.2): flags gate auto-execution absolutely", () => {
  it("returns false whenever a flag is off or effective autonomy is below A3", () => {
    let checked = 0;
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        riskArb,
        settingsArb,
        (action, risk, settings) => {
          checked += 1;
          const effective = resolveEffectiveAutonomyWithInstitution(settings);
          const result = mayAutoExecuteWithInstitutionPolicy(
            action,
            risk,
            effective,
            settings
          );
          if (!settings.autoExecuteLowRisk || !settings.rollbackEnabled) {
            return result === false;
          }
          if (effective !== "A3") {
            return result === false;
          }
          // Remaining combinations (flags on + effective A3) are covered by
          // Property 1 (protected) and Property 3 (non-protected positive).
          return true;
        }
      ),
      { numRuns: 200 }
    );
    expect(checked).toBe(200);
  });
});

describe("Property 3 (7.2): flag-on A3 enables low-risk auto-execution", () => {
  it("allows non-protected read/low-risk actions at ceiling A3 with both flags on", () => {
    let checked = 0;
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 40 })
          .filter((action) => !PROTECTED_SET.has(action)),
        fc.constantFrom("read", "low" as const),
        (action, risk) => {
          checked += 1;
          // Effective autonomy is exactly A3 here: the institution ceiling is
          // A3 and no role/page/user ceilings are supplied (Property 4 covers
          // the resolver separately, so this property scopes the gate alone).
          return (
            mayAutoExecuteWithInstitutionPolicy(action, risk, "A3", {
              institutionCeiling: "A3",
              autoExecuteLowRisk: true,
              rollbackEnabled: true,
              configured: true,
            }) === true
          );
        }
      ),
      { numRuns: 150 }
    );
    expect(checked).toBe(150);
  });
});

describe("Property 4 (7.2): institution ceiling is a strict maximum", () => {
  it("effective autonomy never exceeds the institution ceiling", () => {
    let checked = 0;
    fc.assert(
      fc.property(
        autonomyArb,
        autonomyArb,
        autonomyArb,
        (ceiling, role, page) => {
          checked += 1;
          const effective = resolveEffectiveAutonomyWithInstitution(
            {
              institutionCeiling: ceiling,
              autoExecuteLowRisk: false,
              rollbackEnabled: true,
              configured: true,
            },
            { role, page }
          );
          return rank(effective) <= rank(ceiling);
        }
      ),
      { numRuns: 150 }
    );
    expect(checked).toBe(150);
  });
});

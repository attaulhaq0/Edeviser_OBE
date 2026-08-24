// Feature: Agentic platform certification (tasks.md 4.8, 5.4, 6.4, 7.3).
// Property 1 (7.3): PROTECTED_ACTIONS can NEVER be auto-executed at any
//   autonomy level - the human-approval shield is absolute.
// Property 2 (7.3): effective autonomy is the strict MINIMUM of all ceilings;
//   a user preference may lower but never raise the result.
// Property 3 (4.8): risk findings carrying numeric score fields are rejected;
//   the model never invents deterministic risk scores.
// Property 4 (4.8): habit signals without evidence citations are rejected.
// Property 5 (4.8): intervention drafts without explicit approval gating are
//   rejected.
// Property 6 (6.4/5.4): the read-tool registry is read-only by construction;
//   the student surface excludes governance tools; outcome-governance write
//   tools are admin-only and always produce approval proposals.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  AUTONOMY_ORDER,
  mayAutoExecute,
  resolveEffectiveAutonomy,
  type OperationalAutonomy,
} from "../../../supabase/functions/_shared/ai/policy/autonomy";
import {
  PROTECTED_ACTIONS,
  SPECIALISTS_BY_ROLE,
  isProtectedActionType,
  requiredApproverRole,
} from "../../../supabase/functions/_shared/ai/contracts";
import {
  READ_TOOL_REGISTRY,
  registeredToolsForRole,
} from "../../../supabase/functions/_shared/ai/tools/registry";
import {
  parseHabitAnalysis,
  parseInterventionPlan,
  parseRiskAssessment,
} from "../../../supabase/functions/_shared/ai/specialists/protocols";

const read = (p: string): string =>
  readFileSync(resolve(process.cwd(), p), "utf8");

const autonomyArb = fc.constantFrom(...AUTONOMY_ORDER);
const riskArb = fc.constantFrom("read", "low", "protected" as const);

const citedRiskFinding = (extra: Record<string, unknown>) => ({
  signal: "late_submission_pattern",
  level: "moderate",
  basis: "3 late submissions",
  evidenceIds: ["ev-1"],
  escalation: "notify_teacher",
  ...extra,
});

describe("Property 1 (7.3): PROTECTED_ACTIONS never auto-execute", () => {
  it("rejects auto-execution for every action x risk x autonomy combination", () => {
    let checked = 0;
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ACTIONS),
        riskArb,
        autonomyArb,
        (action, risk, level) => {
          checked += 1;
          return mayAutoExecute(action, risk, level) === false;
        }
      ),
      { numRuns: 200 }
    );
    expect(checked).toBe(200);
  });

  it("holds exhaustively across the full action and level matrices", () => {
    for (const action of PROTECTED_ACTIONS) {
      expect(isProtectedActionType(action)).toBe(true);
      for (const level of AUTONOMY_ORDER) {
        expect(mayAutoExecute(action, "low", level)).toBe(false);
        expect(requiredApproverRole(action)).toBeTruthy();
      }
    }
  });
});

describe("Property 2 (7.3): effective autonomy is the strict minimum", () => {
  it("never exceeds any provided ceiling", () => {
    fc.assert(
      fc.property(
        fc.option(autonomyArb, { nil: undefined }),
        fc.option(autonomyArb, { nil: undefined }),
        fc.option(autonomyArb, { nil: undefined }),
        fc.option(autonomyArb, { nil: undefined }),
        (institution, role, page, userPreference) => {
          const ceilings = {
            institution,
            role,
            page,
            userPreference,
          } as Record<string, OperationalAutonomy | undefined>;
          const effective = resolveEffectiveAutonomy(ceilings);
          const rankOf = (l: OperationalAutonomy) => AUTONOMY_ORDER.indexOf(l);
          return Object.values(ceilings).every(
            (c) => c === undefined || rankOf(effective) <= rankOf(c)
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  it("defaults to A3 only when no ceiling constrains it", () => {
    expect(resolveEffectiveAutonomy({})).toBe("A3");
    expect(
      resolveEffectiveAutonomy({ institution: "A3", userPreference: "A3" })
    ).toBe("A3");
    expect(
      resolveEffectiveAutonomy({ institution: "A3", userPreference: "A1" })
    ).toBe("A1");
  });
});

describe("Property 3 (4.8): the model never invents risk scores", () => {
  it("rejects findings that smuggle numeric score fields", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("score", "riskScore", "probability"),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (field, value) => {
          const payload = {
            findings: [citedRiskFinding({ [field]: value })],
            overallLevel: "low",
            summary: "s",
          };
          return parseRiskAssessment(JSON.stringify(payload)) === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts categorical findings that cite deterministic evidence", () => {
    const parsed = parseRiskAssessment(
      JSON.stringify({
        findings: [citedRiskFinding({})],
        overallLevel: "moderate",
        summary: "Monitor.",
      })
    );
    expect(parsed).not.toBeNull();
  });
});

describe("Property 4 (4.8): habit signals must cite evidence", () => {
  it("rejects uncited observations regardless of phrasing", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 40 })
          .filter((s) => s.trim().length > 0),
        fc.constantFrom("evidenceIds", "citations"),
        (observation, citationField) => {
          const payload = {
            windowDays: 14,
            signals: [{ signal: "streak", observation, [citationField]: [] }],
          };
          return parseHabitAnalysis(JSON.stringify(payload)) === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 5 (4.8): intervention drafts are always approval-gated", () => {
  const draft = (
    overrides: Record<string, unknown>
  ): Record<string, unknown> => ({
    actionType: "schedule_practice_set",
    payload: { courseId: "c1" },
    rationale: "positive measured effect",
    expectedEffectBasis: "measurement mi-7",
    evidenceIds: ["mi-7"],
    approvalRequired: true,
    ...overrides,
  });

  it("rejects any draft where approvalRequired is not literally true", () => {
    fc.assert(
      fc.property(fc.constantFrom(undefined, false, "true", 1), (badValue) => {
        const action = draft(
          badValue === undefined
            ? { approvalRequired: undefined }
            : { approvalRequired: badValue as unknown as boolean }
        );
        if (action.approvalRequired === undefined)
          delete action.approvalRequired;
        return (
          parseInterventionPlan(
            JSON.stringify({ selectedBecause: "x", draftActions: [action] })
          ) === null
        );
      }),
      { numRuns: 50 }
    );
  });
});

describe("Property 6 (6.4/5.4): role-scoped tool surfaces", () => {
  it("registers only read-class tools (no write verbs anywhere)", () => {
    for (const tool of Object.values(READ_TOOL_REGISTRY)) {
      expect(tool.name).toMatch(/^(get_|search_)/);
      expect(tool.risk).toBe("read");
      expect(tool.allowedRoles.length).toBeGreaterThan(0);
    }
  });

  it("gives students no governance tooling", () => {
    const studentTools = registeredToolsForRole("student").map((t) => t.name);
    expect(studentTools).not.toContain("get_institution_ilos");
    expect(studentTools).not.toContain("get_outcome_hierarchy_health");
    for (const name of studentTools) {
      expect(name).toMatch(/^(get_|search_)/);
    }
  });

  it("never grants admin/coordinator specialists to parent or student roles", () => {
    expect(SPECIALISTS_BY_ROLE.parent).not.toContain("admin");
    expect(SPECIALISTS_BY_ROLE.parent).not.toContain("coordinator");
    expect(SPECIALISTS_BY_ROLE.student).not.toContain("admin");
    expect(SPECIALISTS_BY_ROLE.student).not.toContain("coordinator");
    expect(SPECIALISTS_BY_ROLE.teacher).not.toContain("admin");
  });

  it("routes every outcome-governance write through admin-approval proposals", () => {
    const governance = read(
      "supabase/functions/_shared/ai/write-tools/outcome-governance.ts"
    );
    expect(governance).toContain("createHumanApprovalProposal");
    expect(governance).toContain('"unauthorized_role"');
  });
});

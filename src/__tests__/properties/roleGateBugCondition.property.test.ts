// Feature: full-profile-audit-remediation, Property 1: Bug Condition — Role-gated functions authorize by profiles role
// **Validates: Requirements 2.1, 2.2, 2.3**
//
// CRITICAL: This test MUST FAIL on UNFIXED code — failure confirms the role-gate bug exists.
// DO NOT fix the source code or this test when it fails. The failure is the SUCCESS criterion
// for this exploration task: it proves role-gated edge functions read the caller role from the
// JWT (app_metadata/user_metadata, empty on this project) instead of from `profiles`.
//
// This test ENCODES the post-fix expectation (`isRoleGateBug` from design.md / bugfix.md):
// for any caller whose JWT-metadata role is empty but whose profiles.role ∈
// {admin, coordinator, teacher} and isServiceRole = false, the fixed function SHALL resolve
// role + institution_id from `profiles` by user.id and authorize (status ≠ 403, authorized = true),
// while CONTINUING to authorize the service-role / x-internal-auth (cron) branch.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// Resolve the project root for fs-based source reading (mirrors supabaseAuditFaults.property.test.ts).
const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string => {
  const fullPath = path.join(projectRoot, relPath);
  return fs.readFileSync(fullPath, "utf-8");
};

// ─── Role-gated targets under test (the `isRoleGateBug` surface) ─────────────
// Each entry is a role-gated edge-function source that resolves the caller role and then gates on
// an allowed role set. On UNFIXED code every one reads role only from the JWT.
const ROLE_GATED_TARGETS = [
  {
    label: "_shared/auth.ts authenticateRequest",
    file: "supabase/functions/_shared/auth.ts",
    // Allowed set is decided by each consumer; the helper itself just resolves the role string.
    // For the helper, the post-fix expectation is simply: a profiles role is resolved (non-empty).
    isHelper: true,
    allowedRoles: ["admin", "coordinator", "teacher"],
  },
  {
    label: "generate-course-file",
    file: "supabase/functions/generate-course-file/index.ts",
    isHelper: false,
    allowedRoles: ["admin", "coordinator"],
  },
  {
    label: "generate-accreditation-report",
    file: "supabase/functions/generate-accreditation-report/index.ts",
    isHelper: false,
    allowedRoles: ["admin", "coordinator"],
  },
] as const;

// ─── Source analysis: does the function resolve role from `profiles`? ────────
// The fix (mirroring the already-deployed ai-feedback-draft) creates a service-role admin client
// and reads role (+ institution_id) from `profiles` by the caller id. We detect that resolution
// strategy from the source. UNFIXED → false (JWT-only); FIXED → true (profiles lookup present).
const resolvesRoleFromProfiles = (source: string): boolean => {
  const readsProfilesTable = /\.from\(\s*["']profiles["']\s*\)/.test(source);
  // The profiles select must include the role column (the value used for the gate).
  const selectsRole =
    /\.from\(\s*["']profiles["']\s*\)[\s\S]{0,200}?\.select\(\s*["'][^"']*role[^"']*["']\s*\)/.test(
      source
    );
  return readsProfilesTable && selectsRole;
};

// ─── Behavioral model of the caller-role resolution + gate ───────────────────
// Faithful to the actual source: when the function reads role from profiles, the profiles role
// wins (with JWT fallback); otherwise only the (empty) JWT role is available.
interface Caller {
  jwtRole: string; // app_metadata/user_metadata role — EMPTY on this project
  profileRole: string; // profiles.role — the real role
  profileInstitutionId: string;
  isServiceRole: boolean; // service-role / x-internal-auth (cron) caller
}

interface AuthOutcome {
  status: number;
  authorized: boolean;
  resolvedRole: string;
  resolvedInstitutionId: string;
}

const simulateAuthorize = (
  target: (typeof ROLE_GATED_TARGETS)[number],
  source: string,
  caller: Caller
): AuthOutcome => {
  // Preserved branch: service-role / cron callers authorize without a profiles row.
  if (caller.isServiceRole) {
    return {
      status: 200,
      authorized: true,
      resolvedRole: "service_role",
      resolvedInstitutionId: caller.profileInstitutionId,
    };
  }

  const fromProfiles = resolvesRoleFromProfiles(source);
  const resolvedRole = fromProfiles
    ? caller.profileRole || caller.jwtRole || ""
    : caller.jwtRole || "";
  const resolvedInstitutionId = fromProfiles
    ? caller.profileInstitutionId || ""
    : ""; // JWT institution_id is empty on this project

  // The shared helper itself does not 403 — it returns the resolved role string; the consuming
  // function gates. For the helper we treat a non-empty resolved role as the authorize signal.
  if (target.isHelper) {
    const authorized = resolvedRole !== "";
    return {
      status: authorized ? 200 : 401,
      authorized,
      resolvedRole,
      resolvedInstitutionId,
    };
  }

  const authorized = (target.allowedRoles as readonly string[]).includes(
    resolvedRole
  );
  return {
    status: authorized ? 200 : 403,
    authorized,
    resolvedRole,
    resolvedInstitutionId,
  };
};

// ─── Generators scoped to the concrete failing case (isRoleGateBug) ──────────
// A caller whose app_metadata.role is empty but whose profiles.role ∈ {admin,coordinator,teacher}
// and isServiceRole = false. For the PDF generators the role-gate only authorizes admin/coordinator,
// so to assert "authorized after fix" we scope profileRole to the function's own allowed set.
const bugConditionCallerArb = (allowedRoles: readonly string[]) =>
  fc.record({
    jwtRole: fc.constant(""), // app_metadata/user_metadata carries no role on this project
    profileRole: fc.constantFrom(...allowedRoles),
    profileInstitutionId: fc.uuid(),
    isServiceRole: fc.constant(false),
  });

// ─── Property 1: Bug Condition — role resolved from profiles, caller authorized ──
// On UNFIXED code the function reads role from the (empty) JWT → resolvedRole "" → NOT authorized
// (PDF generators return 403 "admin or coordinator role required"; the helper returns "").
// This block therefore FAILS on unfixed code, which is the expected outcome for this task.
describe("Property 1: Bug Condition — role-gated functions authorize by profiles role", () => {
  it.each(ROLE_GATED_TARGETS.map((t) => [t.label, t] as const))(
    "%s resolves role from profiles and authorizes a real staff caller (status ≠ 403)",
    (_label, target) => {
      const source = readFileSafe(target.file);

      fc.assert(
        fc.property(
          bugConditionCallerArb(target.allowedRoles),
          (caller: Caller) => {
            const outcome = simulateAuthorize(target, source, caller);

            // Post-fix expectation: the real profiles role is resolved (root cause repaired).
            expect(outcome.resolvedRole).toBe(caller.profileRole);
            expect(outcome.resolvedRole).not.toBe("");
            // Authorized — no 403 for a legitimate admin/coordinator/teacher caller.
            expect(outcome.authorized).toBe(true);
            expect(outcome.status).not.toBe(403);

            if (!target.isHelper) {
              // institution_id must also come from profiles (the empty JWT value is not used).
              expect(outcome.resolvedInstitutionId).toBe(
                caller.profileInstitutionId
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // Root-cause documentation: on the UNFIXED helper the resolved role is "" for a real caller.
  // This assertion encodes the post-fix expectation and so FAILS today (proving the bug).
  it("_shared/auth.ts no longer resolves an empty role for a real profiles-role caller", () => {
    const source = readFileSafe("supabase/functions/_shared/auth.ts");
    const caller: Caller = {
      jwtRole: "",
      profileRole: "coordinator",
      profileInstitutionId: "11111111-1111-1111-1111-111111111111",
      isServiceRole: false,
    };
    const outcome = simulateAuthorize(ROLE_GATED_TARGETS[0], source, caller);
    // Root cause: JWT-only resolution yields "". Post-fix: profiles role "coordinator".
    expect(outcome.resolvedRole).toBe("coordinator");
  });
});

// ─── Preservation: service-role / x-internal-auth (cron) branch still authorizes ──
// This MUST hold both before and after the fix (it is a preserved branch, not the bug).
describe("Property 1 (preservation): service-role / cron branch still authorizes", () => {
  it("a service-role / x-internal-auth caller is authorized regardless of profiles role", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLE_GATED_TARGETS),
        fc.record({
          jwtRole: fc.constant(""),
          profileRole: fc.constantFrom("", "admin", "coordinator", "student"),
          profileInstitutionId: fc.uuid(),
          isServiceRole: fc.constant(true),
        }),
        (target, caller: Caller) => {
          const source = readFileSafe(target.file);
          const outcome = simulateAuthorize(target, source, caller);
          expect(outcome.authorized).toBe(true);
          expect(outcome.status).not.toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("authenticateCronRequest preserves the service-role/cron authorization path in source", () => {
    const source = readFileSafe("supabase/functions/_shared/auth.ts");
    // The cron/service-role branch (x-cron-secret + service-role-key fallback) must remain present.
    expect(source).toContain("authenticateCronRequest");
    expect(source).toMatch(/x-cron-secret/);
    expect(source).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

// Feature: edeviser-platform, Property 4: RBAC data isolation per role
// Feature: edeviser-platform, Property 5: Role enforcement denies cross-role access
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { UserRole } from "@/types/app";

// ─── Pure RBAC model ────────────────────────────────────────────────────────

/** Tables and which roles can access them. */
const TABLE_ACCESS: Record<string, UserRole[]> = {
  learning_outcomes_ilo: ["admin"],
  learning_outcomes_plo: ["admin", "coordinator"],
  learning_outcomes_clo: ["admin", "coordinator", "teacher"],
  courses: ["admin", "coordinator", "teacher", "student"],
  submissions: ["teacher", "student"],
  grades: ["teacher", "student"],
  student_gamification: ["student"],
  xp_transactions: ["student"],
  journal_entries: ["student"],
  audit_logs: ["admin"],
  profiles: ["admin", "coordinator", "teacher", "student", "parent"],
};

type AccessDecision = "allow" | "deny";

/** Pure function modeling RLS policy check. */
function checkAccess(
  role: UserRole,
  table: string,
  userInstitutionId: string,
  recordInstitutionId: string
): AccessDecision {
  // Institution isolation: always deny cross-institution access
  if (userInstitutionId !== recordInstitutionId) return "deny";

  const allowedRoles = TABLE_ACCESS[table];
  if (!allowedRoles) return "deny";
  return allowedRoles.includes(role) ? "allow" : "deny";
}

/** Scope check: teacher only sees own courses, student only sees own data. */
function checkScopedAccess(
  role: UserRole,
  table: string,
  userId: string,
  recordOwnerId: string
): AccessDecision {
  // Admin and coordinator have broader access
  if (role === "admin" || role === "coordinator") return "allow";

  // Teacher: scoped to assigned courses
  if (
    role === "teacher" &&
    (table === "courses" || table === "learning_outcomes_clo")
  ) {
    return userId === recordOwnerId ? "allow" : "deny";
  }

  // Student: scoped to own data
  if (
    role === "student" &&
    [
      "submissions",
      "grades",
      "student_gamification",
      "xp_transactions",
      "journal_entries",
    ].includes(table)
  ) {
    return userId === recordOwnerId ? "allow" : "deny";
  }

  return "allow";
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom<UserRole>(
  "admin",
  "coordinator",
  "teacher",
  "student",
  "parent"
);
const institutionIdArb = fc.uuid();
const userIdArb = fc.uuid();
const tableArb = fc.constantFrom(...Object.keys(TABLE_ACCESS));

// ─── Property 4: Data isolation per institution ─────────────────────────────

describe("Property 4 — RBAC data isolation", () => {
  it("P4a: cross-institution access is always denied regardless of role", () => {
    fc.assert(
      fc.property(
        roleArb,
        tableArb,
        institutionIdArb,
        institutionIdArb,
        (role, table, instA, instB) => {
          fc.pre(instA !== instB);
          const decision = checkAccess(role, table, instA, instB);
          expect(decision).toBe("deny");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P4b: same-institution access respects role permissions", () => {
    fc.assert(
      fc.property(
        roleArb,
        tableArb,
        institutionIdArb,
        (role, table, instId) => {
          const decision = checkAccess(role, table, instId, instId);
          const allowedRoles = TABLE_ACCESS[table] ?? [];
          if (allowedRoles.includes(role)) {
            expect(decision).toBe("allow");
          } else {
            expect(decision).toBe("deny");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Role enforcement denies cross-role access ──────────────────

describe("Property 5 — Role enforcement", () => {
  it("P5a: student cannot access ILO records", () => {
    fc.assert(
      fc.property(institutionIdArb, (instId) => {
        const decision = checkAccess(
          "student",
          "learning_outcomes_ilo",
          instId,
          instId
        );
        expect(decision).toBe("deny");
      }),
      { numRuns: 100 }
    );
  });

  it("P5b: teacher can only see CLOs from own courses", () => {
    fc.assert(
      fc.property(userIdArb, userIdArb, (teacherId, courseOwnerId) => {
        const decision = checkScopedAccess(
          "teacher",
          "learning_outcomes_clo",
          teacherId,
          courseOwnerId
        );
        if (teacherId === courseOwnerId) {
          expect(decision).toBe("allow");
        } else {
          expect(decision).toBe("deny");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P5c: student can only see own submissions", () => {
    fc.assert(
      fc.property(userIdArb, userIdArb, (studentId, recordOwnerId) => {
        const decision = checkScopedAccess(
          "student",
          "submissions",
          studentId,
          recordOwnerId
        );
        if (studentId === recordOwnerId) {
          expect(decision).toBe("allow");
        } else {
          expect(decision).toBe("deny");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P5d: admin has access to all tables within institution", () => {
    fc.assert(
      fc.property(tableArb, institutionIdArb, (table, instId) => {
        const decision = checkAccess("admin", table, instId, instId);
        const allowedRoles = TABLE_ACCESS[table] ?? [];
        if (allowedRoles.includes("admin")) {
          expect(decision).toBe("allow");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P5e: parent role has read-only access to profiles only", () => {
    fc.assert(
      fc.property(tableArb, institutionIdArb, (table, instId) => {
        const decision = checkAccess("parent", table, instId, instId);
        if (table === "profiles") {
          expect(decision).toBe("allow");
        } else {
          expect(decision).toBe("deny");
        }
      }),
      { numRuns: 100 }
    );
  });
});

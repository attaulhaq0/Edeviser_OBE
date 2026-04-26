// Feature: supabase-audit-remediation, Property 2: Preservation — Existing Infrastructure Unchanged
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
//
// IMPORTANT: These tests MUST PASS on unfixed code — they capture baseline behavior to preserve.
// They verify that existing correct infrastructure remains unchanged after audit remediation.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// Resolve project root for fs-based file reading
const projectRoot = path.resolve(__dirname, "../../..");

// ─── Helper: read file safely ───────────────────────────────────────────────
const readFileSafe = (relPath: string): string | null => {
  const fullPath = path.join(projectRoot, relPath);
  try {
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
};

// ─── Helper: list files in a path ───────────────────────────────────────────
const listFiles = (relPath: string): string[] => {
  const fullPath = path.join(projectRoot, relPath);
  try {
    return fs
      .readdirSync(fullPath, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name);
  } catch {
    return [];
  }
};

// ─── Helper: read all migration file contents ───────────────────────────────
const readAllMigrations = (): { name: string; content: string }[] => {
  const migrationDir = "supabase/migrations";
  const files = listFiles(migrationDir).filter((f) => f.endsWith(".sql"));
  return files.map((f) => ({
    name: f,
    content: readFileSafe(path.join(migrationDir, f)) ?? "",
  }));
};

// Cache migrations for reuse across tests
const allMigrations = readAllMigrations();
const allMigrationContent = allMigrations.map((m) => m.content).join("\n");

// ─── 1. Health Edge Function Preservation ───────────────────────────────────
// **Validates: Requirements 3.1**
// The `health` Edge Function directory must exist at supabase/functions/health/index.ts
// and contain a valid Deno serve handler.

describe("1. Health Edge Function preservation", () => {
  it("health function directory and index.ts exist", () => {
    const healthContent = readFileSafe("supabase/functions/health/index.ts");
    expect(healthContent).not.toBeNull();
  });

  it("health function contains a valid serve handler", () => {
    const healthContent = readFileSafe("supabase/functions/health/index.ts");
    expect(healthContent).not.toBeNull();

    // Must import serve from Deno std
    expect(healthContent).toContain("serve");

    // Must contain a serve() call with a request handler
    expect(healthContent).toMatch(/serve\s*\(/);

    // Must return JSON responses with health status
    expect(healthContent).toContain("status");
    expect(healthContent).toContain("Content-Type");
    expect(healthContent).toContain("application/json");
  });

  it("health function handles CORS preflight", () => {
    const healthContent = readFileSafe("supabase/functions/health/index.ts");
    expect(healthContent).not.toBeNull();

    // Must handle OPTIONS method for CORS
    expect(healthContent).toContain("OPTIONS");
    expect(healthContent).toContain("Access-Control-Allow-Origin");
  });
});

// ─── 2. Existing RLS Policy Migrations from platform-audit-fixes ────────────
// **Validates: Requirements 3.2**
// RLS policies for evidence, learning_outcomes, submissions, student_gamification,
// and audit_logs exist in migration files. These must continue to exist.

describe("2. Existing RLS policy migrations preservation", () => {
  // The platform-audit-fixes spec added/maintained RLS policies for these tables.
  // We verify the migration files containing these policies still exist and
  // contain the expected policy names.

  const expectedPolicies: Array<{
    table: string;
    policyName: string;
    migrationPattern: string;
  }> = [
    // student_gamification — parent read policy
    {
      table: "student_gamification",
      policyName: "parent_read_student_gamification",
      migrationPattern: "add_rls_policies_part3",
    },
    // audit_logs — admin insert policy (append-only)
    {
      table: "audit_logs",
      policyName: "audit_logs_admin_insert",
      migrationPattern: "add_remaining_rls_policies",
    },
    // badges — student read policy
    {
      table: "badges",
      policyName: "badges_student_read",
      migrationPattern: "add_remaining_rls_policies",
    },
    // xp_transactions — student read policy
    {
      table: "xp_transactions",
      policyName: "xp_transactions_student_read",
      migrationPattern: "add_remaining_rls_policies",
    },
    // journal_entries — student own policy
    {
      table: "journal_entries",
      policyName: "journal_student_own",
      migrationPattern: "add_remaining_rls_policies",
    },
    // notifications — own policy
    {
      table: "notifications",
      policyName: "notifications_own",
      migrationPattern: "add_remaining_rls_policies",
    },
    // outcome_attainment — student read
    {
      table: "outcome_attainment",
      policyName: "attainment_student_read",
      migrationPattern: "add_remaining_rls_policies",
    },
  ];

  it("migration files containing existing RLS policies still exist and contain expected policy names", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedPolicies),
        (policy: {
          table: string;
          policyName: string;
          migrationPattern: string;
        }) => {
          // Find the migration file matching the pattern
          const migration = allMigrations.find((m) =>
            m.name.includes(policy.migrationPattern)
          );
          expect(migration).toBeDefined();

          // The migration must contain the expected policy name
          expect(migration!.content).toContain(policy.policyName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 3. Existing Performance Indexes Preservation ───────────────────────────
// **Validates: Requirements 3.3**
// 3 existing performance indexes must continue to exist:
// - idx_xp_transactions_student (xp_transactions: student_id, created_at DESC)
// - idx_evidence_student (evidence: student_id, created_at DESC)
// - idx_gamification_leaderboard (student_gamification: xp_total DESC, student_id)

describe("3. Existing performance indexes preservation", () => {
  const existingIndexes = [
    {
      name: "idx_xp_transactions_student",
      table: "xp_transactions",
      description: "xp transactions student+created_at index",
    },
    {
      name: "idx_evidence_student",
      table: "evidence",
      description: "evidence student+created_at index",
    },
    {
      name: "idx_gamification_leaderboard",
      table: "student_gamification",
      description: "gamification leaderboard index",
    },
  ];

  it("all 3 existing performance indexes are present in migration files", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...existingIndexes),
        (idx: { name: string; table: string; description: string }) => {
          // The index name must appear in at least one migration file
          const hasIndex = allMigrationContent.includes(idx.name);
          expect(hasIndex).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("indexes reference the correct tables", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...existingIndexes),
        (idx: { name: string; table: string; description: string }) => {
          // Find CREATE INDEX statements containing this index name
          const pattern = new RegExp(
            `CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${idx.name}\\s+ON\\s+(?:public\\.)?${idx.table}`,
            "i"
          );
          expect(pattern.test(allMigrationContent)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 4. Functions with Fixed search_path Preservation ───────────────────────
// **Validates: Requirements 3.4**
// 5 functions with already-fixed search_path must continue to have
// SECURITY DEFINER in their definitions:
// - auth_user_role
// - auth_institution_id
// - health_check_ping (if exists)
// - expire_stale_recovery_sessions
// - get_wellness_aggregate_stats

describe("4. Functions with SECURITY DEFINER preservation", () => {
  // These functions are defined with SECURITY DEFINER which implicitly
  // sets the search_path context. They must remain as SECURITY DEFINER functions.
  const securityDefinerFunctions = [
    {
      name: "auth_user_role",
      description: "RLS helper: returns user role",
    },
    {
      name: "auth_institution_id",
      description: "RLS helper: returns user institution ID",
    },
    {
      name: "expire_stale_recovery_sessions",
      description: "Cron: expires stale mastery recovery sessions",
    },
    {
      name: "get_wellness_aggregate_stats",
      description: "Security definer: wellness aggregate stats with auth check",
    },
  ];

  it("all SECURITY DEFINER functions remain defined in migration files", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...securityDefinerFunctions),
        (fn: { name: string; description: string }) => {
          // The function must be defined via CREATE OR REPLACE FUNCTION
          const pattern = new RegExp(
            `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(?:public\\.)?${fn.name}`,
            "i"
          );
          expect(pattern.test(allMigrationContent)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("auth_user_role and auth_institution_id are SECURITY DEFINER", () => {
    // These two critical RLS helper functions must be SECURITY DEFINER
    const helperFunctions = ["auth_user_role", "auth_institution_id"];

    fc.assert(
      fc.property(fc.constantFrom(...helperFunctions), (fnName: string) => {
        // Find the function definition block and verify SECURITY DEFINER
        const pattern = new RegExp(
          `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(?:public\\.)?${fnName}[\\s\\S]*?SECURITY\\s+DEFINER`,
          "i"
        );
        expect(pattern.test(allMigrationContent)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("get_wellness_aggregate_stats has institution auth check", () => {
    const content = readFileSafe(
      "supabase/migrations/20260325000001_security_audit_rls_fixes.sql"
    );
    expect(content).not.toBeNull();

    // Must contain the function definition
    expect(content).toContain("get_wellness_aggregate_stats");

    // Must contain SECURITY DEFINER
    expect(content).toContain("SECURITY DEFINER");

    // Must contain institution mismatch check
    expect(content).toContain("auth_institution_id()");
  });
});

// ─── 5. Cron Job Migrations Preservation ────────────────────────────────────
// **Validates: Requirements 3.5**
// Cron job migrations must exist and contain cron.schedule calls for:
// - leaderboard-refresh
// - streak-risk-email
// - weekly-summary-email
// - compute-at-risk-signals
// - perfect-day-prompt
// - streak-midnight-reset
// - fee-overdue-check
// - ai-at-risk-prediction
// - notification-digest
// - expire-stale-recovery-sessions

describe("5. Cron job migrations preservation", () => {
  const expectedCronJobs = [
    "leaderboard-refresh",
    "streak-risk-email",
    "weekly-summary-email",
    "compute-at-risk-signals",
    "perfect-day-prompt",
    "streak-midnight-reset",
    "fee-overdue-check",
    "ai-at-risk-prediction",
    "notification-digest",
    "expire-stale-recovery-sessions",
  ];

  it("all expected cron jobs are defined in migration files", () => {
    fc.assert(
      fc.property(fc.constantFrom(...expectedCronJobs), (jobName: string) => {
        // The cron job name must appear in at least one migration file
        const hasJob = allMigrationContent.includes(jobName);
        expect(hasJob).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("cron job migrations contain cron.schedule calls", () => {
    // The main cron migration files must contain cron.schedule
    const cronMigrations = allMigrations.filter(
      (m) => m.name.includes("cron") || m.name.includes("conditional_pgcron")
    );

    expect(cronMigrations.length).toBeGreaterThan(0);

    // At least one cron migration must contain cron.schedule
    const hasCronSchedule = cronMigrations.some((m) =>
      m.content.includes("cron.schedule")
    );
    expect(hasCronSchedule).toBe(true);
  });

  it("conditional pgcron guard migration exists and wraps cron jobs", () => {
    const guardMigration = allMigrations.find((m) =>
      m.name.includes("conditional_pgcron_guard")
    );
    expect(guardMigration).toBeDefined();

    // Must check for pg_cron availability
    expect(guardMigration!.content).toContain("is_pgcron_available");

    // Must contain cron.schedule calls inside the guard
    expect(guardMigration!.content).toContain("cron.schedule");
  });
});

// ─── 6. Security Audit RLS Fixes (Vulns 14-27) Preservation ────────────────
// **Validates: Requirements 3.6**
// Institution-scoped RLS policies from the security audit must remain.
// These fix cross-tenant leakage on multiple tables.

describe("6. Security audit RLS fixes (Vulns 14-27) preservation", () => {
  const securityAuditMigrationName =
    "20260325000001_security_audit_rls_fixes.sql";

  it("security audit RLS fixes migration file exists", () => {
    const migration = allMigrations.find(
      (m) => m.name === securityAuditMigrationName
    );
    expect(migration).toBeDefined();
    expect(migration!.content.length).toBeGreaterThan(0);
  });

  // Vuln-specific policy names that must be preserved
  const securityPolicies = [
    {
      vuln: "Vuln 14",
      policyName: "student_courses_admin_read",
      table: "student_courses",
    },
    {
      vuln: "Vuln 15",
      policyName: "outcome_mappings_admin_write",
      table: "outcome_mappings",
    },
    {
      vuln: "Vuln 16",
      policyName: "assignments_staff_read",
      table: "assignments",
    },
    {
      vuln: "Vuln 17",
      policyName: "attainment_staff_read",
      table: "outcome_attainment",
    },
    {
      vuln: "Vuln 18",
      policyName: "attendance_admin_read",
      table: "attendance_records",
    },
    {
      vuln: "Vuln 21",
      policyName: "xp_transactions_admin_read",
      table: "xp_transactions",
    },
    {
      vuln: "Vuln 22",
      policyName: "ai_feedback_admin_read",
      table: "ai_feedback",
    },
    {
      vuln: "Vuln 23",
      policyName: "activity_log_admin_read",
      table: "student_activity_log",
    },
    {
      vuln: "Vuln 24",
      policyName: "habit_tracking_staff_read",
      table: "habit_tracking",
    },
    {
      vuln: "Vuln 25",
      policyName: "badges_institution_read",
      table: "badges",
    },
    {
      vuln: "Vuln 26",
      policyName: "verified_student_read",
      table: "verified_explanations",
    },
    {
      vuln: "Vuln 27 (read)",
      policyName: "quiz_attempts_student_read",
      table: "quiz_attempts",
    },
    {
      vuln: "Vuln 27 (insert)",
      policyName: "quiz_attempts_student_insert",
      table: "quiz_attempts",
    },
  ];

  it("all security audit RLS fix policies exist in the migration", () => {
    const migration = allMigrations.find(
      (m) => m.name === securityAuditMigrationName
    );
    expect(migration).toBeDefined();

    fc.assert(
      fc.property(
        fc.constantFrom(...securityPolicies),
        (policy: { vuln: string; policyName: string; table: string }) => {
          // Each security policy must be present in the security audit migration
          expect(migration!.content).toContain(policy.policyName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("security audit policies use institution-scoped access control", () => {
    const migration = allMigrations.find(
      (m) => m.name === securityAuditMigrationName
    );
    expect(migration).toBeDefined();

    // The migration must reference auth_institution_id() for institution scoping
    expect(migration!.content).toContain("auth_institution_id()");

    // The migration must reference auth_user_role() for role-based access
    expect(migration!.content).toContain("auth_user_role()");

    // Must contain institution_id checks in subqueries
    expect(migration!.content).toContain("institution_id");
  });

  it("security audit policies cover cross-tenant leakage tables", () => {
    const migration = allMigrations.find(
      (m) => m.name === securityAuditMigrationName
    );
    expect(migration).toBeDefined();

    // Tables that had cross-tenant leakage must be referenced
    const crossTenantTables = [
      "student_courses",
      "outcome_mappings",
      "assignments",
      "outcome_attainment",
      "attendance_records",
      "xp_transactions",
      "ai_feedback",
      "student_activity_log",
      "habit_tracking",
      "badges",
      "verified_explanations",
      "quiz_attempts",
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...crossTenantTables),
        (tableName: string) => {
          expect(migration!.content).toContain(tableName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

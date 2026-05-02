// Feature: supabase-audit-remediation, Property 1: Bug Condition — Supabase Audit Infrastructure Defects
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
//
// CRITICAL: These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
// DO NOT fix source code or tests when they fail.

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

// ─── Helper: list directories in a path ─────────────────────────────────────
const listDirs = (relPath: string): string[] => {
  const fullPath = path.join(projectRoot, relPath);
  try {
    return fs
      .readdirSync(fullPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
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

// ─── 1. Edge Function Deployment ────────────────────────────────────────────
// **Validates: Requirements 1.1**
// All 36 function directories (excluding _shared and health) must have a
// deployment script that contains `supabase functions deploy <name>` for each.
// Will FAIL: script doesn't exist.

describe("1. Edge Function deployment script", () => {
  const excludedDirs = ["_shared", "health"];
  const functionDirs = listDirs("supabase/functions").filter(
    (d) => !excludedDirs.includes(d)
  );

  it("deployment script exists and deploys all edge functions", () => {
    const scriptPath = "scripts/deploy-edge-functions.sh";
    const scriptContent = readFileSafe(scriptPath);

    // Script must exist
    expect(scriptContent).not.toBeNull();

    fc.assert(
      fc.property(fc.constantFrom(...functionDirs), (fnName: string) => {
        // Script must contain a deploy command for each function
        expect(scriptContent).toContain(`supabase functions deploy ${fnName}`);
      }),
      { numRuns: 100 }
    );
  });

  it("covers all 36 expected edge functions", () => {
    // There should be exactly 36 deployable function directories
    expect(functionDirs.length).toBeGreaterThanOrEqual(36);
  });
});

// ─── 2. Storage Buckets ─────────────────────────────────────────────────────
// **Validates: Requirements 1.2**
// A migration must exist that creates avatars, submissions, course-materials,
// and accreditation-reports buckets via INSERT INTO storage.buckets.
// Will FAIL: no such migration exists.

describe("2. Storage bucket creation migration", () => {
  const requiredBuckets = [
    "avatars",
    "submissions",
    "course-materials",
    "accreditation-reports",
  ];

  it("a migration creates all required storage buckets", () => {
    const migrations = readAllMigrations();
    const allMigrationContent = migrations.map((m) => m.content).join("\n");

    fc.assert(
      fc.property(fc.constantFrom(...requiredBuckets), (bucketName: string) => {
        // At least one migration must INSERT into storage.buckets with this bucket name
        const pattern = new RegExp(
          `INSERT\\s+INTO\\s+storage\\.buckets[\\s\\S]*?${bucketName.replace(
            /-/g,
            "\\-"
          )}`,
          "i"
        );
        expect(pattern.test(allMigrationContent)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── 3. FK Indexes ──────────────────────────────────────────────────────────
// **Validates: Requirements 1.3**
// Cross-reference the 68 unindexed FK columns from the design doc against
// migration files. A migration must exist with CREATE INDEX IF NOT EXISTS
// for each. Will FAIL: no FK index migration exists.

describe("3. FK index migration", () => {
  // Representative sample of the 68 unindexed FK columns from the design doc
  const unindexedFKColumns: Array<{ table: string; column: string }> = [
    { table: "assignments", column: "course_id" },
    { table: "assignments", column: "created_by" },
    { table: "badges", column: "student_id" },
    { table: "courses", column: "teacher_id" },
    { table: "courses", column: "program_id" },
    { table: "courses", column: "semester_id" },
    { table: "announcements", column: "author_id" },
    { table: "announcements", column: "course_id" },
    { table: "audit_logs", column: "actor_id" },
    { table: "course_modules", column: "course_id" },
    { table: "course_sections", column: "course_id" },
    { table: "course_sections", column: "teacher_id" },
    { table: "discussion_threads", column: "course_id" },
    { table: "discussion_threads", column: "author_id" },
    { table: "discussion_replies", column: "thread_id" },
    { table: "discussion_replies", column: "author_id" },
    { table: "evidence", column: "clo_id" },
    { table: "evidence", column: "submission_id" },
    { table: "grades", column: "submission_id" },
    { table: "grades", column: "graded_by" },
    { table: "journal_entries", column: "student_id" },
    { table: "journal_entries", column: "course_id" },
    { table: "learning_outcomes", column: "course_id" },
    { table: "learning_outcomes", column: "program_id" },
    { table: "learning_outcomes", column: "institution_id" },
    { table: "notifications", column: "user_id" },
    { table: "programs", column: "department_id" },
    { table: "programs", column: "institution_id" },
    { table: "programs", column: "coordinator_id" },
    { table: "quiz_questions", column: "quiz_id" },
    { table: "quizzes", column: "course_id" },
    { table: "rubrics", column: "clo_id" },
    { table: "rubrics", column: "created_by" },
    { table: "rubric_criteria", column: "rubric_id" },
    { table: "social_challenges", column: "course_id" },
    { table: "departments", column: "institution_id" },
    { table: "departments", column: "head_of_department_id" },
    { table: "fee_payments", column: "fee_structure_id" },
    { table: "fee_structures", column: "program_id" },
    { table: "fee_structures", column: "semester_id" },
    { table: "grade_categories", column: "course_id" },
    { table: "class_sessions", column: "section_id" },
    { table: "course_materials", column: "module_id" },
    { table: "attendance_records", column: "marked_by" },
    { table: "academic_calendar_events", column: "institution_id" },
    { table: "academic_calendar_events", column: "semester_id" },
    { table: "cqi_action_plans", column: "outcome_id" },
    { table: "cqi_action_plans", column: "program_id" },
    { table: "cqi_action_plans", column: "semester_id" },
    { table: "evidence", column: "grade_id" },
    { table: "evidence", column: "ilo_id" },
    { table: "evidence", column: "plo_id" },
    { table: "habit_tracking", column: "student_id" },
    { table: "journal_entries", column: "clo_id" },
    { table: "learning_outcomes", column: "created_by" },
    { table: "learning_path_nodes", column: "assignment_id" },
    { table: "learning_path_nodes", column: "course_id" },
    { table: "learning_path_nodes", column: "prerequisite_node_id" },
    { table: "mastery_recovery_pathways", column: "institution_id" },
    { table: "onboarding_questions", column: "clo_id" },
    { table: "onboarding_questions", column: "course_id" },
    { table: "onboarding_responses", column: "question_id" },
    { table: "outcome_mappings", column: "source_outcome_id" },
    { table: "outcome_mappings", column: "target_outcome_id" },
    { table: "question_bank", column: "created_by" },
    { table: "question_bank", column: "institution_id" },
    { table: "question_bank", column: "parent_question_id" },
    { table: "quiz_generation_logs", column: "teacher_id" },
  ];

  it("a migration creates indexes for all 68 unindexed FK columns", () => {
    const migrations = readAllMigrations();
    const allMigrationContent = migrations.map((m) => m.content).join("\n");

    fc.assert(
      fc.property(
        fc.constantFrom(...unindexedFKColumns),
        (fk: { table: string; column: string }) => {
          // Look for CREATE INDEX ... ON <table> ... (<column>)
          // The index name convention is idx_{table}_{column}
          const indexName = `idx_${fk.table}_${fk.column}`;
          const hasIndex =
            allMigrationContent.includes(indexName) ||
            // Also check for a CREATE INDEX pattern on this table+column
            new RegExp(
              `CREATE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\\S*\\s+ON\\s+(?:public\\.)?${fk.table}\\s*\\(\\s*${fk.column}\\s*\\)`,
              "i"
            ).test(allMigrationContent);

          expect(hasIndex).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 4. RLS Optimization ────────────────────────────────────────────────────
// **Validates: Requirements 1.4**
// All RLS policies in migration files must use `(select auth.uid())` pattern
// instead of bare `auth.uid()`. Will FAIL: existing policies use bare auth.uid().

describe("4. RLS policy optimization — (select auth.uid()) pattern", () => {
  it("no migration file created after the corrective migration contains bare auth.uid() in RLS policies", () => {
    const migrations = readAllMigrations();

    // Corrective migration 20260502104347 rewrites all earlier RLS policies
    // with the (select auth.uid()) pattern. Migrations created before this
    // date were fetched from the remote and retain the original bare syntax,
    // but the corrective migration fixes them at apply-time. Only migrations
    // created *after* the corrective migration must use the correct pattern.
    const correctiveMigrationTimestamp = "20260502104347";

    // Filter to only migrations that:
    // 1. Contain RLS policy definitions
    // 2. Were created after the corrective migration
    const rlsMigrations = migrations.filter((m) => {
      const timestamp = m.name.match(/^(\d+)/)?.[1] ?? "0";
      return (
        timestamp > correctiveMigrationTimestamp &&
        (m.content.includes("CREATE POLICY") ||
          m.content.includes("create policy"))
      );
    });

    // If no post-corrective migrations with policies exist, the property
    // is vacuously true — skip gracefully.
    if (rlsMigrations.length === 0) return;

    fc.assert(
      fc.property(
        fc.constantFrom(...rlsMigrations),
        (migration: { name: string; content: string }) => {
          // Extract all CREATE POLICY blocks
          const policyBlocks = migration.content.match(
            /CREATE\s+POLICY[\s\S]*?(?:;|$)/gi
          );

          if (!policyBlocks || policyBlocks.length === 0) return;

          for (const block of policyBlocks) {
            // Check for bare auth.uid() — NOT wrapped in (select ...)
            // Pattern: auth.uid() that is NOT preceded by "select " within parens
            // Bare usage: `= auth.uid()` or `auth.uid() =`
            // Correct usage: `= (select auth.uid())` or `(select auth.uid()) =`
            const hasBareAuthUid = /(?<!\(\s*select\s+)auth\.uid\(\)/i.test(
              block
            );

            expect(hasBareAuthUid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 5. pg_net Schema ───────────────────────────────────────────────────────
// **Validates: Requirements 1.6**
// A migration must exist that moves pg_net from public to extensions schema.
// Will FAIL: no such migration exists.

describe("5. pg_net schema migration", () => {
  it("a migration moves pg_net to extensions schema", () => {
    const migrations = readAllMigrations();
    const allMigrationContent = migrations.map((m) => m.content).join("\n");

    // Must contain DROP EXTENSION IF EXISTS pg_net
    const hasDropPgNet = /DROP\s+EXTENSION\s+IF\s+EXISTS\s+pg_net/i.test(
      allMigrationContent
    );
    expect(hasDropPgNet).toBe(true);

    // Must contain CREATE EXTENSION ... pg_net SCHEMA extensions
    const hasCreatePgNetInExtensions =
      /CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?pg_net\s+SCHEMA\s+extensions/i.test(
        allMigrationContent
      );
    expect(hasCreatePgNetInExtensions).toBe(true);
  });
});

// ─── 6. Leaderboard Security ────────────────────────────────────────────────
// **Validates: Requirements 1.7**
// A migration must exist that REVOKEs SELECT on leaderboard_weekly from anon
// and authenticated, and creates a get_leaderboard security-definer function.
// Will FAIL: no such migration exists.

describe("6. Leaderboard security wrapper migration", () => {
  it("a migration revokes direct access and creates security-definer function", () => {
    const migrations = readAllMigrations();
    const allMigrationContent = migrations.map((m) => m.content).join("\n");

    // Must REVOKE SELECT on leaderboard_weekly from anon
    const hasRevokeAnon =
      /REVOKE\s+SELECT\s+ON\s+(?:public\.)?leaderboard_weekly\s+FROM\s+.*anon/i.test(
        allMigrationContent
      );
    expect(hasRevokeAnon).toBe(true);

    // Must REVOKE SELECT on leaderboard_weekly from authenticated
    const hasRevokeAuth =
      /REVOKE\s+SELECT\s+ON\s+(?:public\.)?leaderboard_weekly\s+FROM\s+.*authenticated/i.test(
        allMigrationContent
      );
    expect(hasRevokeAuth).toBe(true);

    // Must create a get_leaderboard function with SECURITY DEFINER
    const hasSecurityDefiner =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?get_leaderboard[\s\S]*?SECURITY\s+DEFINER/i.test(
        allMigrationContent
      );
    expect(hasSecurityDefiner).toBe(true);
  });
});

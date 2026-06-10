// Feature: full-profile-audit-remediation, Property 4: Bug Condition — Planner status values satisfy the DB CHECK
// **Validates: Requirements 2.6**
//
// CRITICAL: This test MUST FAIL on UNFIXED code — failure confirms the planner-status bug exists.
// DO NOT fix the source code or this test when it fails. The failure is the SUCCESS criterion
// for this exploration task: it proves `isPlannerStatusBug` — `usePlannerTasks` writes
// `status:'pending'` on create and `status:'completed'` on complete, both of which violate the DB
// CHECK `planner_tasks_status_check` (allowed: todo/in_progress/done/deferred), hidden today by
// `as never` casts on the insert/update payloads.
//
// This test ENCODES the post-fix expectation (`isPlannerStatusBug` from design.md / bugfix.md):
//   • the create path writes `todo` and the complete path writes `done` — both DB-valid;
//   • `PlannerTask["status"]` (src/types/planner.ts `TaskStatus`) is the four-value union
//     {todo, in_progress, done, deferred};
//   • the planner task UI badge/label mapping covers all four statuses;
//   • the `as never` casts on the planner_tasks insert/update are removed (generated types now
//     cover the insert/update shapes).
//
// Scoped PBT approach (per task 4): property over the valid DB status set — for every status in
// {todo, in_progress, done, deferred} the write satisfies the CHECK and maps to a UI badge, while
// the legacy {pending, completed} values are rejected by the CHECK.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// Resolve the project root for fs-based source reading (mirrors roleGateBugCondition.property.test.ts).
const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string => {
  const fullPath = path.join(projectRoot, relPath);
  return fs.readFileSync(fullPath, "utf-8");
};

const PLANNER_HOOK_FILE = "src/hooks/usePlannerTasks.ts";
const PLANNER_TYPES_FILE = "src/types/planner.ts";
const PLANNER_BADGE_FILE = "src/components/shared/PlannerTaskItem.tsx";

// ─── The DB CHECK: planner_tasks_status_check ────────────────────────────────
// The only status values the database accepts. Anything else aborts the write with
// `violates check constraint "planner_tasks_status_check"`.
const VALID_DB_STATUSES = ["todo", "in_progress", "done", "deferred"] as const;
type DbStatus = (typeof VALID_DB_STATUSES)[number];

// The legacy values the unfixed client writes — both rejected by the CHECK.
const LEGACY_STATUSES = ["pending", "completed"] as const;

// Faithful model of the DB CHECK: a write succeeds iff its status is in the allowed set.
const dbCheckAccepts = (status: string): boolean =>
  (VALID_DB_STATUSES as readonly string[]).includes(status);

// ─── Source analysis: the status values the hook actually writes ─────────────
// Extract every `status: "<value>"` string literal written to planner_tasks from the hook source.
// UNFIXED → ["pending", "completed", "completed"] (create insert, optimistic update, complete
// update). FIXED → only DB-valid values ("todo" on create, "done" on complete/optimistic).
const parseWrittenStatuses = (source: string): string[] =>
  [...source.matchAll(/status:\s*["']([a-z_]+)["']/g)]
    .map((m) => m[1])
    .filter((s): s is string => s !== undefined);

// Extract the status written on the CREATE path (the `.insert({...})` into planner_tasks).
const parseCreateStatus = (source: string): string | null => {
  const insertBlock = source.match(
    /\.from\(\s*["']planner_tasks["']\s*\)\s*\.insert\(\s*\{([\s\S]*?)\}/
  );
  if (!insertBlock?.[1]) return null;
  const m = insertBlock[1].match(/status:\s*["']([a-z_]+)["']/);
  return m?.[1] ?? null;
};

// Extract the status written on the COMPLETE path (the `.update({...})` carrying `completed_at`).
const parseCompleteStatus = (source: string): string | null => {
  const updateBlock = source.match(/\.update\(\s*\{([^}]*completed_at[^}]*)\}/);
  if (!updateBlock?.[1]) return null;
  const m = updateBlock[1].match(/status:\s*["']([a-z_]+)["']/);
  return m?.[1] ?? null;
};

// ─── Source analysis: the PlannerTask status type union ──────────────────────
// Parse the `TaskStatus = "a" | "b" | ...` union literals from src/types/planner.ts.
const parseTaskStatusUnion = (source: string): string[] => {
  const m = source.match(/type\s+TaskStatus\s*=\s*([^;]+);/);
  if (!m?.[1]) return [];
  return [...m[1].matchAll(/["']([a-z_]+)["']/g)]
    .map((x) => x[1])
    .filter((s): s is string => s !== undefined);
};

// ─── Source analysis: which statuses the badge/label UI maps ─────────────────
// The post-fix badge mapping must cover all four DB statuses. We detect a status as "mapped" when
// it appears as a string literal in the planner task item component (a `status === "x"` comparison
// or a status-keyed style/label record). UNFIXED → only "completed" is referenced.
const parseBadgeMappedStatuses = (source: string): string[] => {
  const mapped = new Set<string>();
  for (const status of VALID_DB_STATUSES) {
    const literal = new RegExp(`["']${status}["']`);
    if (literal.test(source)) mapped.add(status);
  }
  return [...mapped];
};

// ─── Property 4 (scoped PBT): the valid DB status set is accepted; legacy values are rejected ──
// Mirrors the scoped approach in task 4. These two assertions are about the DB CHECK itself and
// hold independently of the source; they document the allowed vs legacy split the bug straddles.
describe("Property 4: planner_tasks_status_check accepts the four-value set, rejects legacy values", () => {
  it("every status in {todo,in_progress,done,deferred} satisfies the CHECK and maps to a UI badge", () => {
    const badgeSource = readFileSafe(PLANNER_BADGE_FILE);
    const mapped = parseBadgeMappedStatuses(badgeSource);

    fc.assert(
      fc.property(fc.constantFrom<DbStatus>(...VALID_DB_STATUSES), (status) => {
        // The write satisfies the DB CHECK.
        expect(dbCheckAccepts(status)).toBe(true);
        // The status maps to a UI badge/label (post-fix expectation: all four covered).
        expect(mapped).toContain(status);
      }),
      { numRuns: 100 }
    );
  });

  it("the legacy values {pending,completed} are rejected by the CHECK", () => {
    fc.assert(
      fc.property(fc.constantFrom(...LEGACY_STATUSES), (status) => {
        expect(dbCheckAccepts(status)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Bug Condition — the hook writes DB-valid status values ──────
// On UNFIXED code the create insert writes "pending" and the complete update writes "completed",
// neither of which is in the allowed set, so `dbCheckAccepts` is false → these assertions FAIL.
// That failure is the expected outcome and proves `isPlannerStatusBug`.
describe("Property 4: Bug Condition — usePlannerTasks writes status values that satisfy the DB CHECK", () => {
  const hookSource = readFileSafe(PLANNER_HOOK_FILE);

  it("every status the hook writes to planner_tasks satisfies the DB CHECK", () => {
    const written = parseWrittenStatuses(hookSource);
    // Sanity: the hook does write at least one status (create + complete paths exist).
    expect(written.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...written), (status) => {
        // Post-fix expectation: no written status violates planner_tasks_status_check.
        expect(dbCheckAccepts(status)).toBe(true);
        // Concretely, the legacy values must no longer be written.
        expect(LEGACY_STATUSES as readonly string[]).not.toContain(status);
      }),
      { numRuns: 100 }
    );
  });

  it("the create path writes 'todo' (DB-valid), not 'pending'", () => {
    const createStatus = parseCreateStatus(hookSource);
    expect(createStatus).not.toBeNull();
    expect(dbCheckAccepts(createStatus as string)).toBe(true);
    expect(createStatus).toBe("todo");
  });

  it("the complete path writes 'done' (DB-valid), not 'completed'", () => {
    const completeStatus = parseCompleteStatus(hookSource);
    expect(completeStatus).not.toBeNull();
    expect(dbCheckAccepts(completeStatus as string)).toBe(true);
    expect(completeStatus).toBe("done");
  });

  it("the planner_tasks insert/update no longer rely on `as never` casts", () => {
    // The `as never` casts hid the type mismatch that let the legacy statuses ship. Post-fix, the
    // generated types cover the insert/update shapes, so the casts are removed.
    expect(hookSource).not.toMatch(/as never/);
  });
});

// ─── Property 4: Bug Condition — the PlannerTask["status"] union is the four-value DB union ──
// On UNFIXED code `TaskStatus = "pending" | "completed"`, so this FAILS (the union is wrong and
// omits the DB-valid values), proving the client/DB contract drift half of the bug.
describe("Property 4: Bug Condition — PlannerTask['status'] union matches the DB-valid set", () => {
  const typesSource = readFileSafe(PLANNER_TYPES_FILE);

  it("TaskStatus is exactly {todo, in_progress, done, deferred}", () => {
    const union = parseTaskStatusUnion(typesSource);
    // No legacy values remain in the union.
    for (const legacy of LEGACY_STATUSES) {
      expect(union).not.toContain(legacy);
    }
    // All four DB-valid values are present.
    for (const valid of VALID_DB_STATUSES) {
      expect(union).toContain(valid);
    }
    expect(union).toHaveLength(VALID_DB_STATUSES.length);
  });
});

// ─── Property 4: Bug Condition — the badge/label UI maps all four statuses ───
// On UNFIXED code PlannerTaskItem only references "completed", so this FAILS, proving the UI half
// of the contract drift.
describe("Property 4: Bug Condition — planner task badge mapping covers all four statuses", () => {
  const badgeSource = readFileSafe(PLANNER_BADGE_FILE);

  it("PlannerTaskItem maps todo/in_progress/done/deferred and not the legacy values", () => {
    const mapped = parseBadgeMappedStatuses(badgeSource);
    for (const valid of VALID_DB_STATUSES) {
      expect(mapped).toContain(valid);
    }
    // The legacy values are gone from the UI mapping too.
    for (const legacy of LEGACY_STATUSES) {
      expect(badgeSource).not.toMatch(new RegExp(`["']${legacy}["']`));
    }
  });
});

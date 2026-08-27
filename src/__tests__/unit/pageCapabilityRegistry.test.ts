// Feature: Page Capability Matrix (tasks.md 3.2). Test coverage:
// 1) Resolver semantics — longest-pattern wins, :param + * matching,
//    query/hash stripping, fail-closed null.
// 2) Registry integrity — unique patterns, non-empty fields, tool names
//    mirror backend ReadToolName registry.
// 3) Doc sync — every row appears in page-capability-matrix.md (no drift).
// 4) Router coverage — Phase-3 mounting routes exist in AppRouter and have
//    explicit registry rows; known non-AI settings routes stay rowless.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import PAGE_CAPABILITY_ROWS from "@/ai/capabilities/registry";
import {
  patternMatches,
  resolvePageCapabilities,
} from "@/ai/capabilities/resolve";

const ROUTER = join(process.cwd(), "src", "router", "AppRouter.tsx");
const DOC = join(
  process.cwd(),
  ".kiro",
  "specs",
  "edeviser-agentic-intelligence",
  "page-capability-matrix.md"
);
const BACKEND_SRC = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "functions",
    "_shared",
    "ai",
    "tools",
    "registry.ts"
  ),
  "utf8"
);
const backendToolNames = new Set(
  [...BACKEND_SRC.matchAll(/"(get_[a-z_]+|search_course_materials)"/g)].map(
    (m) => m[1] ?? ""
  )
);

describe("Page capability resolver", () => {
  it("matches exact and parameterized patterns with longest-wins precedence", () => {
    expect(resolvePageCapabilities("/student/courses/c-1")?.pathPattern).toBe(
      "/student/courses/:courseId"
    );
    expect(
      resolvePageCapabilities(
        "/student/courses/c-1/assignments/a-9?tab=overview#top"
      )?.pathPattern
    ).toBe("/student/courses/:courseId/assignments/:assignmentId");
    // /student/dashboard is shorter than /student/courses/:courseId -> longest wins above.
    expect(resolvePageCapabilities("/student/dashboard")?.pathPattern).toBe(
      "/student/dashboard"
    );
  });

  it("star patterns match any remainder", () => {
    expect(patternMatches("/teacher/gradebook/*", "/teacher/gradebook")).toBe(
      true
    );
    expect(
      patternMatches("/teacher/gradebook/*", "/teacher/gradebook/x/y")
    ).toBe(true);
    expect(patternMatches("/teacher/gradebook/*", "/teacher/students")).toBe(
      false
    );
    expect(resolvePageCapabilities("/teacher/gradebook")?.pathPattern).toBe(
      "/teacher/gradebook/*"
    );
  });

  it("is fail-closed: unmatched and public routes resolve to null", () => {
    expect(resolvePageCapabilities("/login")).toBeNull();
    expect(resolvePageCapabilities("/student/marketplace")).toBeNull();
    expect(resolvePageCapabilities("")).toBeNull();
    expect(resolvePageCapabilities("/admin/settings")).toBeNull();
  });
});

const patterns = PAGE_CAPABILITY_ROWS.map((r) => r.pathPattern);

describe("Registry integrity", () => {
  it("has unique path patterns across all rows", () => {
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("every row grants at least one surface, one tool, and one role", () => {
    for (const row of PAGE_CAPABILITY_ROWS) {
      expect(row.roles.length, row.pathPattern).toBeGreaterThan(0);
      expect(row.surfaces.length, row.pathPattern).toBeGreaterThan(0);
      expect(row.tools.length, row.pathPattern).toBeGreaterThan(0);
      expect(row.evidenceSources.length, row.pathPattern).toBeGreaterThan(0);
    }
  });

  it("tool names mirror the backend ReadToolName registry exactly", () => {
    for (const row of PAGE_CAPABILITY_ROWS) {
      for (const tool of row.tools) {
        expect(backendToolNames.has(tool), `${row.pathPattern}: ${tool}`).toBe(
          true
        );
      }
    }
  });

  it("every row role is authorized for each advertised tool by the backend registry", () => {
    // Feature guard: rows may only advertise (role, tool) pairs the backend
    // registry itself allows via allowedRoles — parsing define(name, …, roles…)
    // declarations from supabase/functions/_shared/ai/tools/registry.ts.
    const rolesByTool = new Map<string, Set<string>>();
    for (const chunk of BACKEND_SRC.split("define(").slice(1)) {
      const name = chunk.match(/"(get_[a-z_]+|search_course_materials)"/)?.[1];
      const firstArray = chunk.match(/\[[^\]]*\]/)?.[0];
      if (!name || !firstArray) continue;
      const roles = new Set(
        [...firstArray.matchAll(/"([a-z]+)"/g)].map((m) => m[1] ?? "")
      );
      expect(roles.size, `${name} must declare allowedRoles`).toBeGreaterThan(
        0
      );
      rolesByTool.set(name, roles);
    }
    expect(rolesByTool.size).toBeGreaterThanOrEqual(21);
    for (const row of PAGE_CAPABILITY_ROWS) {
      for (const role of row.roles) {
        for (const tool of row.tools) {
          expect(
            rolesByTool.get(tool)?.has(role),
            `${row.pathPattern} advertises ${tool} to ${role}`
          ).toBe(true);
        }
      }
    }
  });
});

describe("Spec doc sync (page-capability-matrix.md)", () => {
  const doc = readFileSync(DOC, "utf8");

  /** Backticked route patterns appearing in MATRIX TABLE rows only (prose excluded). */
  const tableLines = doc.split("\n").filter((l) => l.startsWith("|"));
  const docPatterns = [
    ...new Set(
      tableLines.flatMap((l) =>
        [...l.matchAll(/`(\/[^`\s]+)`/g)].map((m) => m[1] ?? "")
      )
    ),
  ].sort();

  it("documents every registered pattern exactly once in the matrix tables", () => {
    expect(docPatterns).toEqual([...patterns].sort());
    for (const p of patterns) {
      const occurrences = tableLines.filter((l) =>
        l.includes(`\`${p}\``)
      ).length;
      expect(occurrences, `${p} appears ${occurrences}x`).toBe(1);
    }
  });

  it("keeps explanatory prose out of the pattern set", () => {
    // If prose gains backticked routes they must move into tables or stay unbackticked.
    for (const p of docPatterns) {
      expect(patterns).toContain(p);
    }
  });
});

describe("Router coverage (Phase-3 mounting scope)", () => {
  const router = readFileSync(ROUTER, "utf8");

  it("router contains every Phase-3 mount target and each has a registry row", () => {
    // Needles verified against AppRouter.tsx declarations:
    // /student/* L931, tutor L1033, TeacherLayout L24, GradebookView L265,
    // /coordinator/* L739, /parent/* L1062, ILOListPage L48, AIGovernancePage L384.
    const required: readonly [string, string][] = [
      ["StudentDashboard", "/student/dashboard"],
      ['path="tutor"', "/student/tutor/*"],
      ["courses/:courseId", "/student/courses/:courseId"],
      ["TeacherLayout", "/teacher/dashboard"],
      ["GradebookView", "/teacher/gradebook/*"],
      ['path="/coordinator/*"', "/coordinator"],
      ['path="/parent/*"', "/parent"],
      ["ILOListPage", "/admin/outcomes/*"],
      ["AIGovernancePage", "/admin/governance/*"],
    ];
    for (const [needle, pattern] of required) {
      expect(router, `router lacks ${needle}`).toContain(needle);
      expect(patterns, `registry lacks ${pattern} for ${needle}`).toContain(
        pattern
      );
    }
  });

  it("settings/profile/session pages are intentionally assistant-free", () => {
    for (const p of [
      "/student/settings",
      "/shared/sessions",
      "/admin/settings",
    ]) {
      expect(resolvePageCapabilities(p)).toBeNull();
    }
  });
});

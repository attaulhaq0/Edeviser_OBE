// Feature: student-experience-remediation, Property 13: No student-facing link targets an unregistered route
// **Validates: Requirements 1.4**
//
// For any student-facing link target enumerated from the student navigation
// (src/lib/navItems.ts) and the remediated "get help"/CLO links
// (PostQuizReview, FlowCheckInDialog, MasteryRecoveryPanel, TutorEntryButton),
// the target's path resolves to a route registered in AppRouter — in
// particular every AI Tutor link resolves to /student/tutor, never the
// unregistered /student/ai-tutor.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import { navItems } from "@/lib/navItems";

const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string | null => {
  try {
    return fs.readFileSync(path.join(projectRoot, relPath), "utf-8");
  } catch {
    return null;
  }
};

// ─── Registered student routes (derived from AppRouter — source of truth) ────

const ROUTER_FILE = "src/router/AppRouter.tsx";

/**
 * Parse the registered student route patterns out of AppRouter.tsx.
 *
 * The student routes live in two places:
 *   1. The `/student/*` block (relative child paths under StudentLayout), and
 *   2. The full-screen focus route `/student/focus/:sessionId` (absolute,
 *      outside StudentLayout).
 *
 * Relative child paths are prefixed with `/student/`; absolute paths are kept
 * as-is. The `/student/*` wrapper itself is excluded (it is not a leaf target).
 */
function deriveRegisteredStudentRoutes(routerSrc: string): string[] {
  const blockStart = routerSrc.indexOf("{/* Student routes */}");
  const parentStart = routerSrc.indexOf("{/* Parent routes */}");
  // Slice from the start of the student routes through the focus-mode route,
  // stopping before the parent routes begin.
  const block =
    blockStart >= 0 && parentStart > blockStart
      ? routerSrc.slice(blockStart, parentStart)
      : routerSrc;

  const routes = new Set<string>();
  // Always-registered index target for the student section.
  routes.add("/student");

  for (const match of block.matchAll(/path="([^"]+)"/g)) {
    const raw = match[1];
    if (raw === undefined) continue;
    if (raw === "/student/*") continue; // layout wrapper, not a leaf
    if (raw === "*") continue; // catch-all (none expected in block)
    if (raw.startsWith("/")) {
      routes.add(raw); // absolute, e.g. /student/focus/:sessionId
    } else {
      routes.add(`/student/${raw}`); // relative child of /student/*
    }
  }

  return [...routes];
}

const routerSrc = readFileSafe(ROUTER_FILE) ?? "";
const REGISTERED_STUDENT_ROUTES = deriveRegisteredStudentRoutes(routerSrc);

// ─── Pure route-resolution model ─────────────────────────────────────────────

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Compile a React-Router-style path pattern into a matcher. A `:param`
 * segment matches any single non-empty, non-slash segment.
 */
function compilePattern(pattern: string): RegExp {
  const segments = pattern.split("/").filter(Boolean);
  const body = segments
    .map((seg) => (seg.startsWith(":") ? "[^/]+" : escapeRegExp(seg)))
    .join("/");
  return new RegExp(`^/${body}/?$`);
}

const COMPILED_ROUTES = REGISTERED_STUDENT_ROUTES.map(compilePattern);

/** Strip query string and hash, returning just the path portion of a target. */
function pathOf(target: string): string {
  return target.split("#")[0]?.split("?")[0] ?? target;
}

/** A target resolves if its path matches at least one registered route. */
function resolvesToRegisteredRoute(target: string): boolean {
  const p = pathOf(target);
  return COMPILED_ROUTES.some((re) => re.test(p));
}

// ─── Enumerated student-facing link targets ──────────────────────────────────

const STUDENT_NAV_TARGETS = navItems.student.map((item) => item.to);

// URL-safe identifier generator (models CLO/course ids carried as query params).
const idArb = fc
  .string({ minLength: 1, maxLength: 24 })
  .map((s) => s.replace(/[^A-Za-z0-9_-]/g, "") || "id");

// The remediated "get help"/CLO link targets (R1.1–R1.3) plus TutorEntryButton.
// All resolve to the registered /student/tutor route; the CLO id is preserved
// only as a query parameter (which does not affect route resolution).
const tutorLinkArb = fc.oneof(
  fc.constant("/student/tutor"), // FlowCheckInDialog "Stuck"
  idArb.map((clo) => `/student/tutor?cloIds=${clo}`), // PostQuizReview / MasteryRecoveryPanel
  fc
    .tuple(idArb, idArb)
    .map(([course, clo]) => `/student/tutor?courseId=${course}&cloIds=${clo}`) // TutorEntryButton
);

const studentLinkTargetArb = fc.oneof(
  fc.constantFrom(...STUDENT_NAV_TARGETS),
  tutorLinkArb
);

// Source files that previously linked to the dead /student/ai-tutor route.
const REMEDIATED_LINK_FILES = [
  "src/pages/student/quiz/PostQuizReview.tsx",
  "src/components/shared/FlowCheckInDialog.tsx",
  "src/components/shared/MasteryRecoveryPanel.tsx",
  "src/components/shared/TutorEntryButton.tsx",
];

// ─── Sanity guards on the derived data ───────────────────────────────────────

describe("studentRouteGuard — derivation sanity", () => {
  it("derives a non-trivial set of registered student routes from AppRouter", () => {
    expect(routerSrc.length).toBeGreaterThan(0);
    // The student section has well over a dozen routes; guard against a parse
    // that silently yields an empty/near-empty set (which would make the
    // property pass vacuously).
    expect(REGISTERED_STUDENT_ROUTES.length).toBeGreaterThan(15);
    expect(REGISTERED_STUDENT_ROUTES).toContain("/student/tutor");
    expect(REGISTERED_STUDENT_ROUTES).toContain("/student/dashboard");
  });

  it("enumerates the full student navigation", () => {
    expect(STUDENT_NAV_TARGETS.length).toBe(navItems.student.length);
    expect(STUDENT_NAV_TARGETS).toContain("/student/tutor");
  });
});

// ─── Property 13 ─────────────────────────────────────────────────────────────

describe("Property 13 — No student-facing link targets an unregistered route", () => {
  it("every enumerated student-facing link target resolves to a registered route", () => {
    fc.assert(
      fc.property(studentLinkTargetArb, (target) => {
        expect(resolvesToRegisteredRoute(target)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("every AI Tutor link resolves to /student/tutor, never /student/ai-tutor", () => {
    fc.assert(
      fc.property(tutorLinkArb, (target) => {
        expect(pathOf(target)).toBe("/student/tutor");
        expect(resolvesToRegisteredRoute(target)).toBe(true);
        // The unregistered route must never appear as a target path.
        expect(pathOf(target)).not.toBe("/student/ai-tutor");
      }),
      { numRuns: 100 }
    );
  });

  it("the unregistered /student/ai-tutor route is not registered in AppRouter", () => {
    // Negative control: confirm the model would actually reject the dead route,
    // so the property above is not vacuously satisfied.
    expect(resolvesToRegisteredRoute("/student/ai-tutor")).toBe(false);
  });

  it("no remediated source file still references the dead /student/ai-tutor route", () => {
    fc.assert(
      fc.property(fc.constantFrom(...REMEDIATED_LINK_FILES), (file) => {
        const content = readFileSafe(file);
        expect(content).not.toBeNull();
        expect(content as string).not.toContain("/student/ai-tutor");
        expect(content as string).toContain("/student/tutor");
      }),
      { numRuns: 100 }
    );
  });
});

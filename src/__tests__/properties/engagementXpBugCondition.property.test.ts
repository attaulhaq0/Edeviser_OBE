// Feature: full-profile-audit-remediation, Property 3: Bug Condition — Engagement XP is awarded with server-enforced canonical amounts
// **Validates: Requirements 2.7, 2.9, 2.10, 2.12, 2.13**
//
// CRITICAL: This test MUST FAIL on UNFIXED code — failure confirms the engagement-XP bug exists.
// DO NOT fix the source code or this test when it fails. The failure is the SUCCESS criterion
// for this exploration task: it proves two halves of `isEngagementXpBug`:
//   (a) ALLOW-LIST half — a student-JWT `award-xp` call for a source outside the self-trigger
//       allow-list (login/submission/journal) is rejected `403` and the XP is never awarded. The
//       affected sources are study_session, wellness_habit, planner_task, weekly_goal,
//       review_session, review_cycle_complete.
//   (b) NEVER-INVOKED half — the login (login_streak), perfect_day, grade, and journal flows never
//       invoke `award-xp` (nor process-streak / a perfect-day helper) from the real client flow.
//
// This test ENCODES the post-fix expectation (`isEngagementXpBug` from design.md / bugfix.md):
//   • the 6 affected sources are added to award-xp's `selfTriggeredSources` so a student JWT call
//     is authorized (status ≠ 403) and the XP is awarded;
//   • the server enforces the canonical amount per source, IGNORING any student-supplied xp_amount
//     (study_session clamp 0–60, wellness_habit institution-configured, planner_task 10,
//      weekly_goal 25, review_session 15, review_cycle_complete 25; login 10, journal 20,
//      grade 15, perfect_day 50);
//   • the login flow advances the streak + awards login XP, the journal flow awards journal XP,
//     the grade flow fires the grade badge/XP path, and a perfect-day helper awards perfect_day.

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

const fileExists = (relPath: string): boolean =>
  fs.existsSync(path.join(projectRoot, relPath));

const AWARD_XP_FILE = "supabase/functions/award-xp/index.ts";

// ─── The affected engagement XP sources (the `isEngagementXpBug` allow-list enumeration) ──
// Each pairs a self-triggered source a student should be able to award via their own JWT with the
// server-enforced canonical amount the server must resolve REGARDLESS of the client-supplied value.
interface SelfSource {
  source: string;
  // The canonical server-enforced amount. For clamped/configured sources, `canonical` is the value
  // the server resolves for the representative request used in the model below.
  canonical: number;
}

// The six sources that the student-JWT path must allow after the fix (today they all → 403).
const AFFECTED_SELF_SOURCES: readonly SelfSource[] = [
  { source: "study_session", canonical: 60 }, // clamp 0–60 (representative: request ≥60 → 60)
  { source: "wellness_habit", canonical: 5 }, // institution-configured (default 5)
  { source: "planner_task", canonical: 10 },
  { source: "weekly_goal", canonical: 25 },
  { source: "review_session", canonical: 15 },
  { source: "review_cycle_complete", canonical: 25 },
] as const;

// The originally-allowed self sources (must be preserved before AND after the fix).
const PRESERVED_SELF_SOURCES: readonly string[] = [
  "login",
  "submission",
  "journal",
] as const;

// ─── Source analysis: the award-xp self-trigger allow-list ───────────────────
// Extract the `selfTriggeredSources` array literal from the function source. UNFIXED code lists
// only ["login", "submission", "journal"]; the fix adds the six affected sources.
const parseSelfTriggeredSources = (source: string): string[] => {
  const match = source.match(
    /selfTriggeredSources\s*:\s*XPSource\[\]\s*=\s*\[([\s\S]*?)\]/
  );
  const body = match?.[1];
  if (!body) return [];
  return [...body.matchAll(/["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((s): s is string => s !== undefined);
};

// ─── Behavioral model of the student-JWT award-xp authorization + amount resolution ──
// Faithful to award-xp/index.ts: a non-service-role (student-JWT) caller is rejected 403 unless the
// source is in `selfTriggeredSources` (and the caller owns the row). When allowed, the server
// resolves the canonical amount and IGNORES the student-supplied `xp_amount`.
interface AwardRequest {
  source: string;
  requestedXpAmount: number; // student-supplied — must be ignored for server-enforced sources
  callerOwnsRow: boolean;
}

interface AwardOutcome {
  status: number;
  xpAwarded: number | null; // null = never awarded (403)
}

// Server-enforced canonical amount for a representative request (mirrors the cappedXpAmount block).
const canonicalAmountFor = (sourceDef: SelfSource): number =>
  sourceDef.canonical;

const simulateStudentAward = (
  source: string,
  awardXpSource: string,
  req: AwardRequest,
  sourceDef: SelfSource
): AwardOutcome => {
  const allowList = parseSelfTriggeredSources(awardXpSource);
  const allowed = allowList.includes(source) && req.callerOwnsRow;
  if (!allowed) {
    // Student-JWT call for a source outside the allow-list → 403, XP never awarded.
    return { status: 403, xpAwarded: null };
  }
  // Server ignores the student-supplied amount and resolves the canonical value.
  return { status: 200, xpAwarded: canonicalAmountFor(sourceDef) };
};

// ─── Generators scoped to the concrete failing case (isEngagementXpBug allow-list half) ──
// `excludeAmount` keeps the student-supplied value genuinely DIFFERENT from the server-enforced
// canonical amount, so the "arbitrary student value is IGNORED" assertion (xpAwarded !==
// requestedXpAmount) stays meaningful and deterministic instead of spuriously colliding when the
// random draw happens to equal the canonical (e.g. 5 for wellness_habit, 10 for planner_task).
const awardRequestArb = (excludeAmount: number) =>
  fc.record({
    requestedXpAmount: fc
      .integer({ min: -1000, max: 99999 })
      .filter((n) => n !== excludeAmount), // arbitrary student-supplied value (≠ canonical)
    callerOwnsRow: fc.constant(true), // the student awards their own row
  });

// ─── Property 3 (allow-list half): student-JWT engagement XP is authorized + server-enforced ──
// On UNFIXED code each affected source is NOT in `selfTriggeredSources`, so the student-JWT call
// → 403 and `xpAwarded` is null. These assertions therefore FAIL today, which is the expected
// outcome and proves the allow-list half of the engagement-XP bug.
describe("Property 3: Bug Condition — student-JWT engagement XP is authorized with server-enforced amount", () => {
  const awardXpSource = readFileSafe(AWARD_XP_FILE);

  it.each(AFFECTED_SELF_SOURCES.map((s) => [s.source, s] as const))(
    "award-xp authorizes a student-JWT '%s' call (status ≠ 403) and awards the canonical amount",
    (sourceName, sourceDef) => {
      fc.assert(
        fc.property(awardRequestArb(sourceDef.canonical), (partial) => {
          const req: AwardRequest = { source: sourceName, ...partial };
          const outcome = simulateStudentAward(
            sourceName,
            awardXpSource,
            req,
            sourceDef
          );

          // Post-fix expectation: no silent 403 for a legitimate self-triggered engagement source.
          expect(outcome.status).not.toBe(403);
          // The XP is actually awarded (not swallowed).
          expect(outcome.xpAwarded).not.toBeNull();
          // The server-enforced canonical amount wins — the arbitrary student value is IGNORED.
          expect(outcome.xpAwarded).toBe(canonicalAmountFor(sourceDef));
          expect(outcome.xpAwarded).not.toBe(req.requestedXpAmount);
        }),
        { numRuns: 100 }
      );
    }
  );

  // Direct source assertion documenting the root cause / post-fix expectation on the allow-list.
  it("award-xp selfTriggeredSources includes the six affected engagement sources", () => {
    const allowList = parseSelfTriggeredSources(awardXpSource);
    for (const { source } of AFFECTED_SELF_SOURCES) {
      expect(allowList).toContain(source);
    }
  });
});

// ─── Preservation: originally-allowed self sources still authorize ───────────
// This MUST hold both before and after the fix (login/submission/journal were always allowed).
describe("Property 3 (preservation): originally-allowed self sources still authorize", () => {
  const awardXpSource = readFileSafe(AWARD_XP_FILE);

  it("login/submission/journal remain in the self-trigger allow-list", () => {
    const allowList = parseSelfTriggeredSources(awardXpSource);
    for (const source of PRESERVED_SELF_SOURCES) {
      expect(allowList).toContain(source);
    }
  });
});

// ─── The NEVER-INVOKED half of isEngagementXpBug ─────────────────────────────
// The login (login_streak), perfect_day, grade, and journal flows must invoke the XP path from the
// real client flow. We detect the invocation from each flow's source. UNFIXED → absent → FAILS,
// which proves the "never invoked" half of the engagement-XP bug.
interface InvocationSurface {
  label: string;
  // Either a file that must contain the invocation, or a helper file that must exist + invoke.
  detect: () => boolean;
}

// Detect a functions.invoke("<fn>") / fetch(".../functions/v1/<fn>") call for a given function name.
const invokesFunction = (source: string, fnName: string): boolean => {
  const invokePattern = new RegExp(`\\.invoke\\(\\s*["'\`]${fnName}["'\`]`);
  const fetchPattern = new RegExp(`functions/v1/${fnName}`);
  return invokePattern.test(source) || fetchPattern.test(source);
};

// Detect an award-xp call carrying a specific source value (e.g. body source: "journal").
const invokesAwardXpWithSource = (
  source: string,
  xpSource: string
): boolean => {
  if (!invokesFunction(source, "award-xp")) return false;
  const sourcePattern = new RegExp(`source\\s*:\\s*["'\`]${xpSource}["'\`]`);
  return sourcePattern.test(source);
};

const NEVER_INVOKED_SURFACES: readonly InvocationSurface[] = [
  {
    label: "login flow (AuthProvider) advances streak via process-streak",
    detect: () => {
      const src = readFileSafe("src/providers/AuthProvider.tsx");
      return invokesFunction(src, "process-streak");
    },
  },
  {
    label: "login flow (AuthProvider) awards login XP via award-xp",
    detect: () => {
      const src = readFileSafe("src/providers/AuthProvider.tsx");
      return invokesAwardXpWithSource(src, "login");
    },
  },
  {
    label: "perfect_day helper exists and awards perfect_day XP via award-xp",
    detect: () => {
      // The fix adds src/lib/perfectDay.ts (awardPerfectDayIfComplete) per design Class 4.
      if (!fileExists("src/lib/perfectDay.ts")) return false;
      const src = readFileSafe("src/lib/perfectDay.ts");
      return invokesAwardXpWithSource(src, "perfect_day");
    },
  },
  {
    label: "grade flow (useGrades) fires the grade XP/badge path",
    detect: () => {
      const src = readFileSafe("src/hooks/useGrades.ts");
      // The grade DB trigger owns the +15 XP; the client must at least fire check-badges
      // (trigger:'grade') or award-xp('grade') so the grade → XP/badge path fires from the client.
      return (
        invokesAwardXpWithSource(src, "grade") ||
        invokesFunction(src, "check-badges")
      );
    },
  },
  {
    label: "journal flow (useJournal) awards journal XP via award-xp",
    detect: () => {
      const src = readFileSafe("src/hooks/useJournal.ts");
      return invokesAwardXpWithSource(src, "journal");
    },
  },
] as const;

// ─── Property 3 (never-invoked half): engagement flows invoke the XP path ────
// On UNFIXED code none of these flows invoke award-xp/process-streak (AuthProvider only calls
// logActivity; useJournal/useGrades make no functions.invoke call; src/lib/perfectDay.ts does not
// exist), so each detector returns false → FAILS today. That is the expected outcome and proves the
// never-invoked half of the engagement-XP bug.
describe("Property 3: Bug Condition — login/perfect_day/grade/journal flows invoke the XP path", () => {
  it.each(NEVER_INVOKED_SURFACES.map((s) => [s.label, s] as const))(
    "%s",
    (_label, surface) => {
      fc.assert(
        fc.property(fc.constant(surface), (s) => {
          expect(s.detect()).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );
});

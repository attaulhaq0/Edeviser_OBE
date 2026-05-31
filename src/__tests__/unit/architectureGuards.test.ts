// =============================================================================
// architectureGuards.test.ts — static & integration guard checks (Task 25.7)
// Feature: student-experience-remediation
// -----------------------------------------------------------------------------
// Runtime file-scan guards (node `fs`) that defend the architecture, type-safety
// and i18n invariants the remediation established, so they stay correct as files
// change. These complement (do not replace) `npm run lint` and `npx tsc --noEmit`.
//
//   Guard 1 — no `supabase.from(` in student components ............ R25.3
//   Guard 2 — no stale `(supabase as any)` / `as never` casts on the
//             student-experience surface (pages + named hooks) ...... R26.2
//   Guard 3 — no `eslint-disable` on the quiz-timer effect ........... R3.2 / lint
//   Guard 4 — en/ar i18n key parity for student-facing namespaces .... R29.2
//   Guard 5 — younger-student "friendly" wording present in en + ar .. R22.4 / R22.5
//
// Scope note for Guards 1 & 2: R25.3 / R26.2 are scoped to the *Student
// Experience and its hooks*, not every hook in `src/hooks/**`. Several
// unrelated hooks (team/admin/coordinator features) legitimately retain
// `as never` casts that are load-bearing against the generated types
// (e.g. tables/views absent from `database.ts`); removing them breaks
// `tsc`. Guard 1 therefore scans the whole student-page tree (which must be
// cast-free), while Guard 2 scans the explicit, documented set of
// student-experience hooks named in R26's root cause + Task 25.2.
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "../../..");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively collect `.ts`/`.tsx` files under an absolute directory. */
const collectSourceFiles = (absDir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...collectSourceFiles(abs));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
  }
  return out;
};

/**
 * Strip block comments, line comments and string/template literals so that
 * matches inside documentation or example strings (e.g. a comment that mentions
 * `(supabase as any)`) are not counted as real code. Intentionally simple — it
 * does not need to be a full tokenizer, only good enough to avoid false
 * positives from the prose that documents what was removed.
 */
const stripNonCode = (src: string): string => {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, ""); // block comments
  s = s.replace(/(^|[^:])\/\/[^\n]*/g, "$1"); // line comments (keep http:// etc.)
  s = s.replace(/`(?:\\[\s\S]|[^\\`])*`/g, "``"); // template literals
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""'); // double-quoted strings
  s = s.replace(/'(?:\\.|[^'\\])*'/g, "''"); // single-quoted strings
  return s;
};

const read = (rel: string): string =>
  fs.readFileSync(path.join(projectRoot, rel), "utf-8");

const readJsonStrippingBom = (rel: string): Record<string, unknown> => {
  let raw = read(rel);
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw) as Record<string, unknown>;
};

/** Flatten a nested locale object into dot-separated leaf keys. */
const extractKeys = (obj: Record<string, unknown>, prefix = ""): string[] => {
  const keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...extractKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
};

// ─── Guard 1: no direct supabase.from in student components (R25.3) ──────────

describe("Architecture guard: student components contain no direct supabase.from (R25.3)", () => {
  const studentDir = path.join(projectRoot, "src/pages/student");
  const files = collectSourceFiles(studentDir);

  it("finds student page files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // `supabase.from(` allowing whitespace/newlines between the identifier and
  // the call (the violations in ChallengeDetailPage wrapped across lines).
  const FROM_RE = /\bsupabase[\s\r\n]*\.\s*from\s*\(/;

  it.each(files.map((f) => [path.relative(projectRoot, f), f] as const))(
    "%s has no supabase.from( call",
    (_rel, abs) => {
      const code = stripNonCode(fs.readFileSync(abs, "utf-8"));
      expect(FROM_RE.test(code)).toBe(false);
    }
  );
});

// ─── Guard 2: no stale casts on the student-experience surface (R26.2) ───────

describe("Type-safety guard: no stale (supabase as any) / as never casts on the student surface (R26.2)", () => {
  // Student pages (full tree) — must be entirely cast-free.
  const studentPages = collectSourceFiles(
    path.join(projectRoot, "src/pages/student")
  ).map((f) => path.relative(projectRoot, f).replace(/\\/g, "/"));

  // Student-experience hooks named in R26's root cause + Task 25.2. These are
  // the hooks the remediation owns; broader `src/hooks/**` casts belong to
  // unrelated features and are intentionally out of scope (see file header).
  const studentHooks = [
    "src/hooks/useMarketplace.ts",
    "src/hooks/useInventory.ts",
    "src/hooks/useTransactionHistory.ts",
    "src/hooks/useStreakFreeze.ts",
    "src/hooks/useTutorConversations.ts",
    "src/hooks/useTutorMessages.ts",
    "src/hooks/useTutorAutonomy.ts",
    "src/hooks/useUpdateConversationAutonomy.ts",
    "src/hooks/useLeaderboard.ts",
    "src/hooks/useLeagueLeaderboard.ts",
    "src/hooks/useChallengeDetail.ts",
    "src/hooks/useChallengeParticipation.ts",
    "src/hooks/useStudentCourses.ts",
    "src/hooks/useSurveyAssignmentsCount.ts",
    "src/hooks/useJournalCourseOptions.ts",
  ];

  const surface = [...studentPages, ...studentHooks];

  const SUPABASE_AS_ANY_RE = /\(\s*supabase\s+as\s+any\s*\)/;
  const AS_NEVER_RE = /\bas\s+never\b/;

  it("references hook files that exist", () => {
    for (const rel of studentHooks) {
      expect(
        fs.existsSync(path.join(projectRoot, rel)),
        `${rel} should exist`
      ).toBe(true);
    }
  });

  it.each(surface.map((rel) => [rel] as const))(
    "%s has no (supabase as any) cast",
    (rel) => {
      const code = stripNonCode(read(rel));
      expect(SUPABASE_AS_ANY_RE.test(code)).toBe(false);
    }
  );

  it.each(surface.map((rel) => [rel] as const))(
    "%s has no `as never` cast",
    (rel) => {
      const code = stripNonCode(read(rel));
      expect(AS_NEVER_RE.test(code)).toBe(false);
    }
  );
});

// ─── Guard 3: no eslint-disable on the quiz-timer effect (R3.2) ──────────────

describe("Lint guard: the AdaptiveQuizSession quiz-timer effect carries no eslint-disable (R3.2)", () => {
  const rel = "src/pages/student/quiz/AdaptiveQuizSession.tsx";
  const source = read(rel);

  it("the file exists and defines a timer effect", () => {
    expect(source).toContain("setInterval");
    expect(source).toContain("clearInterval");
  });

  it("contains no eslint-disable directive for the timer's exhaustive-deps", () => {
    // The timer effect is keyed only on `session?.attemptId` and uses a
    // latest-ref pattern, so it must NOT suppress react-hooks/exhaustive-deps.
    // Find the timer effect block and assert no disable comment precedes it.
    const timerIdx = source.indexOf("const intervalId = setInterval");
    expect(timerIdx).toBeGreaterThan(-1);

    // Look at the 600 characters preceding the timer setInterval — the effect
    // header and dependency array live here. None may contain an eslint-disable
    // targeting exhaustive-deps for the timer.
    const preceding = source.slice(Math.max(0, timerIdx - 600), timerIdx);
    expect(preceding).not.toMatch(
      /eslint-disable[^\n]*react-hooks\/exhaustive-deps/
    );

    // And the timer's own dependency line must not be followed/preceded by a
    // disable on the same effect.
    const timerDepIdx = source.indexOf("}, [session?.attemptId]);");
    expect(timerDepIdx).toBeGreaterThan(-1);
    const aroundDeps = source.slice(timerIdx, timerDepIdx + 40);
    expect(aroundDeps).not.toContain("eslint-disable");
  });
});

// ─── Guard 4: en/ar i18n key parity for student-facing namespaces (R29.2) ────

describe("i18n guard: en/ar key parity for student-facing namespaces (R29.2)", () => {
  // Namespaces that carry student-facing strings. `student` is the primary one;
  // `common`, `auth`, `gamification` and `ai` are also reached from student
  // surfaces (toasts, auth forms, XP/badges, tutor).
  const namespaces = ["common", "auth", "student", "gamification", "ai"];

  it.each(namespaces.map((ns) => [ns] as const))(
    "[%s] every English key exists in Arabic and vice-versa",
    (ns) => {
      const en = readJsonStrippingBom(`src/locales/en/${ns}.json`);
      const ar = readJsonStrippingBom(`src/locales/ar/${ns}.json`);
      const enKeys = new Set(extractKeys(en));
      const arKeys = new Set(extractKeys(ar));

      const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
      const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));

      expect(missingInAr, `keys missing from ar/${ns}.json`).toEqual([]);
      expect(missingInEn, `keys missing from en/${ns}.json`).toEqual([]);
    }
  );
});

// ─── Guard 5: younger-student "friendly" wording present in en + ar (R22.4/22.5)

describe("i18n guard: younger-student friendly wording present in both locales (R22.4, R22.5)", () => {
  // The approachable, plain-language wording for younger students (R22). The
  // build/deploy-time presence check fails if either localization is missing.
  const requiredKeys = [
    // Portfolio approachable mastery wording (R22.2).
    "portfolio.friendly.strengths",
    "portfolio.friendly.skillsTitle",
    "portfolio.friendly.areasImproving",
    "portfolio.friendly.strengthsHint",
    "portfolio.friendly.areasImprovingHint",
    // Plain-language heatmap summary (R22.1).
    "heatmap.plainSummary.title",
    "heatmap.plainSummary.empty",
    "heatmap.plainSummary.completion",
    "heatmap.plainSummary.bestHabit",
    // Approachable journal reflection templates (R22.3).
    "journal.prompts.learned",
    "journal.prompts.confused",
    "journal.prompts.proud",
  ];

  const en = readJsonStrippingBom("src/locales/en/student.json");
  const ar = readJsonStrippingBom("src/locales/ar/student.json");
  const enKeys = new Set(extractKeys(en));
  const arKeys = new Set(extractKeys(ar));

  it.each(requiredKeys.map((k) => [k] as const))(
    "%s is present in both en and ar student locales",
    (key) => {
      expect(enKeys.has(key), `missing from en/student.json: ${key}`).toBe(
        true
      );
      expect(arKeys.has(key), `missing from ar/student.json: ${key}`).toBe(
        true
      );
    }
  );
});

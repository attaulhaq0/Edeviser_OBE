// =============================================================================
// Feature: student-experience-remediation
// Task 25.7 — Static & integration architecture guard checks
//
// These guards statically assert the architecture invariants this spec
// established. They fail loudly if a regression re-introduces a violation.
// They complement (do not replace) the toolchain gates run separately:
//   - `npm run lint`     (zero warnings)
//   - `npx tsc --noEmit` (type safety, no `any`)
// and the existing en/ar full-namespace parity test
// (`src/__tests__/properties/translationParity.property.test.ts`).
//
// Invariants asserted here:
//   1. No direct `supabase.from(` / `supabase.rpc(` / `supabase.auth` calls
//      remain in student PAGE/COMPONENT bodies. In-file query hooks
//      (functions named `use*`) and the team page's documented useQuery
//      wrapper are allowed (R25.3).
//   2. No stale `(supabase as any)` / `as never` casts remain in the hooks
//      named by task 25.2 (marketplace, inventory, transaction history,
//      tutor/league hooks, streak freeze) (R26.2).
//   3. The adaptive quiz timer effect contains no `eslint-disable`
//      (R26.3 / quiz timer rule, R3.2).
//   4. Build-time en/ar key presence for the younger-student wording added by
//      this spec — portfolio.friendly.*, heatmap.plainSummary.*, mascot.*
//      (R22.5, R29.2).
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { resources } from "@/lib/i18n";

const projectRoot = path.resolve(__dirname, "../../..");
const STUDENT_PAGES_DIR = path.join(projectRoot, "src/pages/student");
const HOOKS_DIR = path.join(projectRoot, "src/hooks");

// ─── Source-scanning helpers ─────────────────────────────────────────────────

/**
 * Returns a same-length copy of `src` with the contents of comments and string
 * / template literals replaced by spaces. Newlines are preserved so character
 * indices (and therefore line numbers) map 1:1 with the original. This lets us
 * detect *code* tokens (`supabase.from(`, `as never`, …) without matching the
 * same text inside an import path, a documentation comment, or a string.
 */
function blankCommentsAndStrings(src: string): string {
  const out = src.split("");
  const n = src.length;
  let i = 0;
  let state: "code" | "line" | "block" | "single" | "double" | "template" =
    "code";

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];

    switch (state) {
      case "code":
        if (ch === "/" && next === "/") {
          state = "line";
          i += 2;
        } else if (ch === "/" && next === "*") {
          out[i] = " ";
          out[i + 1] = " ";
          state = "block";
          i += 2;
        } else if (ch === "'") {
          state = "single";
          i += 1;
        } else if (ch === '"') {
          state = "double";
          i += 1;
        } else if (ch === "`") {
          state = "template";
          i += 1;
        } else {
          i += 1;
        }
        break;
      case "line":
        if (ch === "\n") {
          state = "code";
        } else {
          out[i] = " ";
        }
        i += 1;
        break;
      case "block":
        if (ch === "*" && next === "/") {
          out[i] = " ";
          out[i + 1] = " ";
          state = "code";
          i += 2;
        } else {
          if (ch !== "\n") out[i] = " ";
          i += 1;
        }
        break;
      case "single":
        if (ch === "\\") {
          out[i] = " ";
          out[i + 1] = " ";
          i += 2;
        } else if (ch === "'") {
          state = "code";
          i += 1;
        } else {
          if (ch !== "\n") out[i] = " ";
          i += 1;
        }
        break;
      case "double":
        if (ch === "\\") {
          out[i] = " ";
          out[i + 1] = " ";
          i += 2;
        } else if (ch === '"') {
          state = "code";
          i += 1;
        } else {
          if (ch !== "\n") out[i] = " ";
          i += 1;
        }
        break;
      case "template":
        if (ch === "\\") {
          out[i] = " ";
          out[i + 1] = " ";
          i += 2;
        } else if (ch === "`") {
          state = "code";
          i += 1;
        } else {
          if (ch !== "\n") out[i] = " ";
          i += 1;
        }
        break;
    }
  }
  return out.join("");
}

/** Recursively collects files with one of the given extensions under `dir`. */
function collectFiles(dir: string, exts: string[]): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        found.push(full);
      }
    }
  };
  walk(dir);
  return found;
}

const lineOf = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

const rel = (full: string): string =>
  path.relative(projectRoot, full).replace(/\\/g, "/");

/**
 * Finds every named function-ish declaration (`const X =`, `function X`, …) so
 * a code offset can be attributed to its nearest enclosing declaration. Hook
 * functions follow the React `use<Capital>` naming convention.
 */
const DECL_RE =
  /(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g;

interface Decl {
  name: string;
  index: number;
}

function collectDeclarations(code: string): Decl[] {
  const decls: Decl[] = [];
  let m: RegExpExecArray | null;
  DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(code)) !== null) {
    const name = m[1];
    if (name) decls.push({ name, index: m.index });
  }
  return decls;
}

/** The declaration with the greatest start index strictly before `index`. */
function enclosingDeclaration(decls: Decl[], index: number): Decl | null {
  let best: Decl | null = null;
  for (const d of decls) {
    if (d.index < index && (best === null || d.index > best.index)) {
      best = d;
    }
  }
  return best;
}

const isHookName = (name: string): boolean => /^use[A-Z0-9]/.test(name);

// ─── Guard 1: no direct supabase calls in student component bodies ───────────

describe("Guard 1 — no direct supabase data access in student component bodies (R25.3)", () => {
  const DIRECT_CALL_RE = /supabase\s*\.\s*(from|rpc|auth)\b/g;

  it("every student page accesses Supabase only through use*-named query hooks", () => {
    const files = collectFiles(STUDENT_PAGES_DIR, [".tsx"]);
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const original = fs.readFileSync(file, "utf-8");
      const code = blankCommentsAndStrings(original);
      const decls = collectDeclarations(code);

      let match: RegExpExecArray | null;
      DIRECT_CALL_RE.lastIndex = 0;
      while ((match = DIRECT_CALL_RE.exec(code)) !== null) {
        const enclosing = enclosingDeclaration(decls, match.index);
        // Allowed: the call lives inside an in-file query hook (use*). Anything
        // else (component body, event handler, module scope) is a violation.
        if (enclosing && isHookName(enclosing.name)) continue;
        violations.push(
          `${rel(file)}:${lineOf(original, match.index)} — supabase.${
            match[1]
          } in ${enclosing ? `'${enclosing.name}'` : "module scope"} ` +
            `(move data access into a use* query hook)`
        );
      }
    }

    expect(
      violations,
      `Direct supabase calls found in student component bodies:\n${violations.join(
        "\n"
      )}`
    ).toEqual([]);
  });
});

// ─── Guard 2: no stale casts in the hooks named by task 25.2 ─────────────────

describe("Guard 2 — no stale (supabase as any) / as never casts in task-25.2 hooks (R26.2)", () => {
  // The four explicitly-named hooks must exist (renames would otherwise let the
  // guard silently pass), plus every tutor/league hook in the family.
  const REQUIRED_HOOKS = [
    "useMarketplace.ts",
    "useInventory.ts",
    "useTransactionHistory.ts",
    "useStreakFreeze.ts",
  ];

  const targetHookFiles = (): string[] => {
    const all = fs
      .readdirSync(HOOKS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts"))
      .map((e) => e.name);

    const family = all.filter(
      (name) =>
        REQUIRED_HOOKS.includes(name) ||
        /^use(Tutor|League)/.test(name) ||
        name === "useUpdateConversationAutonomy.ts"
    );
    return Array.from(new Set([...REQUIRED_HOOKS, ...family]));
  };

  it("all four explicitly-named hooks exist", () => {
    for (const hook of REQUIRED_HOOKS) {
      expect(
        fs.existsSync(path.join(HOOKS_DIR, hook)),
        `Expected hook ${hook} to exist`
      ).toBe(true);
    }
  });

  it("contains no `(supabase as any)` or ` as never` casts", () => {
    const CAST_RE = /\bas\s+(any|never)\b/g;
    const violations: string[] = [];

    for (const name of targetHookFiles()) {
      const file = path.join(HOOKS_DIR, name);
      if (!fs.existsSync(file)) continue;
      const original = fs.readFileSync(file, "utf-8");
      const code = blankCommentsAndStrings(original);

      let match: RegExpExecArray | null;
      CAST_RE.lastIndex = 0;
      while ((match = CAST_RE.exec(code)) !== null) {
        violations.push(
          `${rel(file)}:${lineOf(original, match.index)} — found 'as ${
            match[1]
          }'`
        );
      }
    }

    expect(
      violations,
      `Stale type-workaround casts found (regenerate types instead):\n${violations.join(
        "\n"
      )}`
    ).toEqual([]);
  });
});

// ─── Guard 3: no eslint-disable on the adaptive quiz timer effect ────────────

describe("Guard 3 — no eslint-disable on the adaptive quiz timer (R26.3, R3.2)", () => {
  const TIMER_FILE = path.join(
    projectRoot,
    "src/pages/student/quiz/AdaptiveQuizSession.tsx"
  );

  /**
   * Extracts the `useEffect(...)` block that contains `setInterval` — the
   * countdown timer — using brace-matching over the comment/string-blanked
   * source so braces inside strings cannot desync the matcher. Returns the
   * original (un-blanked) slice so comment-borne `eslint-disable` directives
   * remain visible.
   */
  function extractTimerEffect(original: string, code: string): string | null {
    const intervalIdx = code.indexOf("setInterval(");
    if (intervalIdx === -1) return null;
    const head = code.lastIndexOf("useEffect(", intervalIdx);
    if (head === -1) return null;

    const bodyStart = code.indexOf("{", head);
    if (bodyStart === -1) return null;

    let depth = 0;
    let i = bodyStart;
    for (; i < code.length; i++) {
      const ch = code[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const callEnd = code.indexOf(")", i);
    if (callEnd === -1) return null;

    return original.slice(head, callEnd + 1);
  }

  it("the timer file exists and contains a setInterval-based timer effect", () => {
    expect(fs.existsSync(TIMER_FILE)).toBe(true);
    const original = fs.readFileSync(TIMER_FILE, "utf-8");
    const code = blankCommentsAndStrings(original);
    expect(extractTimerEffect(original, code)).not.toBeNull();
  });

  it("the timer effect contains no eslint-disable directive", () => {
    const original = fs.readFileSync(TIMER_FILE, "utf-8");
    const code = blankCommentsAndStrings(original);
    const timerEffect = extractTimerEffect(original, code);
    expect(timerEffect).not.toBeNull();
    expect(
      timerEffect as string,
      "The quiz timer effect must use the latest-ref pattern, not an eslint-disable on its dependency array"
    ).not.toMatch(/eslint-disable/);
  });
});

// ─── Guard 4: en/ar build-time presence of younger-student wording ───────────

describe("Guard 4 — en/ar key presence for younger-student wording (R22.5, R29.2)", () => {
  /** Resolves a dot-path against a nested locale object. */
  const hasKey = (root: unknown, dotPath: string): boolean => {
    let node: unknown = root;
    for (const segment of dotPath.split(".")) {
      if (node === null || typeof node !== "object") return false;
      if (!(segment in (node as Record<string, unknown>))) return false;
      node = (node as Record<string, unknown>)[segment];
    }
    return typeof node === "string" && node.length > 0;
  };

  // Keys added by this spec for younger-student friendliness (R22) and the
  // mascot guidance copy (R35). Namespace-scoped so we read the same subtree
  // i18next serves at runtime.
  const STUDENT_KEYS = [
    "portfolio.friendly.skillsTitle",
    "portfolio.friendly.strengths",
    "portfolio.friendly.areasImproving",
    "portfolio.friendly.strengthsHint",
    "portfolio.friendly.areasImprovingHint",
    "heatmap.plainSummary.title",
    "heatmap.plainSummary.empty",
    "heatmap.plainSummary.completion",
    "heatmap.plainSummary.bestHabit",
    "heatmap.plainSummary.streak",
    "heatmap.plainSummary.encourage",
  ];

  const COMMON_KEYS = [
    "mascot.regionLabel",
    "mascot.moments.welcome.title",
    "mascot.moments.welcome.message",
    "mascot.moments.assessmentIntro.title",
    "mascot.moments.assessmentIntro.message",
    "mascot.moments.emptyState.title",
    "mascot.moments.emptyState.message",
    "mascot.moments.firstXp.title",
    "mascot.moments.firstXp.message",
    "mascot.moments.firstEnrollment.title",
    "mascot.moments.firstEnrollment.message",
    "mascot.moments.password.title",
    "mascot.moments.password.message",
  ];

  const cases: Array<[string, string, string]> = [
    ...STUDENT_KEYS.map((k) => ["student", k, k] as [string, string, string]),
    ...COMMON_KEYS.map((k) => ["common", k, k] as [string, string, string]),
  ];

  it.each(cases)(
    "%s namespace key '%s' is present in BOTH en and ar",
    (ns, key) => {
      const en = (resources.en as Record<string, unknown>)[ns];
      const ar = (resources.ar as Record<string, unknown>)[ns];
      expect(hasKey(en, key), `Missing English ${ns}:${key}`).toBe(true);
      expect(hasKey(ar, key), `Missing Arabic ${ns}:${key}`).toBe(true);
    }
  );
});

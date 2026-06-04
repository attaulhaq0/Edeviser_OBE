// =============================================================================
// castGuard.ts — pure verdict logic for the Static_Cast_Guard (Req 17, C1)
// Feature: qa-partner-review-remediation
// -----------------------------------------------------------------------------
// `.from("table" as never)`, `.insert(payload as never)`, `.update(... as never)`
// and `.upsert(... as never)` casts defeat TypeScript's generated-type checking
// and are the deeper root cause behind the challenge (B2) and team (B3) insert
// bugs. This module is the PURE, side-effect-free heart of the guard: it has no
// `fs` access and no knowledge of the project layout. The Vitest harness
// (`supabaseCastGuard.test.ts`) walks the `src/` tree, blanks each file's
// comments/strings, and feeds the result here.
//
// Two responsibilities, both pure:
//   1. `findCastViolations` — detect the four dangerous casts in one file's
//      already-comment/string-blanked source, returning the file + 1-indexed
//      line of each occurrence.
//   2. `evaluateCastGuard` — compare the accumulated violations against the
//      tracked Allowlist and decide pass/fail with human-readable reasons
//      (new violation ⇒ fail; stale allowlist entry ⇒ fail; count over the
//      recorded baseline ⇒ fail).
//
// The `blankCommentsAndStrings` tokenizer is the same char-by-char state machine
// used by `src/__tests__/integration/studentArchitectureGuards.test.ts`; it is
// re-exported from here (it is pure) so the guard test reuses one canonical
// implementation rather than reinventing it.
// =============================================================================

/** The four Supabase call casts the guard recognizes. */
export type CastPattern =
  | "from-as-never"
  | "insert-as-never"
  | "update-as-never"
  | "upsert-as-never";

/** A single detected cast occurrence in a source file. */
export interface CastViolation {
  /** Workspace-relative, forward-slash file path (e.g. `src/hooks/useTeams.ts`). */
  file: string;
  /** Which dangerous cast was found. */
  pattern: CastPattern;
  /** 1-indexed line of the offending `.method(` call. */
  line: number;
}

/**
 * A tolerated legacy violation. Keyed on `file` + `pattern` only (no line), so
 * the entry stays stable as surrounding code shifts. This mirrors the design's
 * `AllowEntry` shape exactly.
 */
export interface AllowlistEntry {
  file: string;
  pattern: CastPattern;
}

/**
 * The tracked Allowlist. `entries` is the maximum permitted *set* of
 * `(file, pattern)` violations; `maxCount` is the maximum permitted *total*
 * occurrence count recorded at the feature baseline. The guard is shrinking-only:
 * neither may grow, and `maxCount` is never edited upward.
 */
export interface Allowlist {
  maxCount: number;
  entries: AllowlistEntry[];
}

/** The outcome of comparing live violations against the Allowlist. */
export interface CastGuardVerdict {
  /** True only when there are no new violations, no stale entries, and the count is within baseline. */
  pass: boolean;
  /** Human-readable explanations for every failure (empty when `pass`). */
  reasons: string[];
  /** Violations whose `(file, pattern)` is not in the Allowlist. */
  newViolations: CastViolation[];
  /** Allowlist entries that no longer match any real violation (must be removed). */
  staleEntries: AllowlistEntry[];
  /** True when the total occurrence count exceeds `maxCount`. */
  countExceeded: boolean;
  /** Total number of live violation occurrences scanned. */
  violationCount: number;
}

// ─── Tokenizer (shared, pure) ─────────────────────────────────────────────────

/**
 * Returns a same-length copy of `src` with the contents of comments and
 * string / template literals replaced by spaces. Newlines are preserved so
 * character indices (and therefore line numbers) map 1:1 with the original.
 * This lets the guard detect *code* tokens (`.from(`, `as never`, …) without
 * matching the same text inside an import path, a documentation comment, or a
 * string literal (Req 17.6).
 *
 * Identical in behavior to the tokenizer in the student architecture guard; kept
 * here as the single canonical implementation the cast guard reuses. Pure: no
 * side effects, no I/O.
 */
export function blankCommentsAndStrings(src: string): string {
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

// ─── Detection ────────────────────────────────────────────────────────────────

/** The Supabase builder methods the guard inspects. */
type CastMethod = "from" | "insert" | "update" | "upsert";

/**
 * Maps a Supabase builder method to its violation pattern. Keyed on the exact
 * `CastMethod` union (not a string index signature) so lookups return a
 * `CastPattern` under `noUncheckedIndexedAccess`.
 */
const METHOD_PATTERN: Readonly<Record<CastMethod, CastPattern>> = {
  from: "from-as-never",
  insert: "insert-as-never",
  update: "update-as-never",
  upsert: "upsert-as-never",
};

/** `.from(` / `.insert(` / `.update(` / `.upsert(` allowing inner whitespace. */
const METHOD_CALL_RE = /\.\s*(from|insert|update|upsert)\s*\(/g;

/** A type assertion to `never` (`as never`, also matches `as never[]`). */
const AS_NEVER_RE = /\bas\s+never\b/;

/** 1-indexed line number of `index` within `src`. */
const lineAt = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

/**
 * Returns the index just past the `)` that closes the call whose opening `(`
 * is at `openParenIndex`, using paren-depth matching over the (already blanked)
 * source so parentheses inside string literals cannot desync the matcher.
 * Returns `-1` if the call is unterminated.
 */
const matchingCloseParen = (
  blanked: string,
  openParenIndex: number
): number => {
  let depth = 0;
  for (let i = openParenIndex; i < blanked.length; i++) {
    const ch = blanked[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/**
 * Detects `.from(... as never)`, `.insert(... as never)`, `.update(... as never)`
 * and `.upsert(... as never)` occurrences in a single file's source.
 *
 * IMPORTANT: `blankedSource` MUST already have its comments and string/template
 * literals blanked (see {@link blankCommentsAndStrings}). This keeps the module
 * pure and lets callers blank once and reuse. For each match the entire call's
 * argument span — from the opening `(` to its balanced closing `)`, which may
 * span multiple lines — is examined for an `as never` cast; the reported line is
 * the line of the `.method(` call itself.
 *
 * @param file - Workspace-relative path used in the returned violations.
 * @param blankedSource - The file's source with comments/strings blanked.
 * @returns Every detected cast occurrence (one per `.method(... as never)` call).
 */
export const findCastViolations = (
  file: string,
  blankedSource: string
): CastViolation[] => {
  const violations: CastViolation[] = [];
  let match: RegExpExecArray | null;
  METHOD_CALL_RE.lastIndex = 0;

  while ((match = METHOD_CALL_RE.exec(blankedSource)) !== null) {
    const method = match[1] as CastMethod;
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = matchingCloseParen(blankedSource, openParenIndex);
    if (closeParenIndex === -1) continue;

    const argSpan = blankedSource.slice(openParenIndex + 1, closeParenIndex);
    if (AS_NEVER_RE.test(argSpan)) {
      violations.push({
        file,
        pattern: METHOD_PATTERN[method],
        line: lineAt(blankedSource, match.index),
      });
    }
  }

  return violations;
};

// ─── Verdict ──────────────────────────────────────────────────────────────────

/** Stable `(file, pattern)` identity key for set comparisons. */
const keyOf = (v: { file: string; pattern: CastPattern }): string =>
  `${v.file}::${v.pattern}`;

/**
 * Compares the accumulated live violations against the tracked Allowlist and
 * decides pass/fail (Req 17.2, 17.3, 17.4, 17.5, 17.7). The Allowlist is the
 * maximum permitted set, keyed on `(file, pattern)`:
 *
 *   - FAIL when a live violation's `(file, pattern)` is NOT in the Allowlist
 *     (a newly introduced cast — Req 17.2, 17.4).
 *   - FAIL when an Allowlist entry no longer matches any live violation (a stale
 *     entry that must be removed — shrinking-only, Req 17.5).
 *   - FAIL when the total live occurrence count exceeds `maxCount` (the
 *     non-increasing baseline — Req 17.7).
 *
 * Pure: depends only on its arguments.
 *
 * @param violations - All live cast occurrences scanned from `src/`.
 * @param allowlist - The tracked baseline Allowlist.
 * @returns A verdict with pass/fail, reasons, and the offending sets.
 */
export const evaluateCastGuard = (
  violations: CastViolation[],
  allowlist: Allowlist
): CastGuardVerdict => {
  const allowKeys = new Set(allowlist.entries.map(keyOf));
  const violationKeys = new Set(violations.map(keyOf));

  // New violations: any live occurrence whose (file, pattern) is not allowlisted.
  const newViolations = violations.filter((v) => !allowKeys.has(keyOf(v)));

  // Stale entries: allowlisted (file, pattern) pairs that no longer occur.
  const staleEntries = allowlist.entries.filter(
    (e) => !violationKeys.has(keyOf(e))
  );

  const countExceeded = violations.length > allowlist.maxCount;

  const reasons: string[] = [];

  for (const v of newViolations) {
    reasons.push(
      `New disallowed cast: ${v.file}:${v.line} uses '${v.pattern}'. ` +
        `Remove the 'as never' cast (regenerate types) or, for a genuinely ` +
        `un-typed object, add { "file": "${v.file}", "pattern": "${v.pattern}" } ` +
        `to supabaseCastAllowlist.json and raise maxCount.`
    );
  }

  for (const e of staleEntries) {
    reasons.push(
      `Stale allowlist entry: { file: "${e.file}", pattern: "${e.pattern}" } ` +
        `no longer matches any cast. Remove it from supabaseCastAllowlist.json ` +
        `and lower maxCount (the allowlist is shrinking-only).`
    );
  }

  if (countExceeded) {
    reasons.push(
      `Cast count regressed: found ${violations.length} '... as never' Supabase ` +
        `casts but the baseline maxCount is ${allowlist.maxCount}. The count must ` +
        `never increase.`
    );
  }

  return {
    pass: reasons.length === 0,
    reasons,
    newViolations,
    staleEntries,
    countExceeded,
    violationCount: violations.length,
  };
};

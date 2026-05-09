// Pre-deployment audit — design-token conformance scanner.
//
// Implements (first two rules):
//   - Task 10.4 / Req 10.3: physical margin/padding scan (ml|mr|pl|pr|left|right
//     utilities without logical counterparts). Flags Major findings that risk
//     RTL regressions in Arabic locale.
//   - Task 10.5 / Req 9.8: no full-page skeleton rule. Flags Skeleton or
//     Shimmer components sized to the full viewport (anti-pattern per
//     design-system.md).
//
// Rules 10.1 (forbidden color families on cards/tabs), 10.2 (glassmorphism),
// 10.3 (max one gradient CTA per section), 10.6 (Route wrapped by
// ErrorBoundary), and 10.7 (Card/Tab classifier) land in follow-up tasks that
// need ts-morph AST analysis. The two rules implemented here are pure regex —
// deterministic, fast, and cheap to extend.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import {
  type Finding,
  type FindingsArtifact,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import { isAuditExcluded, isJsxFile, walkFiles } from "./fs-walk.ts";
import type { StageResult } from "./types.ts";

// ─── Baseline loader ───────────────────────────────────────────────────────

interface I18nAllowlistBaseline {
  physicalSpacingExceptions?: readonly {
    readonly utility: string;
    readonly rationale?: string;
  }[];
}

const i18nAllowlistPath = (): string =>
  resolve("audit", "baselines", "i18n-allowlist.json");

const loadPhysicalSpacingExceptions = (): ReadonlySet<string> => {
  const path = i18nAllowlistPath();
  if (!existsSync(path)) return new Set();
  try {
    const raw = JSON.parse(
      readFileSync(path, "utf8")
    ) as I18nAllowlistBaseline | null;
    const exceptions = raw?.physicalSpacingExceptions ?? [];
    return new Set(exceptions.map((e) => e.utility));
  } catch {
    // Malformed baseline is reported by the i18n checker (task 11.x) — the
    // design-token check degrades gracefully to "no exceptions".
    return new Set();
  }
};

// ─── Rule: no physical margin/padding (§10.4 / Req 10.3) ──────────────────
//
// Detect Tailwind utilities of the shape `ml-4`, `mr-2`, `pl-6`, `pr-3`,
// `left-0`, `right-2`, and responsive / pseudo-class variants of the same
// (`md:ml-4`, `hover:pr-3`). Only flag when the utility is NOT accompanied
// by its logical counterpart (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`,
// `end-*`) on the same element or in the allowlist.
//
// Approach: scan className string literals. For each physical utility, check
// whether the same className contains the matching logical counterpart (or
// the utility is allowlisted). This is a conservative scan — it may miss
// dynamic className construction via cn(), but those are already harder to
// reason about for RTL and deserve human review anyway.

const PHYSICAL_PAIRS: ReadonlyArray<{
  readonly physical: RegExp;
  readonly logicalRegex: RegExp;
  readonly logicalExamples: string;
  readonly family: string;
}> = [
  {
    physical: /(?<![\w-])((?:[a-z]+:)*)ml-([\w./[\]-]+)/g,
    logicalRegex: /(?<![\w-])(?:[a-z]+:)*ms-/,
    logicalExamples: "ms-*",
    family: "ml",
  },
  {
    physical: /(?<![\w-])((?:[a-z]+:)*)mr-([\w./[\]-]+)/g,
    logicalRegex: /(?<![\w-])(?:[a-z]+:)*me-/,
    logicalExamples: "me-*",
    family: "mr",
  },
  {
    physical: /(?<![\w-])((?:[a-z]+:)*)pl-([\w./[\]-]+)/g,
    logicalRegex: /(?<![\w-])(?:[a-z]+:)*ps-/,
    logicalExamples: "ps-*",
    family: "pl",
  },
  {
    physical: /(?<![\w-])((?:[a-z]+:)*)pr-([\w./[\]-]+)/g,
    logicalRegex: /(?<![\w-])(?:[a-z]+:)*pe-/,
    logicalExamples: "pe-*",
    family: "pr",
  },
  {
    physical: /(?<![\w-])((?:[a-z]+:)*)left-([\w./[\]-]+)/g,
    logicalRegex: /(?<![\w-])(?:[a-z]+:)*start-/,
    logicalExamples: "start-*",
    family: "left",
  },
  {
    physical: /(?<![\w-])((?:[a-z]+:)*)right-([\w./[\]-]+)/g,
    logicalRegex: /(?<![\w-])(?:[a-z]+:)*end-/,
    logicalExamples: "end-*",
    family: "right",
  },
];

const CLASSNAME_STRING_LITERAL = /className=(?:"([^"]*)"|'([^']*)')/g;
const CLASSNAME_IN_CN_CALL = /cn\(\s*["'`]([^"'`]+)["'`]/g;

export const scanPhysicalSpacing = (): readonly Finding[] => {
  const srcRoot = resolve("src");
  if (!existsSync(srcRoot)) return [];

  const allowlist = loadPhysicalSpacingExceptions();
  const files = walkFiles(srcRoot, isJsxFile).filter(
    (f) => !isAuditExcluded(f)
  );

  const findings: Finding[] = [];

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    const lines = contents.split("\n");

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === undefined) continue;

      // Gather every className literal on this line plus any cn()
      // string-literal arguments. Each captured group is one className
      // bundle.
      const bundles: string[] = [];
      for (const regex of [CLASSNAME_STRING_LITERAL, CLASSNAME_IN_CN_CALL]) {
        regex.lastIndex = 0;
        let m: RegExpExecArray | null = regex.exec(line);
        while (m !== null) {
          const captured = m[1] ?? m[2];
          if (captured !== undefined) bundles.push(captured);
          m = regex.exec(line);
        }
      }

      for (const bundle of bundles) {
        for (const pair of PHYSICAL_PAIRS) {
          pair.physical.lastIndex = 0;
          let match: RegExpExecArray | null = pair.physical.exec(bundle);
          while (match !== null) {
            const variantPrefix = match[1] ?? "";
            const modifier = match[2] ?? "";
            const utility = `${variantPrefix}${pair.family}-${modifier}`;

            // Allowlisted via baseline?
            if (
              allowlist.has(utility) ||
              allowlist.has(`${pair.family}-${modifier}`)
            ) {
              match = pair.physical.exec(bundle);
              continue;
            }

            // Logical counterpart present on the same element?
            if (pair.logicalRegex.test(bundle)) {
              match = pair.physical.exec(bundle);
              continue;
            }

            findings.push({
              severity: "Major",
              requirementId: "10.3",
              message: `Physical utility "${utility}" without logical counterpart ${pair.logicalExamples}. Use ${pair.logicalExamples} so the layout mirrors correctly in RTL Arabic.`,
              location: {
                file: relative(process.cwd(), file),
                line: i + 1,
              },
              detail: {
                rule: "no-physical-margin-or-padding",
                utility,
                family: pair.family,
                suggestedLogical: pair.logicalExamples,
              },
            });
            match = pair.physical.exec(bundle);
          }
        }
      }
    }
  }

  return findings;
};

// ─── Rule: no full-page skeleton (§10.5 / Req 9.8) ────────────────────────
//
// design-system.md: "No full-page skeleton loaders — use component-level
// shimmer." The anti-pattern is any `<Skeleton>` or `<Shimmer>` sized to the
// viewport via h-screen or min-h-screen. Scoped to src/pages/**.
//
// Regex is intentionally simple: we look for the component tag name followed
// within the tag body by a className containing `h-screen` or `min-h-screen`.
// Multi-line JSX elements are handled by collapsing whitespace across lines
// inside the tag body.

const FULL_VIEWPORT_CLASSES = /\b(?:min-)?h-screen\b/;

const containsFullViewportSkeleton = (contents: string): RegExpMatchArray[] => {
  const results: RegExpMatchArray[] = [];
  // Match <Skeleton ...> and <Shimmer ...> up to the first '>' (greedy
  // across newlines with `[\s\S]`). We only care about the opening tag.
  const tagRegex = /<(Skeleton|Shimmer)\b([\s\S]*?)\/?>/g;
  let match: RegExpExecArray | null = tagRegex.exec(contents);
  while (match !== null) {
    const tagBody = match[2] ?? "";
    if (FULL_VIEWPORT_CLASSES.test(tagBody)) {
      results.push(match);
    }
    match = tagRegex.exec(contents);
  }
  return results;
};

export const scanFullPageSkeletons = (): readonly Finding[] => {
  const pagesRoot = resolve("src", "pages");
  if (!existsSync(pagesRoot)) return [];

  const files = walkFiles(pagesRoot, isJsxFile).filter(
    (f) => !isAuditExcluded(f)
  );

  const findings: Finding[] = [];

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    const hits = containsFullViewportSkeleton(contents);
    for (const hit of hits) {
      const before = contents.slice(0, hit.index ?? 0);
      const line = before.split("\n").length;
      findings.push({
        severity: "Major",
        requirementId: "9.8",
        message: `<${hit[1]}> component sized to full viewport (h-screen / min-h-screen). Use component-level Shimmer placeholders — no full-page skeleton loaders per design-system.md.`,
        location: {
          file: relative(process.cwd(), file),
          line,
        },
        detail: {
          rule: "no-full-page-skeleton",
          component: hit[1],
        },
      });
    }
  }

  return findings;
};

// ─── Stage entry point ────────────────────────────────────────────────────

const ARTIFACT_NAME = "design-token-findings.json";

export const runDesignTokensStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const physicalFindings = scanPhysicalSpacing();
  const skeletonFindings = scanFullPageSkeletons();

  const allFindings: readonly Finding[] = [
    ...physicalFindings,
    ...skeletonFindings,
  ];

  const artifact: FindingsArtifact = {
    stage: "designTokens",
    generatedAt: new Date().toISOString(),
    requirementIds: ["10.3", "9.8"],
    findings: allFindings,
  };

  const artifactPath = writeFindingsArtifact(ARTIFACT_NAME, artifact);
  const durationMs = Date.now() - startedAt;

  const worst = worstSeverity(allFindings);
  const hardFail = worst === "Blocker" || worst === "Critical";

  return {
    name: "designTokens",
    status: hardFail ? "failed" : "passed",
    durationMs,
    artifact: artifactPath,
    message: `${allFindings.length} finding(s)${
      worst === null ? "" : ` — worst severity: ${worst}`
    }.${existsSync(resolve("src")) ? "" : " (src/ missing — nothing scanned)"}`,
  };
};

// Silence unused-import warning for `sep` in fs-walk when consumers don't
// need it; re-exported for downstream scanners.
export { sep };

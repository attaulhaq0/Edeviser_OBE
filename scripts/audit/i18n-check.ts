// Pre-deployment audit — i18n / RTL checker.
//
// Implements:
//   - Task 11.1 / Req 10.1: key-parity diff between src/locales/en/** and
//     src/locales/ar/**. Any key present in one locale but not the other is
//     a Major finding per requirements.md §10.6.
//   - Task 11.2 / Req 10.2: untranslated JSX literal scan. Walks JSX text
//     nodes and non-ARIA prop string literals; flags any that are not wrapped
//     in a <Trans> component or a t('...') call. Honors the i18n-allowlist
//     baseline for brand names and technical strings.
//
// Tasks 11.3–11.7 (per-role RTL screenshots) require a running Playwright
// browser and are implemented in tests/e2e/rtl/. Task 11.8 (locale-aware
// formatter unit tests) lives in src/__tests__/unit/localeFormatters.test.ts.

import { existsSync, readFileSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";

import {
  type Finding,
  type FindingsArtifact,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import { isAuditExcluded, isJsxFile, walkFiles } from "./fs-walk.ts";
import type { StageResult } from "./types.ts";

// ─── Locale loaders ────────────────────────────────────────────────────────

const localesRoot = (): string => resolve("src", "locales");
const localePath = (locale: string): string =>
  `${localesRoot()}${sep}${locale}`;

const isJsonFile = (name: string): boolean => name.endsWith(".json");

const i18nAllowlistPath = (): string =>
  resolve("audit", "baselines", "i18n-allowlist.json");

/**
 * Flatten a translation object to a set of dotted key paths.
 *   { login: { title: "..." } }  →  "login.title"
 *
 * Array-typed values are not expected in our locale shape; if one is found
 * it is collapsed to a single path pointing at the array itself so the
 * diff still works (developers fix it by removing the array).
 */
const flattenKeys = (
  value: unknown,
  prefix = "",
  out: Set<string> = new Set()
): Set<string> => {
  if (value === null || value === undefined) {
    out.add(prefix);
    return out;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    out.add(prefix);
    return out;
  }
  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    // Empty objects are meaningful only as terminal nodes; keep the prefix
    // so an en: {} vs ar: { a: "..." } diff is visible.
    out.add(prefix);
    return out;
  }
  for (const [k, v] of entries) {
    const nextPrefix = prefix === "" ? k : `${prefix}.${k}`;
    flattenKeys(v, nextPrefix, out);
  }
  return out;
};

interface NamespaceKeys {
  /** Namespace file basename without extension, e.g. "auth". */
  readonly namespace: string;
  /** Absolute path for diagnostics. */
  readonly filePath: string;
  /** Flattened keys, or null if the file failed to parse. */
  readonly keys: ReadonlySet<string> | null;
  /** Parse error message if keys === null. */
  readonly parseError?: string;
}

const loadLocale = (locale: string): readonly NamespaceKeys[] => {
  const root = localePath(locale);
  if (!existsSync(root)) return [];
  const files = walkFiles(root, isJsonFile);
  return files.map((file) => {
    const namespace = basename(file, ".json");
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
      return {
        namespace,
        filePath: file,
        keys: flattenKeys(parsed),
      };
    } catch (error) {
      return {
        namespace,
        filePath: file,
        keys: null,
        parseError: error instanceof Error ? error.message : "JSON parse error",
      };
    }
  });
};

// ─── Rule: locale key parity (§11.1 / Req 10.1) ───────────────────────────

export const scanLocaleKeyParity = (): readonly Finding[] => {
  const root = localesRoot();
  if (!existsSync(root)) {
    return [
      {
        severity: "Major",
        requirementId: "10.1",
        message: `Locales root ${relative(
          process.cwd(),
          root
        )} does not exist — i18n parity scan cannot proceed.`,
      },
    ];
  }

  const en = loadLocale("en");
  const ar = loadLocale("ar");

  const findings: Finding[] = [];

  // Parse errors first. A malformed JSON locale file is reported explicitly
  // so the scanner never silently skips it.
  for (const bundle of [...en, ...ar]) {
    if (bundle.keys === null) {
      findings.push({
        severity: "Major",
        requirementId: "10.1",
        message: `Unable to parse ${relative(
          process.cwd(),
          bundle.filePath
        )}: ${bundle.parseError ?? "unknown error"}`,
        location: {
          file: relative(process.cwd(), bundle.filePath),
        },
        detail: {
          rule: "locale-file-parse-error",
          namespace: bundle.namespace,
        },
      });
    }
  }

  // Namespace coverage: every namespace present in one locale should be
  // present in the other.
  const enNamespaces = new Set(en.map((b) => b.namespace));
  const arNamespaces = new Set(ar.map((b) => b.namespace));

  for (const ns of enNamespaces) {
    if (!arNamespaces.has(ns)) {
      findings.push({
        severity: "Major",
        requirementId: "10.1",
        message: `Namespace "${ns}.json" exists in en/ but not in ar/. Add src/locales/ar/${ns}.json.`,
        detail: { rule: "missing-namespace", namespace: ns, missingFrom: "ar" },
      });
    }
  }
  for (const ns of arNamespaces) {
    if (!enNamespaces.has(ns)) {
      findings.push({
        severity: "Major",
        requirementId: "10.1",
        message: `Namespace "${ns}.json" exists in ar/ but not in en/. Add src/locales/en/${ns}.json.`,
        detail: { rule: "missing-namespace", namespace: ns, missingFrom: "en" },
      });
    }
  }

  // Per-namespace key diff.
  const arByNamespace = new Map(ar.map((b) => [b.namespace, b]));
  for (const enBundle of en) {
    if (enBundle.keys === null) continue;
    const arBundle = arByNamespace.get(enBundle.namespace);
    if (arBundle === undefined || arBundle.keys === null) continue;

    const onlyInEn: string[] = [];
    const onlyInAr: string[] = [];

    for (const key of enBundle.keys) {
      if (!arBundle.keys.has(key)) onlyInEn.push(key);
    }
    for (const key of arBundle.keys) {
      if (!enBundle.keys.has(key)) onlyInAr.push(key);
    }

    for (const key of onlyInEn) {
      findings.push({
        severity: "Major",
        requirementId: "10.1",
        message: `Key "${key}" present in en/${enBundle.namespace}.json but missing from ar/${enBundle.namespace}.json.`,
        location: {
          file: relative(process.cwd(), arBundle.filePath),
        },
        detail: {
          rule: "key-missing-from-ar",
          namespace: enBundle.namespace,
          key,
        },
      });
    }
    for (const key of onlyInAr) {
      findings.push({
        severity: "Major",
        requirementId: "10.1",
        message: `Key "${key}" present in ar/${enBundle.namespace}.json but missing from en/${enBundle.namespace}.json.`,
        location: {
          file: relative(process.cwd(), enBundle.filePath),
        },
        detail: {
          rule: "key-missing-from-en",
          namespace: enBundle.namespace,
          key,
        },
      });
    }
  }

  return findings;
};

// ─── Rule: untranslated JSX literal scan (§11.2 / Req 10.2) ──────────────
//
// Walk JSX text nodes and non-ARIA prop string literals. Flag any that are
// not wrapped in a <Trans> component or a t('...') call. Honors the
// i18n-allowlist baseline for brand names, email placeholders, and other
// documented exceptions.
//
// Approach: regex-based scan over JSX files. We look for:
//   1. JSX text content: text between > and < that contains at least one
//      alphabetic character and is not purely whitespace/punctuation.
//   2. String prop literals: prop="value" or prop={'value'} where the prop
//      is not an ARIA attribute (aria-*, role, title, alt, placeholder,
//      htmlFor) and the value contains alphabetic characters.
//
// We skip lines that contain t(, <Trans, i18nKey=, or are inside comments.

interface I18nAllowlist {
  physicalSpacingExceptions?: readonly { utility: string }[];
  untranslatedExceptions?: readonly string[];
}

const loadUntranslatedAllowlist = (): ReadonlySet<string> => {
  const path = i18nAllowlistPath();
  if (!existsSync(path)) return new Set();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as I18nAllowlist | null;
    const exceptions = raw?.untranslatedExceptions ?? [];
    return new Set(exceptions.map((e) => e.trim().toLowerCase()));
  } catch {
    return new Set();
  }
};

// Matches JSX text content between tags: >some text<
// Captures the text content (group 1).
const JSX_TEXT_REGEX = />([^<>{}\n]+)</g;

// Matches string prop literals: propName="value" or propName={'value'}
// Captures prop name (group 1) and value (group 2 or 3).
const STRING_PROP_REGEX =
  /\b([a-zA-Z][a-zA-Z0-9-]*)=(?:"([^"]{2,})"|\{'([^']{2,})'\})/g;

// ARIA and technical props that are allowed to have untranslated strings.
const ARIA_PROPS = new Set([
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-placeholder",
  "role",
  "type",
  "name",
  "id",
  "htmlFor",
  "href",
  "src",
  "alt",
  "placeholder",
  "title",
  "data-testid",
  "data-cy",
  "className",
  "style",
  "key",
  "ref",
  "tabIndex",
  "autoComplete",
  "autoFocus",
  "disabled",
  "readOnly",
  "required",
  "pattern",
  "min",
  "max",
  "step",
  "rows",
  "cols",
  "accept",
  "multiple",
  "checked",
  "defaultChecked",
  "defaultValue",
  "value",
  "onChange",
  "onClick",
  "onSubmit",
  "onBlur",
  "onFocus",
  "onKeyDown",
  "onKeyUp",
  "onMouseEnter",
  "onMouseLeave",
]);

// Strings that are purely technical and should never be flagged.
const TECHNICAL_STRING_REGEX =
  /^(?:[a-z0-9_-]+|[A-Z][A-Z0-9_]+|https?:\/\/|\/[a-z]|#[a-z]|\d+|\s*)$/;

// Minimum length for a string to be considered a translatable literal.
const MIN_TRANSLATABLE_LENGTH = 3;

const containsAlpha = (s: string): boolean => /[a-zA-Z]/.test(s);

export const scanUntranslatedLiterals = (): readonly Finding[] => {
  const srcRoot = resolve("src", "pages");
  if (!existsSync(srcRoot)) return [];

  const allowlist = loadUntranslatedAllowlist();
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

      // Skip lines that already use i18n patterns.
      if (
        line.includes("t(") ||
        line.includes("<Trans") ||
        line.includes("i18nKey=") ||
        line.trimStart().startsWith("//") ||
        line.trimStart().startsWith("*")
      ) {
        continue;
      }

      // 1. JSX text content scan.
      JSX_TEXT_REGEX.lastIndex = 0;
      let m: RegExpExecArray | null = JSX_TEXT_REGEX.exec(line);
      while (m !== null) {
        const text = (m[1] ?? "").trim();
        if (
          text.length >= MIN_TRANSLATABLE_LENGTH &&
          containsAlpha(text) &&
          !TECHNICAL_STRING_REGEX.test(text) &&
          !allowlist.has(text.toLowerCase())
        ) {
          findings.push({
            severity: "Minor",
            requirementId: "10.2",
            message: `Untranslated JSX text literal: "${text.slice(
              0,
              60
            )}". Wrap with t('key') or <Trans>.`,
            location: {
              file: relative(process.cwd(), file),
              line: i + 1,
            },
            detail: {
              rule: "untranslated-jsx-literal",
              text: text.slice(0, 120),
            },
          });
        }
        m = JSX_TEXT_REGEX.exec(line);
      }

      // 2. String prop literal scan (non-ARIA props only).
      STRING_PROP_REGEX.lastIndex = 0;
      let pm: RegExpExecArray | null = STRING_PROP_REGEX.exec(line);
      while (pm !== null) {
        const propName = pm[1] ?? "";
        const value = (pm[2] ?? pm[3] ?? "").trim();
        if (
          !ARIA_PROPS.has(propName) &&
          value.length >= MIN_TRANSLATABLE_LENGTH &&
          containsAlpha(value) &&
          !TECHNICAL_STRING_REGEX.test(value) &&
          !allowlist.has(value.toLowerCase())
        ) {
          findings.push({
            severity: "Minor",
            requirementId: "10.2",
            message: `Untranslated string prop "${propName}="${value.slice(
              0,
              60
            )}"". Wrap with t('key') or <Trans>.`,
            location: {
              file: relative(process.cwd(), file),
              line: i + 1,
            },
            detail: {
              rule: "untranslated-prop-literal",
              propName,
              value: value.slice(0, 120),
            },
          });
        }
        pm = STRING_PROP_REGEX.exec(line);
      }
    }
  }

  return findings;
};

// ─── Stage entry point ────────────────────────────────────────────────────

const ARTIFACT_NAME = "i18n-findings.json";

export const runI18nStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const parityFindings = scanLocaleKeyParity();
  const untranslatedFindings = scanUntranslatedLiterals();

  const findings: readonly Finding[] = [
    ...parityFindings,
    ...untranslatedFindings,
  ];

  const artifact: FindingsArtifact = {
    stage: "i18n",
    generatedAt: new Date().toISOString(),
    requirementIds: ["10.1", "10.2"],
    findings,
  };

  const artifactPath = writeFindingsArtifact(ARTIFACT_NAME, artifact);
  const durationMs = Date.now() - startedAt;

  const worst = worstSeverity(findings);
  const hardFail = worst === "Blocker" || worst === "Critical";

  return {
    name: "i18n",
    status: hardFail ? "failed" : "passed",
    durationMs,
    artifact: artifactPath,
    message: `${findings.length} finding(s)${
      worst === null ? "" : ` — worst severity: ${worst}`
    }.`,
  };
};

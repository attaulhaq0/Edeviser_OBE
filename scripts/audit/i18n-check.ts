// Pre-deployment audit — i18n / RTL checker.
//
// Implements:
//   - Task 11.1 / Req 10.1: key-parity diff between src/locales/en/** and
//     src/locales/ar/**. Any key present in one locale but not the other is
//     a Major finding per requirements.md §10.6.
//
// Tasks 11.2 (untranslated JSX literal scan), 11.3–11.7 (per-role RTL
// screenshots), and 11.8 (locale-aware formatter unit tests) land in
// subsequent passes. This file already reads from the shared
// audit/baselines/i18n-allowlist.json baseline so those later scans can
// plug in without touching this module.

import { existsSync, readFileSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";

import {
  type Finding,
  type FindingsArtifact,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";
import type { StageResult } from "./types.ts";

// ─── Locale loaders ────────────────────────────────────────────────────────

const localesRoot = (): string => resolve("src", "locales");
const localePath = (locale: string): string =>
  `${localesRoot()}${sep}${locale}`;

const isJsonFile = (name: string): boolean => name.endsWith(".json");

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

// ─── Stage entry point ────────────────────────────────────────────────────

const ARTIFACT_NAME = "i18n-findings.json";

export const runI18nStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const findings = scanLocaleKeyParity();

  const artifact: FindingsArtifact = {
    stage: "i18n",
    generatedAt: new Date().toISOString(),
    requirementIds: ["10.1"],
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

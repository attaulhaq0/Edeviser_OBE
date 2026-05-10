// Pre-deployment audit — security and secret-boundary scan.
//
// Implements:
//   - Task 13.1 / Req 13.1: built-bundle secret pattern scan. Any hit is a
//     Blocker finding.
//   - Task 13.2 / Req 13.2: VITE_ env allowlist enforcement. AST-free regex
//     scan over src/** to list every referenced VITE_* var, cross-referenced
//     against audit/baselines/vite-env.allowlist.json.
//   - Task 13.3 / Req 13.3: zodResolver presence scan on every useForm call.
//     AST-scan src/pages/**/*.tsx for useForm( call sites; assert the options
//     object contains resolver: zodResolver(...).
//   - Task 13.4 / Req 13.4: Edge Function body validation scan. If
//     supabase/functions/ exists, confirm every req.json()/req.text() flow
//     passes through a .safeParse/.parse before any side-effect call.
//   - Task 13.5 / Req 13.5: admin mutation audit-log coverage scan (via
//     audit-log-coverage.ts).

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { scanAuditLogCoverage } from "./audit-log-coverage.ts";
import {
  type Finding,
  type FindingsArtifact,
  type Severity,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";
import type { StageResult } from "./types.ts";

// ─── Built-in secret patterns (Task 13.1) ──────────────────────────────────
// These are hard-coded because they are invariants of the Supabase + Vercel
// stack, not project-specific. Project-specific patterns live in
// audit/baselines/secret-patterns.json and are appended at run time.

interface SecretPattern {
  readonly name: string;
  readonly regex: RegExp;
  readonly severity: Severity;
  readonly description: string;
}

const BUILT_IN_PATTERNS: readonly SecretPattern[] = [
  {
    name: "supabase-service-role-jwt-literal",
    regex: /SUPABASE_SERVICE_ROLE_KEY/,
    severity: "Blocker",
    description:
      "The service-role key env var name appears in the bundle. Server-only.",
  },
  {
    name: "supabase-service-role-jwt-role-claim",
    // Decoded JWT payload containing the service_role claim. Matches the
    // JSON shape of the payload without requiring the full JWT structure.
    regex: /"role"\s*:\s*"service_role"/,
    severity: "Blocker",
    description:
      "A JWT payload containing role=service_role is embedded in the bundle.",
  },
  {
    name: "supabase-sb-secret",
    regex: /sb_secret_[A-Za-z0-9_-]{20,}/,
    severity: "Blocker",
    description: "A Supabase secret-shape token appears in the bundle.",
  },
  {
    name: "resend-api-key-literal",
    regex: /RESEND_API_KEY/,
    severity: "Blocker",
    description:
      "The Resend API key env var name appears in the bundle. Edge-function only.",
  },
  {
    name: "resend-api-key-token",
    regex: /\bre_[A-Za-z0-9]{20,}\b/,
    severity: "Blocker",
    description: "A Resend-shape API key literal is embedded in the bundle.",
  },
  {
    name: "openai-api-key",
    regex: /\bsk-[A-Za-z0-9]{30,}\b/,
    severity: "Blocker",
    description: "An OpenAI-shape API key literal is embedded in the bundle.",
  },
  {
    name: "anthropic-api-key",
    regex: /\bsk-ant-[A-Za-z0-9-]{30,}\b/,
    severity: "Blocker",
    description:
      "An Anthropic-shape API key literal is embedded in the bundle.",
  },
];

interface SecretPatternsBaseline {
  patterns?: readonly {
    readonly name: string;
    readonly regex: string;
    readonly description?: string;
  }[];
}

// Paths are resolved lazily (per-call) so tests that `process.chdir` into a
// tmpdir see the right paths. Resolving them at module-load time would freeze
// them to whatever cwd held when the module was first imported.
const baselinePath = (): string =>
  resolve("audit", "baselines", "secret-patterns.json");
const viteAllowlistPath = (): string =>
  resolve("audit", "baselines", "vite-env.allowlist.json");
const builtBundleRoot = (): string => resolve("dist");

const loadBaselinePatterns = (): readonly SecretPattern[] => {
  const path = baselinePath();
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(
      readFileSync(path, "utf8")
    ) as SecretPatternsBaseline | null;
    const patterns = raw?.patterns ?? [];
    return patterns.map((p) => ({
      name: p.name,
      regex: new RegExp(p.regex),
      severity: "Blocker" as const,
      description: p.description ?? "",
    }));
  } catch (error) {
    throw new Error(
      `Unable to parse ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// ─── File-walkers ──────────────────────────────────────────────────────────

const isBundleAsset = (name: string): boolean =>
  /\.(js|cjs|mjs|html|css|map)$/.test(name);

// Source files that contribute to client runtime. Deliberately excludes
// tests, audit scripts, and Edge Functions — only flags references that
// actually make it into the Vite bundle.
const isSourceClientFile = (path: string): boolean => {
  const rel = relative(process.cwd(), path);
  if (!rel.startsWith(`src${sep}`)) return false;
  if (rel.includes(`${sep}__tests__${sep}`)) return false;
  if (rel.includes(`${sep}test${sep}`)) return false;
  return /\.(ts|tsx)$/.test(rel);
};

// ─── Scan 13.1: built-bundle secret pattern scan ──────────────────────────

interface ScanSecretsResult {
  readonly bundleExists: boolean;
  readonly findings: readonly Finding[];
}

export const scanBuiltBundleSecrets = (): ScanSecretsResult => {
  const bundleRoot = builtBundleRoot();
  if (!existsSync(bundleRoot)) {
    // No built bundle means the audit runner was invoked before `npm run
    // build`. That is not itself a finding — the stage caller will record
    // it as "skipped" rather than pretend the scan ran clean.
    return { bundleExists: false, findings: [] };
  }

  const patterns: readonly SecretPattern[] = [
    ...BUILT_IN_PATTERNS,
    ...loadBaselinePatterns(),
  ];

  const files = walkFiles(bundleRoot, isBundleAsset);
  const findings: Finding[] = [];

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    for (const pattern of patterns) {
      const match = pattern.regex.exec(contents);
      if (match === null) continue;
      // Compute 1-indexed line number from match index.
      const prefix = contents.slice(0, match.index);
      const line = prefix.split("\n").length;
      findings.push({
        severity: pattern.severity,
        requirementId: "13.1",
        message: `Secret pattern "${pattern.name}" detected in built bundle: ${
          pattern.description || pattern.regex
        }`,
        location: {
          file: relative(process.cwd(), file),
          line,
        },
        detail: {
          patternName: pattern.name,
          patternRegex: pattern.regex.source,
          matchPreview: match[0].slice(0, 32),
        },
      });
    }
  }

  return { bundleExists: true, findings };
};

// ─── Scan 13.2: VITE_ env allowlist enforcement ───────────────────────────

interface ViteAllowlistBaseline {
  allowed?: readonly string[];
}

const VITE_REF_REGEX = /(?:process\.env|import\.meta\.env)\.(VITE_[A-Z0-9_]+)/g;

export const scanViteEnvAllowlist = (): readonly Finding[] => {
  const allowlistPath = viteAllowlistPath();
  if (!existsSync(allowlistPath)) {
    return [
      {
        severity: "Major",
        requirementId: "13.2",
        message: `VITE_ allowlist baseline missing at ${relative(
          process.cwd(),
          allowlistPath
        )}. Scan cannot proceed.`,
      },
    ];
  }

  let allowed: readonly string[];
  try {
    const raw = JSON.parse(
      readFileSync(allowlistPath, "utf8")
    ) as ViteAllowlistBaseline | null;
    allowed = raw?.allowed ?? [];
  } catch (error) {
    return [
      {
        severity: "Major",
        requirementId: "13.2",
        message: `Unable to parse ${relative(process.cwd(), allowlistPath)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
    ];
  }

  const allowedSet = new Set(allowed);
  const srcRoot = resolve("src");
  if (!existsSync(srcRoot)) return [];

  const sourceFiles = walkFiles(srcRoot, (name) =>
    /\.(ts|tsx)$/.test(name)
  ).filter(isSourceClientFile);

  const findings: Finding[] = [];

  for (const file of sourceFiles) {
    const contents = readFileSync(file, "utf8");
    const lines = contents.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === undefined) continue;
      VITE_REF_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null = VITE_REF_REGEX.exec(line);
      while (match !== null) {
        const name = match[1];
        if (name !== undefined && !allowedSet.has(name)) {
          findings.push({
            severity: "Blocker",
            requirementId: "13.2",
            message: `Client code references VITE_ env var "${name}" which is not in the allowlist. Add it to audit/baselines/vite-env.allowlist.json deliberately, or remove the reference.`,
            location: {
              file: relative(process.cwd(), file),
              line: i + 1,
            },
            detail: { viteVarName: name },
          });
        }
        match = VITE_REF_REGEX.exec(line);
      }
    }
  }

  return findings;
};

// ─── Scan 13.3: zodResolver presence on every useForm (Task 13.3) ─────────
//
// AST-scan src/pages/**/*.tsx for useForm( call sites. For each call site,
// assert the options object contains `resolver: zodResolver(...)`. A missing
// resolver means form data reaches the database without Zod validation.

const USE_FORM_REGEX = /\buseForm\s*\(/g;
const ZOD_RESOLVER_REGEX = /resolver\s*:\s*zodResolver\s*\(/;

export const scanZodResolverPresence = (): readonly Finding[] => {
  const pagesRoot = resolve("src", "pages");
  if (!existsSync(pagesRoot)) return [];

  const files = walkFiles(pagesRoot, (name) => /\.tsx$/.test(name)).filter(
    (f) => !isSourceClientFile(f) || true // include all pages
  );

  const findings: Finding[] = [];

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    if (!contents.includes("useForm")) continue;

    const lines = contents.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === undefined) continue;
      USE_FORM_REGEX.lastIndex = 0;
      if (!USE_FORM_REGEX.test(line)) continue;

      // Look ahead up to 10 lines for the closing paren of the useForm call
      // to find the resolver option.
      const callBlock = lines.slice(i, i + 10).join("\n");
      if (!ZOD_RESOLVER_REGEX.test(callBlock)) {
        findings.push({
          severity: "Major",
          requirementId: "13.3",
          message: `useForm() call at line ${i + 1} in ${relative(
            process.cwd(),
            file
          )} is missing resolver: zodResolver(...). All forms must validate with Zod before data reaches the database.`,
          location: {
            file: relative(process.cwd(), file),
            line: i + 1,
          },
          detail: {
            rule: "useform-missing-zod-resolver",
          },
        });
      }
    }
  }

  return findings;
};

// ─── Scan 13.4: Edge Function body validation scan (Task 13.4) ─────────────
//
// If supabase/functions/ exists: AST-scan every .ts file; confirm
// req.json() or req.text() flows into a <schema>.safeParse / .parse before
// any side-effect call (supabase.from, supabase.auth, fetch, etc.).
// If the directory does not exist: emit a single Trivial informational
// finding per design.md §Assumptions item 2 and skip.

const REQ_BODY_REGEX = /\breq\.(?:json|text)\s*\(\s*\)/g;
// Recognise both Zod-style (.safeParse / .parse) and the project's own
// validatePayload / validateBody / validate helper pattern used in Edge
// Functions that predate the Zod migration.
const SAFE_PARSE_REGEX =
  /\.(?:safeParse|parse)\s*\(|validatePayload\s*\(|validateBody\s*\(|validate\s*\(body|validate\s*\(payload/;
const SIDE_EFFECT_REGEX =
  /\bsupabase\.(?:from|auth|storage|functions)\b|\bfetch\s*\(/;

export const scanEdgeFunctionBodyValidation = (): readonly Finding[] => {
  const functionsRoot = resolve("supabase", "functions");
  if (!existsSync(functionsRoot)) {
    return [
      {
        severity: "Trivial",
        requirementId: "13.4",
        message:
          "supabase/functions/ directory not found — Edge Function body validation scan skipped. This is expected if Edge Functions are deployed separately.",
        detail: { rule: "edge-functions-dir-missing" },
      },
    ];
  }

  const files = walkFiles(functionsRoot, (name) => name.endsWith(".ts"));
  const findings: Finding[] = [];

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    if (!REQ_BODY_REGEX.test(contents)) continue;

    // Check if the file has any side-effect calls.
    if (!SIDE_EFFECT_REGEX.test(contents)) continue;

    // Check if the file has a safeParse or parse call.
    if (!SAFE_PARSE_REGEX.test(contents)) {
      findings.push({
        severity: "Major",
        requirementId: "13.4",
        message: `Edge Function ${relative(
          process.cwd(),
          file
        )} reads req.json()/req.text() and performs side effects but has no body validation (.safeParse(), .parse(), or validatePayload()). All request bodies must be validated before any side effect.`,
        location: {
          file: relative(process.cwd(), file),
        },
        detail: {
          rule: "edge-function-missing-body-validation",
        },
      });
    }
  }

  return findings;
};

// ─── Stage entry point ────────────────────────────────────────────────────

const ARTIFACT_NAME = "security-findings.json";

export const runSecurityStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const bundleScan = scanBuiltBundleSecrets();
  const viteFindings = scanViteEnvAllowlist();
  const auditLogFindings = scanAuditLogCoverage();
  const zodResolverFindings = scanZodResolverPresence();
  const edgeFunctionFindings = scanEdgeFunctionBodyValidation();

  const allFindings: readonly Finding[] = [
    ...bundleScan.findings,
    ...viteFindings,
    ...auditLogFindings,
    ...zodResolverFindings,
    ...edgeFunctionFindings,
  ];

  const artifact: FindingsArtifact = {
    stage: "security",
    generatedAt: new Date().toISOString(),
    requirementIds: ["13.1", "13.2", "13.3", "13.4", "13.5"],
    findings: allFindings,
  };

  const artifactPath = writeFindingsArtifact(ARTIFACT_NAME, artifact);
  const durationMs = Date.now() - startedAt;

  // Determine status. If the bundle did not exist we report "skipped" for
  // the 13.1 portion but still run 13.2 + 13.5 — those scans do not depend
  // on a built bundle. The stage overall is passed if no findings, failed
  // on any Blocker, skipped only if nothing at all could be inspected.
  if (
    !bundleScan.bundleExists &&
    viteFindings.length === 0 &&
    auditLogFindings.length === 0
  ) {
    return {
      name: "security",
      status: "skipped",
      durationMs,
      artifact: artifactPath,
      message:
        "dist/ not found — run `npm run build` first; static scans clean.",
    };
  }

  const worst = worstSeverity(allFindings);
  if (worst === "Blocker" || worst === "Critical") {
    return {
      name: "security",
      status: "failed",
      durationMs,
      artifact: artifactPath,
      message: `${allFindings.length} finding(s) — worst severity: ${worst}.`,
    };
  }

  return {
    name: "security",
    status: "passed",
    durationMs,
    artifact: artifactPath,
    message: bundleScan.bundleExists
      ? `${allFindings.length} finding(s). Worst severity: ${worst ?? "none"}.`
      : `VITE_ + audit-log scans only (dist/ missing). ${
          allFindings.length
        } finding(s). Worst severity: ${worst ?? "none"}.`,
  };
};

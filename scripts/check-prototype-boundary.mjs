
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const REPOSITORY_ROOT = resolve(process.cwd());
const PRODUCTION_DIRECTORIES = ["src", "api", "public", "supabase/functions"];
const PRODUCTION_ROOT_FILES = ["index.html", "vite.config.ts", "vercel.json"];
const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".mjs",
  ".ts",
  ".tsx",
]);
const TEXT_ARTIFACT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".xml",
]);
const PROTOTYPE_MARKERS = [
  "EDEVISER PROTOTYPE — Shared Utilities",
  "EDEVISER PROTOTYPE — Shared Design System",
  "Frontend-only. No backend. All data is mock.",
];

const normalizePath = (value) =>
  value.replaceAll("\\", "/").replace(/^\.\//, "");
const isPrototypePath = (value) =>
  normalizePath(value).startsWith("prototype/");
const isProductionPath = (value) => {
  const path = normalizePath(value);
  return (
    PRODUCTION_DIRECTORIES.some(
      (directory) => path === directory || path.startsWith(`${directory}/`)
    ) || PRODUCTION_ROOT_FILES.includes(path)
  );
};

const lineNumberAt = (content, index) =>
  content.slice(0, index).split("\n").length;

const walkFiles = (directory) => {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const referencesPrototype = (specifier) => {
  const normalized = specifier.replaceAll("\\", "/");
  return /(^|\/)prototype(?:\/|$)/.test(normalized);
};

export const evaluatePrototypeDiff = (diffText, options = {}) => {
  const failures = [];
  const prototypeDeletions = [];
  const productionAdditions = [];
  const headRef = options.headRef ?? "";

  if (headRef === "archive/final-prototype-20260812") {
    failures.push("the frozen prototype archive branch must never target main");
  }

  for (const line of diffText.split(/\r?\n/).filter(Boolean)) {
    const [rawStatus, ...paths] = line.split("\t");
    const status = rawStatus[0];

    if ((status === "R" || status === "C") && paths.length >= 2) {
      const [fromPath, toPath] = paths.map(normalizePath);
      if (isPrototypePath(fromPath) || isPrototypePath(toPath)) {
        failures.push(
          `${
            status === "R" ? "rename" : "copy"
          } crosses the prototype boundary: ${fromPath} -> ${toPath}`
        );
      }
      continue;
    }

    const path = normalizePath(paths[0] ?? "");
    if (!path) continue;

    if (status === "D" && isPrototypePath(path)) {
      prototypeDeletions.push(path);
      continue;
    }

    if (isPrototypePath(path)) {
      failures.push(
        `prototype files are reference-only (${rawStatus}: ${path})`
      );
    }

    if (status === "A" && isProductionPath(path)) {
      productionAdditions.push(path);
    }
  }

  // Git rename detection is heuristic. Treat a prototype deletion combined with
  // a production-source addition as a possible move and require the deletion to
  // be isolated in its dedicated cleanup PR.
  if (prototypeDeletions.length > 0 && productionAdditions.length > 0) {
    failures.push(
      `possible prototype move detected (deleted ${prototypeDeletions.join(
        ", "
      )}; added ${productionAdditions.join(", ")})`
    );
  }

  return failures;
};

const SPECIFIER_PATTERNS = [
  /^\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]{0,500}?\s+from\s*)?["'`]([^"'`]+)["'`]/gm,
  /\b(?:import|require|fetch|new\s+Worker)\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /\bnew\s+URL\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /\b(?:src|href|to)\s*=\s*["'`]([^"'`]+)["'`]/g,
  /@import\s+(?:url\(\s*)?["'`]([^"'`]+)["'`]/g,
  /url\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
];

export const scanProductionReferences = (rootDirectory = REPOSITORY_ROOT) => {
  const findings = [];
  const candidates = [];

  for (const directory of PRODUCTION_DIRECTORIES) {
    candidates.push(...walkFiles(resolve(rootDirectory, directory)));
  }
  for (const filename of PRODUCTION_ROOT_FILES) {
    const fullPath = resolve(rootDirectory, filename);
    if (existsSync(fullPath) && statSync(fullPath).isFile())
      candidates.push(fullPath);
  }

  for (const file of candidates) {
    const repositoryPath = normalizePath(relative(rootDirectory, file));
    if (
      repositoryPath.includes("/__tests__/") ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(repositoryPath) ||
      !SOURCE_EXTENSIONS.has(extname(file).toLowerCase())
    ) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    for (const pattern of SPECIFIER_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of content.matchAll(pattern)) {
        if (referencesPrototype(match[1])) {
          findings.push(
            `${repositoryPath}:${lineNumberAt(
              content,
              match.index ?? 0
            )} references ${match[1]}`
          );
        }
      }
    }
  }

  return [...new Set(findings)].sort();
};

const prototypeOnlyRelativePaths = (rootDirectory) => {
  const prototypeDirectory = resolve(rootDirectory, "prototype");
  return new Set(
    walkFiles(prototypeDirectory)
      .map((file) => normalizePath(relative(prototypeDirectory, file)))
      .filter((path) => path !== "index.html" && path !== "README.md")
  );
};

export const scanBuildArtifacts = (
  rootDirectory = REPOSITORY_ROOT,
  distDirectory = resolve(rootDirectory, "dist")
) => {
  if (!existsSync(distDirectory)) return [];

  const findings = [];
  const prototypePaths = prototypeOnlyRelativePaths(rootDirectory);
  for (const file of walkFiles(distDirectory)) {
    const artifactPath = normalizePath(relative(distDirectory, file));
    if (artifactPath.split("/").includes("prototype")) {
      findings.push(`${artifactPath} is inside a prototype path`);
    }
    if (prototypePaths.has(artifactPath)) {
      findings.push(`${artifactPath} matches a prototype-only page or asset`);
    }

    if (!TEXT_ARTIFACT_EXTENSIONS.has(extname(file).toLowerCase())) continue;
    const content = readFileSync(file, "utf8");
    for (const marker of PROTOTYPE_MARKERS) {
      if (content.includes(marker)) {
        findings.push(
          `${artifactPath} contains prototype-only marker: ${marker}`
        );
      }
    }
  }

  return [...new Set(findings)].sort();
};

const parseArguments = (argv) => {
  const options = {
    baseSha: process.env.PROTOTYPE_BASE_SHA ?? "",
    headRef: process.env.GITHUB_HEAD_REF ?? "",
    distDirectory: resolve(REPOSITORY_ROOT, "dist"),
    skipDiff: false,
    skipDist: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-sha") options.baseSha = argv[++index] ?? "";
    else if (argument === "--head-ref") options.headRef = argv[++index] ?? "";
    else if (argument === "--dist") {
      options.distDirectory = resolve(REPOSITORY_ROOT, argv[++index] ?? "dist");
    } else if (argument === "--skip-diff") options.skipDiff = true;
    else if (argument === "--skip-dist") options.skipDist = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
};

export const runPrototypeBoundaryCheck = (options) => {
  const failures = [];

  if (!options.skipDiff) {
    if (!options.baseSha) {
      throw new Error("--base-sha is required unless --skip-diff is used");
    }
    const diff = execFileSync(
      "git",
      [
        "diff",
        "--name-status",
        "--find-renames=1%",
        "--find-copies=1%",
        `${options.baseSha}...HEAD`,
      ],
      { cwd: REPOSITORY_ROOT, encoding: "utf8" }
    );
    failures.push(...evaluatePrototypeDiff(diff, { headRef: options.headRef }));
  }

  failures.push(...scanProductionReferences(REPOSITORY_ROOT));
  if (!options.skipDist) {
    if (!existsSync(options.distDirectory)) {
      failures.push(
        `build output is missing: ${relative(
          REPOSITORY_ROOT,
          options.distDirectory
        )}`
      );
    } else {
      failures.push(
        ...scanBuildArtifacts(REPOSITORY_ROOT, options.distDirectory)
      );
    }
  }

  return failures;
};

const isDirectInvocation =
  process.argv[1] &&
  resolve(process.argv[1]) ===
    resolve(REPOSITORY_ROOT, "scripts/check-prototype-boundary.mjs");

if (isDirectInvocation) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const failures = runPrototypeBoundaryCheck(options);
    if (failures.length > 0) {
      console.error("Prototype Boundary: FAIL");
      for (const failure of failures) console.error(`- ${failure}`);
      process.exit(1);
    }
    console.log("Prototype Boundary: PASS");
    console.log("- prototype diff policy: clean");
    console.log("- production import/reference scan: clean");
    console.log(
      `- build artifact scan: ${options.skipDist ? "skipped" : "clean"}`
    );
  } catch (error) {
    console.error(
      `Prototype Boundary: FAIL\n- ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  }
}

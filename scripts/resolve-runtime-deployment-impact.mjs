
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  isRuntimeDependencyPath,
  matchesRuntimeDependencyPath,
} from "./runtime-dependency-paths.mjs";
const ROOT = resolve(process.cwd());
const MANIFEST_PATH = resolve(ROOT, "scripts/runtime-dependency-manifest.json");
const CONFIG_PATH = resolve(ROOT, "supabase/config.toml");
const POLICY_PATH = resolve(
  ROOT,
  "scripts/edge-function-ownership-policy.json"
);
const FUNCTIONS_PATH = resolve(ROOT, "supabase/functions");
const SAFE_FUNCTION_SLUG = /^[a-z0-9][a-z0-9-]*$/;

const normalizePath = (value) =>
  value.replaceAll("\\", "/").replace(/^\.\//, "");
const uniqueSorted = (values) => [...new Set(values)].sort();

export const readManifest = () =>
  JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

export const readVerifyJwtPolicy = (
  source = readFileSync(CONFIG_PATH, "utf8")
) => {
  const values = new Map();
  let current = null;
  for (const line of source.split(/\r?\n/)) {
    const section = line.match(/^\[functions\.([^\]]+)\]\s*$/);
    if (section) {
      current = section[1];
      continue;
    }
    const value = line.match(/^verify_jwt\s*=\s*(true|false)\s*$/);
    if (current && value) values.set(current, value[1] === "true");
    if (/^\[/.test(line) && !section) current = null;
  }
  return values;
};

const sourceFunctions = () =>
  readdirSync(FUNCTIONS_PATH, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name !== "_shared" &&
        entry.name !== "audit-fixtures"
    )
    .map((entry) => entry.name)
    .sort();

export const validateManifest = (manifest = readManifest()) => {
  const failures = [];
  const seenFunctions = new Set();
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  const expectedVerifyJwt = readVerifyJwtPolicy();
  const source = new Set(sourceFunctions());
  const declared = new Set();

  for (const group of manifest.runtimeGroups ?? []) {
    if (!group.name || !Array.isArray(group.functions)) {
      failures.push("every runtime group must declare a name and functions");
      continue;
    }
    for (const functionDefinition of group.functions) {
      const slug = functionDefinition.slug;
      if (!slug || typeof functionDefinition.verifyJwt !== "boolean") {
        failures.push(`${group.name} has an invalid function declaration`);
        continue;
      }
      if (!SAFE_FUNCTION_SLUG.test(slug)) {
        failures.push(`${slug} is not a safe Edge Function slug`);
        continue;
      }
      if (seenFunctions.has(slug))
        failures.push(`${slug} is declared in more than one runtime group`);
      seenFunctions.add(slug);
      declared.add(slug);
      if (!source.has(slug))
        failures.push(
          `${slug} is declared by the manifest but has no source directory`
        );
      const configured = expectedVerifyJwt.get(slug) ?? true;
      if (configured !== functionDefinition.verifyJwt) {
        failures.push(
          `${slug} verify_jwt mismatch (manifest ${functionDefinition.verifyJwt}; config ${configured})`
        );
      }
    }
    if (!Array.isArray(group.runtimeDependencyPaths)) {
      failures.push(`${group.name} must declare runtimeDependencyPaths`);
      continue;
    }
    for (const dependencyPath of group.runtimeDependencyPaths) {
      if (!isRuntimeDependencyPath(dependencyPath)) {
        failures.push(
          `${group.name} has an invalid runtime dependency path: ${dependencyPath}`
        );
        continue;
      }
      const isGlob = dependencyPath.endsWith("/**");
      const dependencyRoot = resolve(
        ROOT,
        isGlob ? dependencyPath.slice(0, -3) : dependencyPath
      );
      if (
        !existsSync(dependencyRoot) ||
        (isGlob
          ? !statSync(dependencyRoot).isDirectory()
          : !statSync(dependencyRoot).isFile())
      ) {
        failures.push(
          `${group.name} runtime dependency does not exist: ${dependencyPath}`
        );
        continue;
      }
      const relativeToFunctions = dependencyPath.slice(
        "supabase/functions/".length
      );
      const owner = relativeToFunctions.split("/")[0];
      if (
        owner !== "_shared" &&
        !group.functions.some((definition) => definition.slug === owner)
      ) {
        failures.push(
          `${group.name} cross-function dependency must belong to its governed group: ${dependencyPath}`
        );
      }
    }
  }

  for (const slug of Object.keys(policy.exceptionalSourceFunctions ?? {})) {
    if (!source.has(slug))
      failures.push(
        `${slug} is classified as an exceptional source function but has no source directory`
      );
    if (declared.has(slug))
      failures.push(
        `${slug} cannot be both runtime-managed and an exceptional source function`
      );
  }
  return { failures, declaredFunctions: uniqueSorted([...declared]) };
};

export const resolveDeploymentImpact = (
  changedPaths,
  manifest = readManifest()
) => {
  const validation = validateManifest(manifest);
  const errors = [...validation.failures];
  const groups = new Map(
    (manifest.runtimeGroups ?? []).map((group) => [group.name, group])
  );
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  const affectedGroupNames = new Set();
  const directFunctions = new Set();
  const sharedRuntimePaths = [];

  for (const rawPath of changedPaths) {
    const path = normalizePath(rawPath);
    const functionMatch = path.match(/^supabase\/functions\/([^/]+)\//);
    if (
      functionMatch &&
      functionMatch[1] !== "_shared" &&
      functionMatch[1] !== "audit-fixtures"
    ) {
      const group = [...groups.values()].find((candidate) =>
        candidate.functions.some((item) => item.slug === functionMatch[1])
      );
      if (group) {
        affectedGroupNames.add(group.name);
        directFunctions.add(functionMatch[1]);
      } else if (!policy.exceptionalSourceFunctions?.[functionMatch[1]]) {
        errors.push(`unmanaged Edge Function changed: ${path}`);
      }
      continue;
    }
    if (path.startsWith("supabase/functions/_shared/")) {
      const consumers = [...groups.values()].filter((group) =>
        (group.runtimeDependencyPaths ?? []).some((dependency) =>
          matchesRuntimeDependencyPath(path, dependency)
        )
      );
      if (consumers.length === 0)
        errors.push(`unknown shared runtime dependency changed: ${path}`);
      for (const group of consumers) affectedGroupNames.add(group.name);
      sharedRuntimePaths.push(path);
      continue;
    }
    if (path === "supabase/config.toml") {
      for (const group of groups.values()) affectedGroupNames.add(group.name);
    }
  }

  const affectedGroups = uniqueSorted([...affectedGroupNames]);
  const functions = uniqueSorted(
    affectedGroups.flatMap((groupName) =>
      groups.get(groupName).functions.map((item) => item.slug)
    )
  );
  return {
    changedPaths: uniqueSorted(changedPaths.map(normalizePath)),
    directFunctions: uniqueSorted([...directFunctions]),
    sharedRuntimePaths: uniqueSorted(sharedRuntimePaths),
    affectedGroups,
    functions,
    deploymentRequired: functions.length > 0,
    errors: uniqueSorted(errors),
  };
};

const parseArguments = (argv) => {
  const options = {
    baseSha: "",
    headSha: "",
    paths: [],
    format: "json",
    validateOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-sha") options.baseSha = argv[++index] ?? "";
    else if (argument === "--head-sha") options.headSha = argv[++index] ?? "";
    else if (argument === "--paths")
      options.paths = (argv[++index] ?? "").split(",").filter(Boolean);
    else if (argument === "--format") options.format = argv[++index] ?? "json";
    else if (argument === "--validate") options.validateOnly = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (
    !options.validateOnly &&
    options.paths.length === 0 &&
    (!options.baseSha || !options.headSha)
  ) {
    throw new Error("provide --paths or both --base-sha and --head-sha");
  }
  return options;
};

const changedPathsFromGit = (baseSha, headSha) =>
  execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACDMRT", baseSha, headSha],
    { cwd: ROOT, encoding: "utf8" }
  )
    .split(/\r?\n/)
    .filter(Boolean);

const main = () => {
  const options = parseArguments(process.argv.slice(2));
  const validation = validateManifest();
  const result = options.validateOnly
    ? {
        ...resolveDeploymentImpact([], readManifest()),
        errors: validation.failures,
      }
    : resolveDeploymentImpact(
        options.paths.length > 0
          ? options.paths
          : changedPathsFromGit(options.baseSha, options.headSha)
      );
  if (options.format === "github") {
    console.log(`deployment_required=${result.deploymentRequired}`);
    console.log(`deployment_closure=${result.functions.join(" ")}`);
    console.log(`runtime_groups=${result.affectedGroups.join(",")}`);
    console.log(
      `shared_runtime_changed=${result.sharedRuntimePaths.length > 0}`
    );
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  if (result.errors.length > 0) {
    for (const error of result.errors)
      console.error(`Runtime dependency governance: ${error}`);
    process.exit(1);
  }
};

if (process.argv[1]?.endsWith("resolve-runtime-deployment-impact.mjs")) main();

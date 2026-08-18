#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FUNCTIONS_DIRECTORY = resolve(ROOT, "supabase/functions");
const CONFIG_PATH = resolve(ROOT, "supabase/config.toml");
const POLICY_PATH = resolve(
  ROOT,
  "scripts/edge-function-ownership-policy.json"
);
const MANIFEST_PATH = resolve(ROOT, "scripts/runtime-dependency-manifest.json");

const managedFunctions = () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  return manifest.runtimeGroups.flatMap((group) =>
    group.functions.map((definition) => definition.slug)
  );
};

const parseArguments = (argv) => {
  const options = { deployedJson: "", verbose: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--deployed-json")
      options.deployedJson = argv[++index] ?? "";
    else if (argv[index] === "--verbose") options.verbose = true;
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  if (!options.deployedJson)
    throw new Error("--deployed-json <path|-> is required");
  return options;
};

const readStandardInput = async () => {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
};

const sourceFunctions = () =>
  readdirSync(FUNCTIONS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
    .map((entry) => entry.name)
    .sort();

const verifyJwtPolicy = () => {
  const config = readFileSync(CONFIG_PATH, "utf8");
  const overrides = new Map();
  let currentFunction = null;
  for (const line of config.split(/\r?\n/)) {
    const section = line.match(/^\[functions\.([^\]]+)\]\s*$/);
    if (section) {
      currentFunction = section[1];
      continue;
    }
    const verify = line.match(/^verify_jwt\s*=\s*(true|false)\s*$/);
    if (currentFunction && verify)
      overrides.set(currentFunction, verify[1] === "true");
    if (/^\[/.test(line) && !section) currentFunction = null;
  }
  return overrides;
};

const cronFunctions = () => {
  const names = new Set();
  const cronDirectory = resolve(ROOT, "api/cron");
  for (const entry of readdirSync(cronDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const content = readFileSync(resolve(cronDirectory, entry.name), "utf8");
    for (const match of content.matchAll(
      /invokeEdgeFunction\(\s*["']([^"']+)["']/g
    )) {
      names.add(match[1]);
    }
  }
  for (const name of sourceFunctions()) {
    const entrypoint = resolve(FUNCTIONS_DIRECTORY, name, "index.ts");
    const content = readFileSync(entrypoint, "utf8");
    if (
      name.endsWith("-cron") ||
      content.includes('Deno.env.get("CRON_SECRET")')
    ) {
      names.add(name);
    }
  }
  return names;
};

const normalizeDeploymentPayload = (payload) => {
  const parsed = JSON.parse(payload);
  const functions = Array.isArray(parsed) ? parsed : parsed.functions;
  if (!Array.isArray(functions))
    throw new Error("deployed JSON has no functions array");
  return functions.map((entry) => ({
    name: String(entry.slug ?? entry.name ?? ""),
    status: String(entry.status ?? "UNKNOWN"),
    verifyJwt: entry.verify_jwt,
    version: entry.version ?? null,
  }));
};

const sameNames = (actual, expected) =>
  actual.length === expected.length &&
  actual.every((item, index) => item === expected[index]);

export const buildEdgeFunctionInventory = (deployments, policy) => {
  const source = sourceFunctions();
  const deployed = deployments
    .map((entry) => entry.name)
    .filter(Boolean)
    .sort();
  const verifyOverrides = verifyJwtPolicy();
  const cron = cronFunctions();
  const allNames = [...new Set([...source, ...deployed])].sort();

  return allNames.map((name) => {
    const deployment = deployments.find((entry) => entry.name === name);
    const sourceControlled = source.includes(name);
    const isDeployed = deployed.includes(name);
    const expectedVerifyJwt = verifyOverrides.get(name) ?? true;
    const categories = [];
    if (sourceControlled) categories.push("SOURCE CONTROLLED");
    if (isDeployed) categories.push("DEPLOYED");
    if (sourceControlled && expectedVerifyJwt === false)
      categories.push("INTENTIONALLY PUBLIC");
    if (cron.has(name)) categories.push("CRON INTERNAL");
    if (name.includes("webhook")) categories.push("WEBHOOK");
    if (policy.legacy[name]) categories.push("LEGACY");
    if (sourceControlled !== isDeployed) categories.push("DRIFTED / UNKNOWN");

    return {
      name,
      sourceControlled,
      deployed: isDeployed,
      status: deployment?.status ?? null,
      version: deployment?.version ?? null,
      expectedVerifyJwt: sourceControlled ? expectedVerifyJwt : null,
      deployedVerifyJwt: deployment?.verifyJwt ?? null,
      categories,
    };
  });
};

export const checkEdgeFunctionInventory = (
  inventory,
  policy,
  required = managedFunctions()
) => {
  const failures = [];
  const sourceOnly = inventory
    .filter((entry) => entry.sourceControlled && !entry.deployed)
    .map((entry) => entry.name)
    .sort();
  const deployedOnly = inventory
    .filter((entry) => !entry.sourceControlled && entry.deployed)
    .map((entry) => entry.name)
    .sort();
  const expectedSourceOnly = [...policy.allowedDrift.sourceOnly].sort();
  const expectedDeployedOnly = [...policy.allowedDrift.deployedOnly].sort();

  if (!sameNames(sourceOnly, expectedSourceOnly)) {
    failures.push(
      `source-only drift changed (expected ${
        expectedSourceOnly.join(", ") || "none"
      }; actual ${sourceOnly.join(", ") || "none"})`
    );
  }
  if (!sameNames(deployedOnly, expectedDeployedOnly)) {
    failures.push(
      `deployed-only drift changed (expected ${
        expectedDeployedOnly.join(", ") || "none"
      }; actual ${deployedOnly.join(", ") || "none"})`
    );
  }

  for (const requiredFunction of required) {
    const entry = inventory.find((item) => item.name === requiredFunction);
    if (!entry?.sourceControlled || !entry.deployed) {
      failures.push(
        `${requiredFunction} must be both source controlled and deployed`
      );
    }
  }

  for (const entry of inventory) {
    if (entry.deployed && entry.status !== "ACTIVE") {
      failures.push(
        `${entry.name} deployment status is ${entry.status ?? "UNKNOWN"}`
      );
    }
    if (
      entry.sourceControlled &&
      entry.deployed &&
      typeof entry.deployedVerifyJwt === "boolean" &&
      entry.expectedVerifyJwt !== entry.deployedVerifyJwt
    ) {
      failures.push(
        `${entry.name} verify_jwt drift (source policy ${entry.expectedVerifyJwt}; deployed ${entry.deployedVerifyJwt})`
      );
    }
  }

  return { failures, sourceOnly, deployedOnly };
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const payload =
    options.deployedJson === "-"
      ? await readStandardInput()
      : readFileSync(resolve(ROOT, options.deployedJson), "utf8");
  const deployments = normalizeDeploymentPayload(payload);
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  const inventory = buildEdgeFunctionInventory(deployments, policy);
  const required = managedFunctions();
  const result = checkEdgeFunctionInventory(inventory, policy, required);

  console.log("Edge Function Ownership Inventory");
  console.log(
    `- source controlled: ${
      inventory.filter((entry) => entry.sourceControlled).length
    }`
  );
  console.log(
    `- deployed: ${inventory.filter((entry) => entry.deployed).length}`
  );
  console.log(
    `- source-only known drift: ${result.sourceOnly.join(", ") || "none"}`
  );
  console.log(
    `- deployed-only known drift: ${result.deployedOnly.join(", ") || "none"}`
  );

  const important = new Set([
    ...required,
    ...result.sourceOnly,
    ...result.deployedOnly,
  ]);
  for (const entry of inventory) {
    if (!options.verbose && !important.has(entry.name)) continue;
    console.log(
      `- ${entry.name}: ${entry.categories.join(" | ")}; status=${
        entry.status ?? "not deployed"
      }; verify_jwt=${entry.deployedVerifyJwt ?? "n/a"}`
    );
  }

  if (result.failures.length > 0) {
    console.error("Edge Function Ownership: FAIL");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("Edge Function Ownership: PASS (known drift remains visible)");
};

main().catch((error) => {
  console.error(
    `Edge Function Ownership: FAIL\n- ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
});

#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readManifest } from "./resolve-runtime-deployment-impact.mjs";
import { assertSourceParity } from "./runtime-source-parity.mjs";

const ROOT = resolve(process.cwd());
const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] ?? "";
};
const deployedPath = value("--deployed-json");
const output = value("--output") || "edge-runtime-attestation.json";
const reviewedSha = value("--reviewed-sha");
const remoteSourceRoot = value("--remote-source-root");
const expiresAfterDays = Number(value("--expires-after-days") || "90");
const allManaged = args.includes("--all-managed");
const selected = [
  ...new Set(value("--functions").split(",").filter(Boolean)),
].sort();
if (
  !deployedPath ||
  !reviewedSha ||
  !remoteSourceRoot ||
  (!allManaged && selected.length === 0)
) {
  throw new Error(
    "--deployed-json, --reviewed-sha, --remote-source-root, and --all-managed or --functions are required"
  );
}
if (
  !Number.isInteger(expiresAfterDays) ||
  expiresAfterDays < 1 ||
  expiresAfterDays > 90
) {
  throw new Error("--expires-after-days must be an integer from 1 to 90");
}
const manifest = readManifest();
const definitions = manifest.runtimeGroups.flatMap((group) =>
  group.functions.map((definition) => ({
    ...definition,
    group: group.name,
    runtimeDependencyPaths: group.runtimeDependencyPaths ?? [],
  }))
);
const slugs = allManaged
  ? definitions.map((definition) => definition.slug).sort()
  : selected;
const inventoryPayload = JSON.parse(
  readFileSync(resolve(ROOT, deployedPath), "utf8")
);
const inventory = Array.isArray(inventoryPayload)
  ? inventoryPayload
  : inventoryPayload?.functions;
if (!Array.isArray(inventory))
  throw new Error("deployed JSON has no functions array");
const records = slugs.map((slug) => {
  const definition = definitions.find((entry) => entry.slug === slug);
  const remote = inventory.find((entry) => (entry.slug ?? entry.name) === slug);
  if (!definition || !remote)
    throw new Error(
      `cannot attest ${slug}: missing manifest definition or remote deployment`
    );
  if (
    remote.status !== "ACTIVE" ||
    remote.verify_jwt !== definition.verifyJwt
  ) {
    throw new Error(
      `cannot attest ${slug}: runtime status or verify_jwt differs from policy`
    );
  }
  const parity = assertSourceParity({
    slug,
    runtimeDependencyPaths: definition.runtimeDependencyPaths,
    remoteSourceRoot,
  });
  return {
    reviewedGitSha: reviewedSha,
    functionSlug: slug,
    runtimeGroup: definition.group,
    expectedVerifyJwt: definition.verifyJwt,
    actualVerifyJwt: remote.verify_jwt,
    remoteVersion: remote.version,
    remoteBundleFingerprint: remote.ezbr_sha256 ?? null,
    sourceClosureFingerprint: parity.fingerprint,
    sourceFiles: parity.files,
    deployedAt: remote.updated_at ?? null,
  };
});
const attestedAt = new Date();
const expiresAt = new Date(
  attestedAt.getTime() + expiresAfterDays * 24 * 60 * 60 * 1000
);
writeFileSync(
  resolve(ROOT, output),
  `${JSON.stringify(
    {
      schemaVersion: 2,
      attestedAt: attestedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      governedFunctions: records.map((record) => record.functionSlug).sort(),
      records,
    },
    null,
    2
  )}\n`
);
console.log(
  `Deployment attestation: PASS (${records.length}/${definitions.length} governed functions)`
);

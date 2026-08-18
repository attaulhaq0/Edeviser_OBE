#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readManifest } from "./resolve-runtime-deployment-impact.mjs";
import { assertSourceParity } from "./runtime-source-parity.mjs";

const ROOT = resolve(process.cwd());
const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1] ?? "";
const deployedPath = value("--deployed-json");
const output = value("--output") || "edge-runtime-attestation.json";
const reviewedSha = value("--reviewed-sha");
const remoteSourceRoot = value("--remote-source-root");
const expiresAfterDays = Number(value("--expires-after-days") || "365");
const allManaged = args.includes("--all-managed");
const selected = value("--functions").split(",").filter(Boolean).sort();
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
  expiresAfterDays > 365
) {
  throw new Error("--expires-after-days must be an integer from 1 to 365");
}
const manifest = readManifest();
const definitions = manifest.runtimeGroups.flatMap((group) =>
  group.functions.map((definition) => ({
    ...definition,
    group: group.name,
    sharedDependencyPaths: group.sharedDependencyPaths,
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
  : inventoryPayload.functions;
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
    declaredSharedPaths: definition.sharedDependencyPaths,
    remoteSourceRoot: resolve(remoteSourceRoot, slug),
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
      governedFunctions: definitions
        .map((definition) => definition.slug)
        .sort(),
      records,
    },
    null,
    2
  )}\n`
);
console.log(
  `Deployment attestation: PASS (${records.length}/${definitions.length} governed functions)`
);

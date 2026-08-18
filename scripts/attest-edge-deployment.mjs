#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readManifest } from "./resolve-runtime-deployment-impact.mjs";

const ROOT = resolve(process.cwd());
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const filesUnder = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
const fingerprint = (paths) =>
  sha256(
    paths
      .flatMap((path) => filesUnder(path))
      .sort()
      .map((file) => `${relative(ROOT, file)}\0${sha256(readFileSync(file))}`)
      .join("\n")
  );
const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1] ?? "";
const deployedPath = value("--deployed-json");
const selected = value("--functions").split(",").filter(Boolean).sort();
const output = value("--output") || "edge-deployment-attestation.json";
const reviewedSha = value("--reviewed-sha");
const remoteSourceRoot = value("--remote-source-root");
if (!deployedPath || selected.length === 0 || !reviewedSha)
  throw new Error(
    "--deployed-json, --functions, and --reviewed-sha are required"
  );
const deployments = JSON.parse(
  readFileSync(resolve(ROOT, deployedPath), "utf8")
);
const inventory = Array.isArray(deployments)
  ? deployments
  : deployments.functions;
const manifest = readManifest();
const definitions = manifest.runtimeGroups.flatMap((group) =>
  group.functions.map((fn) => ({
    ...fn,
    group: group.name,
    shared: group.sharedDependencyPaths,
  }))
);
const records = selected.map((slug) => {
  const definition = definitions.find((entry) => entry.slug === slug);
  const remote = inventory.find((entry) => (entry.slug ?? entry.name) === slug);
  if (!definition || !remote)
    throw new Error(
      `cannot attest ${slug}: missing manifest definition or remote deployment`
    );
  if (remote.status !== "ACTIVE" || remote.verify_jwt !== definition.verifyJwt)
    throw new Error(
      `cannot attest ${slug}: runtime status or verify_jwt differs from policy`
    );
  const inputs = [
    resolve(ROOT, "supabase/functions", slug),
    ...definition.shared.map((path) =>
      resolve(ROOT, path.replace(/\/\*\*$/, ""))
    ),
  ];
  const remoteSourcePath = remoteSourceRoot
    ? resolve(ROOT, remoteSourceRoot, "supabase/functions", slug)
    : null;
  if (remoteSourcePath && !existsSync(remoteSourcePath))
    throw new Error(`cannot attest ${slug}: downloaded source is missing`);
  return {
    reviewedGitSha: reviewedSha,
    functionSlug: slug,
    runtimeGroup: definition.group,
    expectedVerifyJwt: definition.verifyJwt,
    actualVerifyJwt: remote.verify_jwt,
    remoteVersion: remote.version,
    remoteBundleFingerprint: remote.ezbr_sha256 ?? null,
    sourceTreeFingerprint: fingerprint(inputs),
    remoteSourceTreeFingerprint: remoteSourcePath
      ? fingerprint([remoteSourcePath])
      : null,
    deployedAt: remote.updated_at ?? null,
  };
});
writeFileSync(
  resolve(ROOT, output),
  `${JSON.stringify(
    { schemaVersion: 1, attestedAt: new Date().toISOString(), records },
    null,
    2
  )}\n`
);
console.log(`Deployment attestation: PASS (${records.length} functions)`);

#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readManifest } from "./resolve-runtime-deployment-impact.mjs";

const ROOT = resolve(process.cwd());
const [attestationPath, deploymentPath, remoteSourceRoot] =
  process.argv.slice(2);
if (!attestationPath || !deploymentPath || !remoteSourceRoot)
  throw new Error(
    "attestation, deployed-inventory, and remote-source paths are required"
  );
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const filesUnder = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(path, entry.name))
      : [join(path, entry.name)]
  );
const fingerprint = (path) =>
  sha256(
    filesUnder(path)
      .sort()
      .map((file) => `${relative(path, file)}\0${sha256(readFileSync(file))}`)
      .join("\n")
  );
const attestation = JSON.parse(
  readFileSync(resolve(ROOT, attestationPath), "utf8")
);
const deployedPayload = JSON.parse(
  readFileSync(resolve(ROOT, deploymentPath), "utf8")
);
const deployed = Array.isArray(deployedPayload)
  ? deployedPayload
  : deployedPayload.functions;
const groups = new Map(
  readManifest().runtimeGroups.map((group) => [group.name, group])
);
for (const record of attestation.records ?? []) {
  const remote = deployed.find(
    (entry) => (entry.slug ?? entry.name) === record.functionSlug
  );
  if (!remote || remote.status !== "ACTIVE")
    throw new Error(`${record.functionSlug} is missing or inactive`);
  if (
    remote.verify_jwt !== record.actualVerifyJwt ||
    remote.ezbr_sha256 !== record.remoteBundleFingerprint
  ) {
    throw new Error(
      `${record.functionSlug} runtime/source parity drifted from its deployment attestation`
    );
  }
  if (record.remoteSourceTreeFingerprint) {
    const downloaded = resolve(
      ROOT,
      remoteSourceRoot,
      "supabase/functions",
      record.functionSlug
    );
    if (fingerprint(downloaded) !== record.remoteSourceTreeFingerprint)
      throw new Error(
        `${record.functionSlug} deployed source changed after attestation`
      );
  }
  const group = groups.get(record.runtimeGroup);
  const paths = [
    `supabase/functions/${record.functionSlug}`,
    ...(group?.sharedDependencyPaths ?? []).map((path) =>
      path.replace(/\/\*\*$/, "")
    ),
  ];
  try {
    execFileSync(
      "git",
      ["diff", "--quiet", record.reviewedGitSha, "HEAD", "--", ...paths],
      { cwd: ROOT }
    );
  } catch {
    throw new Error(
      `${record.functionSlug} source changed after attested SHA ${record.reviewedGitSha} without a matching production attestation`
    );
  }
}
console.log(
  `Runtime/source parity: PASS (${
    attestation.records?.length ?? 0
  } attested functions)`
);

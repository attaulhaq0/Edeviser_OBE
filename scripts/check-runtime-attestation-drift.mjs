
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readManifest } from "./resolve-runtime-deployment-impact.mjs";
import { assertSourceParity } from "./runtime-source-parity.mjs";
import { assertCumulativeCoverage } from "./runtime-attestation-snapshot.mjs";

const ROOT = resolve(process.cwd());
const [attestationPath, deploymentPath, remoteSourceRoot] =
  process.argv.slice(2);
if (!attestationPath || !deploymentPath || !remoteSourceRoot)
  throw new Error(
    "attestation, deployed-inventory, and remote-source paths are required"
  );
const attestation = JSON.parse(
  readFileSync(resolve(ROOT, attestationPath), "utf8")
);
const deploymentsPayload = JSON.parse(
  readFileSync(resolve(ROOT, deploymentPath), "utf8")
);
const deployments = Array.isArray(deploymentsPayload)
  ? deploymentsPayload
  : deploymentsPayload.functions;
if (!Array.isArray(deployments))
  throw new Error("deployed JSON has no functions array");
const definitions = readManifest().runtimeGroups.flatMap((group) =>
  group.functions.map((definition) => ({
    ...definition,
    group: group.name,
    runtimeDependencyPaths: group.runtimeDependencyPaths ?? [],
  }))
);
const expectedSlugs = definitions.map((definition) => definition.slug).sort();
assertCumulativeCoverage(attestation, expectedSlugs);
if (
  !attestation.expiresAt ||
  Number.isNaN(Date.parse(attestation.expiresAt)) ||
  Date.parse(attestation.expiresAt) <= Date.now()
) {
  throw new Error(
    "attestation is expired or malformed; renew with the reviewed read-only bootstrap workflow"
  );
}
for (const record of attestation.records) {
  const definition = definitions.find(
    (entry) => entry.slug === record.functionSlug
  );
  const remote = deployments.find(
    (entry) => (entry.slug ?? entry.name) === record.functionSlug
  );
  if (!definition || !remote || remote.status !== "ACTIVE")
    throw new Error(`${record.functionSlug} is missing or inactive`);
  if (
    remote.verify_jwt !== record.expectedVerifyJwt ||
    remote.ezbr_sha256 !== record.remoteBundleFingerprint
  ) {
    throw new Error(
      `${record.functionSlug} configuration or bundle fingerprint drifted from attestation`
    );
  }
  const parity = assertSourceParity({
    slug: record.functionSlug,
    runtimeDependencyPaths: definition.runtimeDependencyPaths,
    remoteSourceRoot,
  });
  if (parity.fingerprint !== record.sourceClosureFingerprint)
    throw new Error(
      `${record.functionSlug} deployed source differs from its attested reviewed source`
    );
  const paths = [
    `supabase/functions/${record.functionSlug}`,
    ...definition.runtimeDependencyPaths.map((path) =>
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
  `Runtime/source parity: PASS (${expectedSlugs.length} governed functions)`
);

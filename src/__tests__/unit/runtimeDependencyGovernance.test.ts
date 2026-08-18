// Feature: runtime dependency governance
// Property 1: Edge deployment selection is derived from one declared closure.

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  readManifest,
  resolveDeploymentImpact,
  validateManifest,
} from "../../../scripts/resolve-runtime-deployment-impact.mjs";
import {
  compareMigrationLedgers,
  remoteMigrationLedger,
  repositoryMigrationLedger,
} from "../../../scripts/check-migration-ledger.mjs";
import {
  assertSourceParity,
  declaredLocalSourceClosure,
  relativeImportSpecifiers,
} from "../../../scripts/runtime-source-parity.mjs";
import { assertCumulativeCoverage } from "../../../scripts/runtime-attestation-snapshot.mjs";
import {
  isRuntimeDependencyPath,
  matchesRuntimeDependencyPath,
} from "../../../scripts/runtime-dependency-paths.mjs";
import { selectProductionBaseSha } from "../../../scripts/resolve-production-base-sha.mjs";
import {
  managedRuntimeSlugs,
  prepareFunctionDownloadWorkdir,
} from "../../../scripts/download-managed-runtime-source.mjs";

const root = join(__dirname, "..", "..", "..");
const manifest = readManifest();
const resolve = (paths: string[]) => resolveDeploymentImpact(paths, manifest);
const tutorGroup = (value: typeof manifest) => {
  const group = value.runtimeGroups.find(
    (entry) => entry.name === "tutor-intelligence"
  );
  if (!group) throw new Error("Tutor Intelligence runtime group is required");
  return group;
};
const tutorClosure = tutorGroup(manifest)
  .functions.map((definition) => definition.slug)
  .sort();

describe("runtime dependency resolver", () => {
  it("resolves generate-plan-update to the complete Tutor Intelligence closure", () => {
    expect(
      resolve(["supabase/functions/generate-plan-update/index.ts"]).functions
    ).toEqual(tutorClosure);
  });

  it("resolves chat-with-tutor to the complete Tutor Intelligence closure", () => {
    expect(
      resolve(["supabase/functions/chat-with-tutor/index.ts"]).functions
    ).toEqual(tutorClosure);
  });

  it("resolves shared AI changes to every declared consumer", () => {
    const impact = resolve([
      "supabase/functions/_shared/ai/provider-factory.ts",
    ]);
    expect(impact.functions).toEqual(tutorClosure);
    expect(impact.sharedRuntimePaths).toEqual([
      "supabase/functions/_shared/ai/provider-factory.ts",
    ]);
  });

  it("declares the agent-worker cross-function source dependency", () => {
    const closure = declaredLocalSourceClosure(
      "agent-worker",
      tutorGroup(manifest).runtimeDependencyPaths
    );
    expect([...closure.keys()]).toContain(
      "functions/agent-orchestrator/data-source.ts"
    );
  });

  it("fails closed for an unknown shared runtime dependency", () => {
    expect(resolve(["supabase/functions/_shared/cors.ts"]).errors).toContain(
      "unknown shared runtime dependency changed: supabase/functions/_shared/cors.ts"
    );
  });

  it("treats deleted managed and declared runtime paths as deployment impact", () => {
    expect(
      resolve(["supabase/functions/chat-with-tutor/index.ts"]).functions
    ).toEqual(tutorClosure);
    expect(
      resolve(["supabase/functions/_shared/ai/provider.ts"]).functions
    ).toEqual(tutorClosure);
  });

  it("fails closed for an unknown deleted shared runtime path", () => {
    expect(resolve(["supabase/functions/_shared/removed.ts"]).errors).toContain(
      "unknown shared runtime dependency changed: supabase/functions/_shared/removed.ts"
    );
  });

  it("uses bounded runtime dependency paths rather than shared-path prefixes", () => {
    expect(
      matchesRuntimeDependencyPath(
        "supabase/functions/_shared/ai/provider.ts",
        "supabase/functions/_shared/ai/**"
      )
    ).toBe(true);
    expect(
      matchesRuntimeDependencyPath(
        "supabase/functions/_shared/ai-legacy/provider.ts",
        "supabase/functions/_shared/ai/**"
      )
    ).toBe(false);
    expect(
      matchesRuntimeDependencyPath(
        "supabase/functions/_shared/auth.ts.bak",
        "supabase/functions/_shared/auth.ts"
      )
    ).toBe(false);
    expect(
      isRuntimeDependencyPath(
        "supabase/functions/agent-orchestrator/data-source.ts"
      )
    ).toBe(true);
    expect(isRuntimeDependencyPath("../../outside-repository.ts")).toBe(false);
  });

  it("returns no deployment for frontend-only changes", () => {
    const impact = resolve(["src/pages/LoginPage.tsx"]);
    expect(impact.deploymentRequired).toBe(false);
    expect(impact.functions).toEqual([]);
  });

  it("fails closed when a managed source function is removed from the manifest", () => {
    const invalid = structuredClone(manifest);
    tutorGroup(invalid).functions = tutorGroup(invalid).functions.filter(
      (entry: { slug: string }) => entry.slug !== "chat-with-tutor"
    );
    expect(
      resolveDeploymentImpact(
        ["supabase/functions/chat-with-tutor/index.ts"],
        invalid
      ).errors
    ).toContain(
      "unmanaged Edge Function changed: supabase/functions/chat-with-tutor/index.ts"
    );
  });

  it("rejects a manifest function without source", () => {
    const invalid = structuredClone(manifest);
    tutorGroup(invalid).functions.push({
      slug: "does-not-exist",
      verifyJwt: true,
    });
    expect(validateManifest(invalid).failures).toContain(
      "does-not-exist is declared by the manifest but has no source directory"
    );
  });

  it("rejects verify_jwt policy mismatch", () => {
    const invalid = structuredClone(manifest);
    const functionDefinition = tutorGroup(invalid).functions[0];
    if (!functionDefinition) throw new Error("Tutor function is required");
    functionDefinition.verifyJwt = false;
    expect(
      validateManifest(invalid).failures.some((failure: string) =>
        failure.includes("chat-with-tutor verify_jwt mismatch")
      )
    ).toBe(true);
  });

  it("fails closed for a direct unmanaged Edge Function change", () => {
    expect(
      resolve(["supabase/functions/unmanaged-example/index.ts"]).errors
    ).toContain(
      "unmanaged Edge Function changed: supabase/functions/unmanaged-example/index.ts"
    );
  });

  it("rejects an unsafe manifest function slug", () => {
    const invalid = structuredClone(manifest);
    tutorGroup(invalid).functions.push({
      slug: "unsafe;deploy",
      verifyJwt: true,
    });
    expect(validateManifest(invalid).failures).toContain(
      "unsafe;deploy is not a safe Edge Function slug"
    );
  });

  it("rejects runtime dependencies outside the governed functions tree", () => {
    const invalid = structuredClone(manifest);
    tutorGroup(invalid).runtimeDependencyPaths.push("src/not-runtime.ts");
    expect(validateManifest(invalid).failures).toContain(
      "tutor-intelligence has an invalid runtime dependency path: src/not-runtime.ts"
    );
  });

  it("rejects missing and cross-group runtime dependency declarations", () => {
    const missing = structuredClone(manifest);
    tutorGroup(missing).runtimeDependencyPaths.push(
      "supabase/functions/_shared/not-real.ts"
    );
    expect(validateManifest(missing).failures).toContain(
      "tutor-intelligence runtime dependency does not exist: supabase/functions/_shared/not-real.ts"
    );
    const crossGroup = structuredClone(manifest);
    tutorGroup(crossGroup).runtimeDependencyPaths.push(
      "supabase/functions/accept-invitation/index.ts"
    );
    expect(validateManifest(crossGroup).failures).toContain(
      "tutor-intelligence cross-function dependency must belong to its governed group: supabase/functions/accept-invitation/index.ts"
    );
  });

  it("fails deployed verify_jwt parity mismatch", () => {
    const ownershipChecker = readFileSync(
      join(root, "scripts/check-edge-function-ownership.mjs"),
      "utf8"
    );
    expect(ownershipChecker).toContain("verify_jwt drift");
    expect(ownershipChecker).toContain(
      "expectedVerifyJwt !== entry.deployedVerifyJwt"
    );
  });
});

describe("migration and workflow release safeguards", () => {
  const scheduledHealth = readFileSync(
    join(root, ".github/workflows/scheduled-health.yml"),
    "utf8"
  );
  const migrations = readFileSync(
    join(root, ".github/workflows/deploy-migrations.yml"),
    "utf8"
  );
  const production = readFileSync(
    join(root, ".github/workflows/deploy-phase2-edge-functions.yml"),
    "utf8"
  );
  const pinnedCli = readFileSync(
    join(root, "scripts/check-pinned-supabase-cli.mjs"),
    "utf8"
  );

  it("fails migration health when the monitor credential is absent", () => {
    expect(scheduledHealth).toContain("migration health cannot be verified");
    expect(scheduledHealth).not.toContain("skipping branch health probe");
  });

  it("fails health for MIGRATIONS_FAILED and passes a healthy branch list", () => {
    expect(scheduledHealth).toContain('select(.status == "MIGRATIONS_FAILED")');
    expect(scheduledHealth).toContain("All Supabase branches healthy");
  });

  it("keeps manual migration deployment workflow_dispatch-only", () => {
    expect(migrations).toContain("workflow_dispatch");
    expect(migrations).not.toMatch(/^\s*push:/m);
  });

  it("pins the Supabase CLI in every production-critical workflow", () => {
    expect(pinnedCli).toContain("readdir(workflowDirectory)");
    expect(pinnedCli).toContain("supabase/setup-cli");
    expect(pinnedCli).toContain("explicit version");
    expect(pinnedCli).toContain("version: latest");
  });

  it("uses a JSON-producing linked database query for the migration ledger", () => {
    expect(scheduledHealth).toContain(
      "supabase db query --linked --output json"
    );
    expect(scheduledHealth).toContain("supabase_migrations.schema_migrations");
    expect(migrations).toContain("supabase db query --linked --output json");
  });

  it("accepts the pinned CLI database-query rows payload", () => {
    expect(
      remoteMigrationLedger({ rows: [{ version: "20260830000001" }] }).versions
    ).toEqual(["20260830000001"]);
  });

  it("fails an empty remote migration ledger when the repository has migrations", () => {
    const expected = repositoryMigrationLedger(["20260830000001_valid.sql"]);
    const actual = remoteMigrationLedger({ rows: [] });
    expect(compareMigrationLedgers(expected, actual).failures).toContain(
      "remote ledger is missing: 20260830000001"
    );
  });

  it("fails closed when the ledger command receives no input path", () => {
    expect(() =>
      execFileSync(process.execPath, [
        join(root, "scripts/check-migration-ledger.mjs"),
      ])
    ).toThrow();
  });

  it("includes deleted paths when it reads a Git diff", () => {
    const resolver = readFileSync(
      join(root, "scripts/resolve-runtime-deployment-impact.mjs"),
      "utf8"
    );
    expect(resolver).toContain("--diff-filter=ACDMRT");
  });

  it("fails same-head migration ledgers with a missing middle version", () => {
    const expected = repositoryMigrationLedger([
      "20260830000001_create.sql",
      "20260830000002_create.sql",
      "20260830000003_create.sql",
      "20260830000004_create.sql",
    ]);
    const actual = remoteMigrationLedger({
      migrations: [
        { version: "20260830000001" },
        { version: "20260830000002" },
        { version: "20260830000004" },
      ],
    });
    expect(compareMigrationLedgers(expected, actual).failures).toContain(
      "remote ledger is missing: 20260830000003"
    );
  });

  it("detects unexpected, duplicate, and malformed migration ledger entries", () => {
    const expected = repositoryMigrationLedger([
      "20260830000001_valid.sql",
      "bad.sql",
    ]);
    const actual = remoteMigrationLedger({
      migrations: [
        { version: "20260830000001" },
        { version: "20260830000001" },
        { version: "not-a-version" },
      ],
    });
    const failures = compareMigrationLedgers(expected, actual).failures.join(
      "\n"
    );
    expect(failures).toContain("malformed repository migration entries");
    expect(failures).toContain("duplicate remote migration versions");
    expect(failures).toContain("malformed remote migration entries");
  });

  it("uses the resolver output as the selected Production deployment closure", () => {
    expect(production).toContain("resolve-runtime-deployment-impact.mjs");
    expect(production).toContain("$DEPLOYMENT_CLOSURE");
    expect(production).toContain("environment: production");
  });

  it("passes the preview closure through an environment variable and validates slugs", () => {
    const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("DEPLOYMENT_CLOSURE:");
    expect(ci).toContain("read -r -a closure");
    expect(ci).toContain("unsafe function slug from resolver");
    expect(ci).not.toContain(
      "npx supabase functions deploy \\\n            ${{ needs.runtime-deployment-impact.outputs.deployment_closure }}"
    );
  });

  it("preserves the protected Production release gate", () => {
    expect(production).toContain("branches: [main]");
    expect(production).toContain("environment: production");
    expect(production).toContain("cancel-in-progress: false");
    expect(production).toContain("persist-credentials: false");
    expect(production).toContain("version: 2.114.0");
    expect(production).toContain("SUPABASE_ACCESS_TOKEN");
    expect(production).toContain("attest-edge-deployment.mjs");
    expect(production).toContain("resolve-production-base-sha.mjs");
    expect(production).toContain("retention-days: 90");
    const bootstrap = readFileSync(
      join(root, ".github/workflows/bootstrap-runtime-attestation.yml"),
      "utf8"
    );
    expect(bootstrap).toContain("contents: read");
    expect(bootstrap).not.toContain("actions: write");
  });

  it("uses event.before only when it is a reachable non-zero commit", () => {
    const head = "a".repeat(40);
    const before = "b".repeat(40);
    const parent = "c".repeat(40);
    expect(
      selectProductionBaseSha({
        before,
        head,
        resolveCommit: (revision) =>
          revision === before || revision === head || revision === `${head}^`
            ? revision.replace("^", "")
            : "",
      })
    ).toBe(before);
    expect(
      selectProductionBaseSha({
        before: "0".repeat(40),
        head,
        resolveCommit: (revision) =>
          revision === head || revision === `${head}^`
            ? revision === `${head}^`
              ? parent
              : head
            : "",
      })
    ).toBe(parent);
  });
});

describe("reviewed/deployed source parity", () => {
  it("fails attestation when downloaded source differs from the reviewed closure", () => {
    const group = tutorGroup(manifest);
    const local = declaredLocalSourceClosure(
      "chat-with-tutor",
      group.runtimeDependencyPaths
    );
    const remoteRoot = mkdtempSync(join(tmpdir(), "edeviser-runtime-source-"));
    try {
      for (const [logicalPath, source] of local) {
        const destination = join(remoteRoot, logicalPath);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, source);
      }
      expect(
        assertSourceParity({
          slug: "chat-with-tutor",
          runtimeDependencyPaths: group.runtimeDependencyPaths,
          remoteSourceRoot: remoteRoot,
        }).files
      ).toContain("functions/chat-with-tutor/index.ts");
      mkdirSync(join(remoteRoot, "functions/generated"), { recursive: true });
      writeFileSync(
        join(remoteRoot, "functions/generated/ignored.ts"),
        "export const generated = true;\n"
      );
      expect(() =>
        assertSourceParity({
          slug: "chat-with-tutor",
          runtimeDependencyPaths: group.runtimeDependencyPaths,
          remoteSourceRoot: remoteRoot,
        })
      ).not.toThrow();
      rmSync(join(remoteRoot, "functions/_shared/ai/config.ts"));
      expect(() =>
        assertSourceParity({
          slug: "chat-with-tutor",
          runtimeDependencyPaths: group.runtimeDependencyPaths,
          remoteSourceRoot: remoteRoot,
        })
      ).toThrow("source imports missing dependency");
      writeFileSync(
        join(remoteRoot, "functions/_shared/ai/config.ts"),
        local.get("functions/_shared/ai/config.ts") ?? ""
      );
      writeFileSync(
        join(remoteRoot, "functions/chat-with-tutor/index.ts"),
        "export const drift = true;\n"
      );
      expect(() =>
        assertSourceParity({
          slug: "chat-with-tutor",
          runtimeDependencyPaths: group.runtimeDependencyPaths,
          remoteSourceRoot: remoteRoot,
        })
      ).toThrow("reviewed/deployed source mismatch");
    } finally {
      rmSync(remoteRoot, { recursive: true, force: true });
    }
  });

  it("recognizes dynamic relative imports without treating comment text as code", () => {
    expect(
      relativeImportSpecifiers(
        [
          "// import './comment-only.ts'",
          "/* export { value } from './also-comment-only.ts' */",
          "const module = import('./dynamic.ts');",
          "import { value } from './static.ts';",
        ].join("\n")
      )
    ).toEqual(["./dynamic.ts", "./static.ts"]);
  });

  it("records exactly the functions it attests and rejects an invalid inventory", () => {
    const group = tutorGroup(manifest);
    const local = declaredLocalSourceClosure(
      "chat-with-tutor",
      group.runtimeDependencyPaths
    );
    const fixtureRoot = mkdtempSync(join(tmpdir(), "edeviser-attestation-"));
    const sourceRoot = join(fixtureRoot, "remote-source");
    const deployedPath = join(fixtureRoot, "deployed.json");
    const outputPath = join(fixtureRoot, "attestation.json");
    const run = (inventoryPath: string, destination: string) =>
      execFileSync(
        process.execPath,
        [
          join(root, "scripts/attest-edge-deployment.mjs"),
          "--deployed-json",
          inventoryPath,
          "--functions",
          "chat-with-tutor,chat-with-tutor",
          "--reviewed-sha",
          "a".repeat(40),
          "--remote-source-root",
          sourceRoot,
          "--output",
          destination,
        ],
        { cwd: root, stdio: "pipe" }
      );
    try {
      for (const [logicalPath, source] of local) {
        const destination = join(sourceRoot, "chat-with-tutor", logicalPath);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, source);
      }
      writeFileSync(
        deployedPath,
        JSON.stringify([
          {
            slug: "chat-with-tutor",
            status: "ACTIVE",
            verify_jwt: true,
            version: 18,
            ezbr_sha256: "test-bundle",
          },
        ])
      );
      run(deployedPath, outputPath);
      const attestation = JSON.parse(readFileSync(outputPath, "utf8"));
      expect(attestation.governedFunctions).toEqual(["chat-with-tutor"]);
      expect(attestation.records).toHaveLength(1);
      writeFileSync(join(fixtureRoot, "invalid.json"), JSON.stringify({}));
      expect(() =>
        run(join(fixtureRoot, "invalid.json"), outputPath)
      ).toThrow();
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("prepares the CLI's required per-function Supabase workdir layout", () => {
    const root = mkdtempSync(join(tmpdir(), "edeviser-runtime-download-"));
    try {
      const workdir = prepareFunctionDownloadWorkdir(
        root,
        "cdlgtbvxlxjpcddjazzx",
        "chat-with-tutor"
      );
      expect(
        readFileSync(join(workdir, "supabase/config.toml"), "utf8")
      ).toContain('project_id = "cdlgtbvxlxjpcddjazzx"');
      expect(managedRuntimeSlugs()).toEqual(
        manifest.runtimeGroups
          .flatMap((group) =>
            group.functions.map((definition) => definition.slug)
          )
          .sort()
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("requires a complete cumulative governed snapshot", () => {
    const production = readFileSync(
      join(root, ".github/workflows/deploy-phase2-edge-functions.yml"),
      "utf8"
    );
    const scheduled = readFileSync(
      join(root, ".github/workflows/scheduled-health.yml"),
      "utf8"
    );
    expect(production).toContain("--all-managed");
    expect(production).toContain("edge-runtime-attestation-snapshot");
    expect(scheduled).toContain("download-managed-runtime-source.mjs");
  });

  it("keeps Tutor coverage after a later Identity deployment snapshot", () => {
    const tutor = tutorGroup(manifest).functions.map(
      (definition) => definition.slug
    );
    const identity =
      manifest.runtimeGroups
        .find((group) => group.name === "identity-runtime")
        ?.functions.map((definition) => definition.slug) ?? [];
    const all = [...tutor, ...identity].sort();
    expect(() =>
      assertCumulativeCoverage(
        {
          governedFunctions: all,
          records: all.map((functionSlug) => ({ functionSlug })),
        },
        all
      )
    ).not.toThrow();
    expect(() =>
      assertCumulativeCoverage(
        {
          governedFunctions: identity,
          records: identity.map((functionSlug) => ({ functionSlug })),
        },
        all
      )
    ).toThrow("attestation declared coverage is incomplete");
  });
});

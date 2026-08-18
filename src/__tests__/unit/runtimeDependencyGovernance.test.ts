// Feature: runtime dependency governance
// Property 1: Edge deployment selection is derived from one declared closure.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  readManifest,
  resolveDeploymentImpact,
  validateManifest,
} from "../../../scripts/resolve-runtime-deployment-impact.mjs";
import { remoteMigrationHead } from "../../../scripts/check-migration-ledger.mjs";

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
const tutorClosure = [
  "agent-orchestrator",
  "agent-worker",
  "chat-with-tutor",
  "embed-course-material",
  "generate-plan-update",
];

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

  it("fails closed for an unknown shared runtime dependency", () => {
    expect(resolve(["supabase/functions/_shared/cors.ts"]).errors).toContain(
      "unknown shared runtime dependency changed: supabase/functions/_shared/cors.ts"
    );
  });

  it("returns no deployment for frontend-only changes", () => {
    const impact = resolve(["src/pages/LoginPage.tsx"]);
    expect(impact.deploymentRequired).toBe(false);
    expect(impact.functions).toEqual([]);
  });

  it("rejects a policy-required source function missing from the manifest", () => {
    const invalid = structuredClone(manifest);
    tutorGroup(invalid).functions = tutorGroup(invalid).functions.filter(
      (entry: { slug: string }) => entry.slug !== "chat-with-tutor"
    );
    expect(validateManifest(invalid).failures).toContain(
      "chat-with-tutor is required by ownership policy but missing from runtime manifest"
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
    expect(pinnedCli).toContain('"scheduled-health.yml"');
    expect(pinnedCli).toContain('"deploy-migrations.yml"');
    expect(pinnedCli).toContain("version: latest");
  });

  it("detects a migration ledger mismatch", () => {
    expect(
      remoteMigrationHead({
        migrations: [
          { version: "20260830000009" },
          { version: "20260830000010" },
        ],
      })
    ).toBe("20260830000010");
    expect(
      remoteMigrationHead({ migrations: [{ version: "20260830000009" }] })
    ).not.toBe("20260830000010");
  });

  it("uses the resolver output as the selected Production deployment closure", () => {
    expect(production).toContain("resolve-runtime-deployment-impact.mjs");
    expect(production).toContain("$DEPLOYMENT_CLOSURE");
    expect(production).toContain("environment: production");
  });
});

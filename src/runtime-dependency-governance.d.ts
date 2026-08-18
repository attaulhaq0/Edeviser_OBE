declare module "*resolve-runtime-deployment-impact.mjs" {
  export interface RuntimeFunctionDeclaration {
    slug: string;
    verifyJwt: boolean;
  }

  export interface RuntimeGroupDeclaration {
    name: string;
    deploymentOwner: string;
    functions: RuntimeFunctionDeclaration[];
    sharedDependencyPaths: string[];
  }

  export interface RuntimeManifest {
    version: number;
    description: string;
    runtimeGroups: RuntimeGroupDeclaration[];
  }

  export interface RuntimeValidationResult {
    failures: string[];
    declaredFunctions: string[];
  }

  export interface RuntimeImpact {
    changedPaths: string[];
    directFunctions: string[];
    sharedRuntimePaths: string[];
    affectedGroups: string[];
    functions: string[];
    deploymentRequired: boolean;
    errors: string[];
  }

  export function readManifest(): RuntimeManifest;
  export function validateManifest(
    manifest?: RuntimeManifest
  ): RuntimeValidationResult;
  export function resolveDeploymentImpact(
    paths: string[],
    manifest?: RuntimeManifest
  ): RuntimeImpact;
}

declare module "*check-migration-ledger.mjs" {
  export interface MigrationLedger {
    versions: string[];
    malformed: string[];
    duplicates: string[];
  }
  export function repositoryMigrationLedger(files: string[]): MigrationLedger;
  export function remoteMigrationLedger(payload: unknown): MigrationLedger;
  export function compareMigrationLedgers(
    expected: MigrationLedger,
    actual: MigrationLedger
  ): {
    failures: string[];
    expectedHead?: string;
    actualHead?: string;
    missing: string[];
    unexpected: string[];
  };
}

declare module "*runtime-source-parity.mjs" {
  export function declaredLocalSourceClosure(
    slug: string,
    declaredSharedPaths: string[]
  ): Map<string, string>;
  export function assertSourceParity(input: {
    slug: string;
    declaredSharedPaths: string[];
    remoteSourceRoot: string;
  }): { fingerprint: string; files: string[] };
}

declare module "*runtime-attestation-snapshot.mjs" {
  export function assertCumulativeCoverage(
    attestation: {
      governedFunctions?: string[];
      records?: Array<{ functionSlug: string }>;
    },
    expectedSlugs: string[]
  ): void;
}

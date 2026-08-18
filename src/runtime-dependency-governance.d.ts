declare module "*resolve-runtime-deployment-impact.mjs" {
  export interface RuntimeFunctionDeclaration {
    slug: string;
    verifyJwt: boolean;
  }

  export interface RuntimeGroupDeclaration {
    name: string;
    deploymentOwner: string;
    functions: RuntimeFunctionDeclaration[];
    runtimeDependencyPaths: string[];
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
    runtimeDependencyPaths: string[]
  ): Map<string, string>;
  export function assertSourceParity(input: {
    slug: string;
    runtimeDependencyPaths: string[];
    remoteSourceRoot: string;
  }): { fingerprint: string; files: string[] };
  export function relativeImportSpecifiers(source: string): string[];
}

declare module "*runtime-dependency-paths.mjs" {
  export function isRuntimeDependencyPath(path: string): boolean;
  export function matchesRuntimeDependencyPath(
    candidate: string,
    declaration: string
  ): boolean;
}

declare module "*resolve-production-base-sha.mjs" {
  export function selectProductionBaseSha(input: {
    before: string;
    head: string;
    resolveCommit: (revision: string) => string;
  }): string;
}

declare module "*download-managed-runtime-source.mjs" {
  export function managedRuntimeSlugs(): string[];
  export function prepareFunctionDownloadWorkdir(
    outputRoot: string,
    projectRef: string,
    slug: string
  ): string;
}

declare module "*check-pinned-supabase-cli.mjs" {
  export function normalizeYamlScalar(value: string): string;
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

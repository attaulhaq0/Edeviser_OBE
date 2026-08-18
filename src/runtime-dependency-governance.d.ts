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
  export function normalizeRuntimeSource(source: string): string;
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
  export function prepareManagedRuntimeDownloadWorkdir(
    outputRoot: string,
    projectRef: string
  ): string;
  export function downloadManagedRuntimeSource(input: {
    projectRef: string;
    outputRoot: string;
    execute?: (command: string, args: string[], options: unknown) => void;
  }): string;
}

declare module "*resolve-runtime-reconciliation.mjs" {
  export function resolveRuntimeReconciliation(
    groupName: string,
    manifest?: {
      runtimeGroups: Array<{
        name: string;
        functions: Array<{ slug: string; verifyJwt: boolean }>;
      }>;
    }
  ): { group: string; functions: string[] };
}

declare module "*verify-runtime-reconciliation-target.mjs" {
  export function assertRuntimeReconciliationTarget(input: {
    ref: string;
    reviewedSha: string;
    headSha: string;
    mainSha: string;
  }): string;
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

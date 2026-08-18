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
  export function remoteMigrationHead(payload: unknown): string | undefined;
}

export interface PrototypeBoundaryOptions {
  baseSha: string;
  headRef: string;
  distDirectory: string;
  skipDiff: boolean;
  skipDist: boolean;
}

export function evaluatePrototypeDiff(
  diffText: string,
  options?: { headRef?: string }
): string[];

export function scanProductionReferences(rootDirectory?: string): string[];

export function scanBuildArtifacts(
  rootDirectory?: string,
  distDirectory?: string
): string[];

export function runPrototypeBoundaryCheck(
  options: PrototypeBoundaryOptions
): string[];

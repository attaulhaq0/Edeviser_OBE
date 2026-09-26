import type { DesignAnalysis, DesignComparison, DesignPolicyRule } from "./analyze.mjs";
export interface ExcludedScope { path: string; reason: string }
export interface RepositoryAnalysis extends DesignAnalysis {
  scope: string;
  sourceCount: number;
  excludedScopes: readonly ExcludedScope[];
  rules: readonly DesignPolicyRule[];
}
export interface RepositoryComparison {
  schemaVersion: 1;
  mode: "check-no-growth";
  verdict: "growth" | "no-growth";
  baselineSourceCount: number;
  currentSourceCount: number;
  scope: string;
  excludedScopes: readonly ExcludedScope[];
  rules: readonly DesignPolicyRule[];
  comparison: DesignComparison;
  limitations: string[];
}
export const EXCLUDED_SCOPES: readonly ExcludedScope[];
export function analyzeRepository(root: string): RepositoryAnalysis;
export function compareRepositories(baseRoot: string, currentRoot: string): RepositoryComparison;
export function parseArguments(args: readonly string[]): { mode: "--report" | "--check-no-growth"; root: string; baseRoot?: string };

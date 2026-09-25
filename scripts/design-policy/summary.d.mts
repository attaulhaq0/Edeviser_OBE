export type PolicySummary = {
  schemaVersion: 1;
  mode: "check-no-growth";
  verdict: "growth" | "no-growth";
  scope: string;
  baselineSourceCount: number;
  currentSourceCount: number;
  totals: {
    baseline: number;
    current: number;
    introduced: number;
    existing: number;
    removed: number;
  };
  introduced: Array<{
    file: string;
    owner: string;
    rule: string;
    token: string;
    count: number;
  }>;
  omittedIntroducedGroups: number;
  excludedScopes: Array<{ path: string; reason: string }>;
  limitations: string[];
};
export function summarizeRepositories(
  baseRoot: string,
  currentRoot: string
): PolicySummary;

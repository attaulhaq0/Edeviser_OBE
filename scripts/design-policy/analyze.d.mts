export type DesignPolicyRule = "numbered-palette" | "literal-color-class" | "physical-spacing" | "fixed-text-px" | "literal-paint";
export interface SourceSnapshot { file: string; source: string }
export interface DesignFinding {
  rule: DesignPolicyRule;
  file: string;
  /** One-based TypeScript UTF-16 location of the owning literal/expression. */
  line: number;
  column: number;
  /** Full class candidate, or normalized paint-property:color literal. */
  token: string;
  /** Qualified lexical function/component/recipe binding; <module> if unnamed. */
  owner: string;
  /** JSON tuple of file/owner/rule/token, never a source-position hash. */
  fingerprint: string;
}
export interface DesignAnalysis { schemaVersion: 1; findings: DesignFinding[]; limitations: string[] }
export interface CountedFinding {
  fingerprint: string; file: string; owner: string; rule: DesignPolicyRule; token: string; count: number;
}
export interface DesignComparison {
  schemaVersion: 1;
  /** Accounting only, not semantic approval or repository policy status. */
  hasGrowth: boolean;
  introduced: CountedFinding[]; existing: CountedFinding[]; removed: CountedFinding[];
  totals: { baseline: number; current: number; introduced: number; existing: number; removed: number };
}
export const RULES: readonly DesignPolicyRule[];
export const LIMITATIONS: readonly string[];
export function analyzeSources(snapshots: readonly SourceSnapshot[]): DesignAnalysis;
export function fingerprintFinding(finding: Pick<DesignFinding, "file" | "owner" | "rule" | "token">): string;
export function compareFindings(baseline: readonly DesignFinding[], current: readonly DesignFinding[]): DesignComparison;

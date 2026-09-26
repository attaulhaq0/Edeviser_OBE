export interface InventoryRow {
  id: string;
  kind: "leaf" | "layout" | "supplemental";
  path: string | null;
  ledgerLine: number;
  ledgerStatus: "SOURCE_INVENTORIED";
  verificationStatus: "unverified";
}
export interface ReviewSummary {
  schemaVersion: 1;
  source: { path: string; sha256: string; kind: string };
  checksExecuted: 0;
  routeCounts: { leaf: number; layout: number; supplemental: number };
  verificationCounts: Record<
    "verified" | "unverified" | "skipped" | "failed",
    number
  >;
  readiness: Record<
    "implemented" | "connected" | "deployed" | "customerReady",
    "not_tested"
  >;
  limitations: string[];
  routes: InventoryRow[];
}
export function parseInventory(ledger: string): InventoryRow[];
export function buildReview(ledger: string): ReviewSummary;
export function runReview(options?: { root?: string; out?: string }): {
  counts: ReviewSummary["routeCounts"];
  output: string;
  checksExecuted: 0;
};

export interface RouteDeclaration {
  kind: "leaf" | "layout";
  group: string;
  path: string;
  owner: string;
  line: number;
}
export interface LedgerRoute {
  id: string;
  kind: "leaf" | "layout";
  group: string;
  path: string;
  owner: string | null;
}
export interface RouteFinding {
  rule:
    | "missing-source-route"
    | "route-owner-drift"
    | "unrecorded-source-route";
  id: string | null;
  path: string;
  expected?: string;
  actual?: string;
}
export interface RouteComparison {
  counts: {
    sourceLeaves: number;
    ledgerLeaves: number;
    sourceLayouts: number;
    ledgerLayouts: number;
  };
  findings: RouteFinding[];
}
export function resolveCriticalSegments(source: string): Map<string, string>;
export function readDeclaredRoutes(
  routerSource: string,
  criticalSource: string
): RouteDeclaration[];
export function readLedgerRoutes(content: string): LedgerRoute[];
export function compareRouteInventory(
  routerSource: string,
  criticalSource: string,
  ledgerSource: string
): RouteComparison;
export function checkCurrentRepository(root?: string): RouteComparison;

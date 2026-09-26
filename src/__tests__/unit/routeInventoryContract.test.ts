// @vitest-environment node
// Pure TypeScript AST + dated Markdown contracts; no app, auth, browser or DB.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkCurrentRepository,
  compareRouteInventory,
  readDeclaredRoutes,
  readLedgerRoutes,
  resolveCriticalSegments,
} from "../../../scripts/audit/route-inventory-contract.mjs";

const segments = `export const criticalRouteSegments = {
  teacher: { dashboard: "dashboard" }
} as const;`;
const router = `import { Routes, Route, Navigate } from "react-router-dom";
const App = () => <Routes>
  <Route path="/admin/*" element={<RouteGuard allowedRoles={["admin"]}><AdminLayout /></RouteGuard>}>
    <Route index element={<Navigate to="/admin/dashboard" />} />
    <Route path="users" element={<UserListPage />} />
  </Route>
  <Route path="/teacher/*" element={<RouteGuard allowedRoles={["teacher"]}><TeacherLayout /></RouteGuard>}>
    <Route path={criticalRouteSegments.teacher.dashboard} element={<TeacherDashboard />} />
  </Route>
  <Route path="/" element={<Navigate to="/login" />} />
</Routes>;`;
const ledger = `## Complete declared-route migration inventory — source only
| Inventory ID | Path (source line) | Route target | Caveat | Status |
| --- | --- | --- | --- | --- |
| route-admin-001 | \`/admin\` (L4) | \`Navigate\` | Index | SOURCE_INVENTORIED |
| route-admin-002 | \`/admin/users\` (L5) | \`UserListPage\` | Routed | SOURCE_INVENTORIED |
| route-teacher-001 | \`/teacher/dashboard\` (L8) | \`TeacherDashboard\` | Literal segment | SOURCE_INVENTORIED |
| route-public-001 | \`/\` (L10) | \`Navigate\` | Root | SOURCE_INVENTORIED |
| route-layout-admin | \`/admin/*\`, AppRouter L3 | Layout owner | SOURCE_INVENTORIED |
| route-layout-teacher | \`/teacher/*\`, AppRouter L7 | Layout owner | SOURCE_INVENTORIED |
| route-surface-guard | All roles | Separate owner row | SOURCE_INVENTORIED |
### Coverage boundary and next matrix expansion`;

const root = resolve(__dirname, "../../..");

describe("G01 read-only declared route inventory ratchet", () => {
  it("resolves only literal critical segments and retains index/layout/owner identity", () => {
    expect(resolveCriticalSegments(segments).get("teacher.dashboard")).toBe(
      "dashboard"
    );
    const declared = readDeclaredRoutes(router, segments);
    expect(
      declared.map(({ kind, group, path, owner }) => ({
        kind,
        group,
        path,
        owner,
      }))
    ).toEqual([
      {
        kind: "layout",
        group: "admin",
        path: "/admin/*",
        owner: "AdminLayout",
      },
      { kind: "leaf", group: "admin", path: "/admin", owner: "Navigate" },
      {
        kind: "leaf",
        group: "admin",
        path: "/admin/users",
        owner: "UserListPage",
      },
      {
        kind: "layout",
        group: "teacher",
        path: "/teacher/*",
        owner: "TeacherLayout",
      },
      {
        kind: "leaf",
        group: "teacher",
        path: "/teacher/dashboard",
        owner: "TeacherDashboard",
      },
      { kind: "leaf", group: "public", path: "/", owner: "Navigate" },
    ]);
    expect(compareRouteInventory(router, segments, ledger).findings).toEqual(
      []
    );
    expect(readLedgerRoutes(ledger)).toHaveLength(6); // Surface is not a JSX Route.
  });

  it("detects missing and newly declared routes rather than blessing a fixed count", () => {
    const removed = router.replace(
      '    <Route path="users" element={<UserListPage />} />\n',
      ""
    );
    expect(
      compareRouteInventory(removed, segments, ledger).findings
    ).toContainEqual(
      expect.objectContaining({
        rule: "missing-source-route",
        id: "route-admin-002",
      })
    );
    const added = router.replace(
      '    <Route path="users" element={<UserListPage />} />',
      '    <Route path="users" element={<UserListPage />} /><Route path="users/new" element={<UserForm />} />'
    );
    expect(
      compareRouteInventory(added, segments, ledger).findings
    ).toContainEqual(
      expect.objectContaining({
        rule: "unrecorded-source-route",
        path: "/admin/users/new",
        actual: "UserForm",
      })
    );
  });

  it("detects changed owner or critical route segment, not only route totals", () => {
    const rebound = router.replace(
      'path="users" element={<UserListPage />}',
      'path="users" element={<OtherListPage />}'
    );
    expect(
      compareRouteInventory(rebound, segments, ledger).findings
    ).toContainEqual(
      expect.objectContaining({
        rule: "route-owner-drift",
        id: "route-admin-002",
        expected: "UserListPage",
        actual: "OtherListPage",
      })
    );
    const segment = segments.replace(
      'dashboard: "dashboard"',
      'dashboard: "start"'
    );
    const findings = compareRouteInventory(router, segment, ledger).findings;
    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: "missing-source-route",
        path: "/teacher/dashboard",
      })
    );
    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: "unrecorded-source-route",
        path: "/teacher/start",
      })
    );
  });

  it("fails closed on ambiguous JSX, dynamic segments, duplicates or unreviewed ledger statuses", () => {
    expect(() =>
      readDeclaredRoutes(
        router.replace('path="users"', "path={buildRoute()}"),
        segments
      )
    ).toThrow("Unsupported Route path expression");
    expect(() =>
      readDeclaredRoutes(
        router.replace(
          '    <Route path="users" element={<UserListPage />} />',
          '    <Route path="users" element={<UserListPage />} /><Route path="users" element={<UserListPage />} />'
        ),
        segments
      )
    ).toThrow("Duplicate declared Route");
    expect(() =>
      readLedgerRoutes(ledger.replace("route-admin-002", "route-admin-001"))
    ).toThrow("Duplicate route inventory id");
    expect(() =>
      readLedgerRoutes(ledger.replace("SOURCE_INVENTORIED", "VERIFIED"))
    ).toThrow("Unreviewed ledger status");
    expect(() =>
      resolveCriticalSegments(
        segments.replace('dashboard: "dashboard"', "dashboard: compute()")
      )
    ).toThrow("not a literal segment");
  });

  it("checks the standalone student's actual guard role, not only its URL prefix", () => {
    const rootRoute = '<Route path="/" element={<Navigate to="/login" />} />';
    const focus =
      '<Route path="/student/focus/:sessionId" element={<RouteGuard allowedRoles={["student"]}><RouteContentBoundary immersive><FocusModePage /></RouteContentBoundary></RouteGuard>} />';
    const withFocus = router.replace(
      rootRoute,
      `${focus}
  ${rootRoute}`
    );
    const ledgerWithFocus = ledger.replace(
      "| route-public-001 |",
      [
        "| route-student-001 | `/student/focus/:sessionId` (L11) | `FocusModePage` | Standalone guarded | SOURCE_INVENTORIED |",
        "| route-public-001 |",
      ].join("\n")
    );
    expect(
      compareRouteInventory(withFocus, segments, ledgerWithFocus).findings
    ).toEqual([]);
    expect(() =>
      readDeclaredRoutes(
        withFocus.replace(/RouteContentBoundary/g, "UnknownBoundary"),
        segments
      )
    ).toThrow("Route element has ambiguous owner/guard");
    const wrongRole = withFocus.replace(
      'allowedRoles={["student"]}',
      'allowedRoles={["teacher"]}'
    );
    expect(() => readDeclaredRoutes(wrongRole, segments)).toThrow(
      "RouteGuard role does not match student route"
    );
  });
  it("inspects the current source against all dated ledger leaves and layouts without runtime claims", () => {
    const summary = checkCurrentRepository(root);
    expect(summary.counts).toEqual({
      sourceLeaves: 212,
      ledgerLeaves: 212,
      sourceLayouts: 5,
      ledgerLayouts: 5,
    });
    expect(summary.findings).toEqual([]);
    const ledgerText = readFileSync(
      resolve(root, "docs/audits/frontend-forensic-remediation-ledger.md"),
      "utf8"
    );
    expect(ledgerText).toContain(
      "Every inventory row is SOURCE_INVENTORIED only"
    );
  });
});

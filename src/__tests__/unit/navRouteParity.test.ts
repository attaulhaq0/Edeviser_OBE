/**
 * Feature: continuous-verification — NAV↔ROUTE parity guard.
 *
 * Regression guard for the bug class found in the 2026-09-05 coverage audit:
 * a sidebar item (`/teacher/content`, "Course Materials") pointed at a route
 * that was never defined, so every teacher clicking it got a 404 while the
 * feature itself lived inside Modules. Static review missed it because the
 * nav item and the route lived in different files.
 *
 * This test imports the REAL `navItems` definitions and parses the REAL
 * `AppRouter` route tree (reconstructing nested absolute paths, including the
 * `criticalRouteSegments` dynamic segments), then asserts:
 *
 *   1. every nav destination resolves to a defined route (no 404 nav items)
 *   2. no role has duplicate nav destinations (the "extra/double" nav class —
 *      e.g. the former `Institution Structure` + `Departments` double that
 *      both opened the same DepartmentManager)
 *
 * If you add a nav item, add its route; if you add a route, decide whether it
 * deserves navigation. This test keeps that contract machine-checked.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { navItems } from "@/lib/navItems";
import { criticalRouteSegments } from "@/lib/criticalRoutes";
import type { UserRole } from "@/types/app";

const routerSource = readFileSync(
  resolve(process.cwd(), "src/router/AppRouter.tsx"),
  "utf8"
);

/** Resolve `path={criticalRouteSegments.<role>.<key>}` to literal paths. */
const segmentTable = criticalRouteSegments as Record<
  string,
  Record<string, string>
>;
const withLiteralSegments = routerSource.replace(
  /path=\{criticalRouteSegments\.(\w+)\.(\w+)\}/g,
  (_match, role: string, key: string) =>
    `path="${segmentTable[role]?.[key] ?? ""}"`
);

/**
 * Walks the JSX `<Route>` tree and returns every defined absolute route path.
 * Tracks a parent-prefix stack: a self-closing `<Route ... />` is a leaf, an
 * opening `<Route ...>` pushes its path for its children (`/*` parents are
 * stripped of the wildcard before joining children).
 */
const extractRoutes = (src: string): Set<string> => {
  const routes = new Set<string>();
  const stack: string[] = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("<Route", i);
    const close = src.indexOf("</Route>", i);
    if (open === -1) break;
    if (close !== -1 && close < open) {
      stack.pop();
      i = close + "</Route>".length;
      continue;
    }
    // Scan to the tag's true closing '>' (element={...} may contain '>' chars).
    let j = open + "<Route".length;
    let braceDepth = 0;
    let selfClosing = false;
    while (j < src.length) {
      const ch = src[j];
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
      else if (ch === ">" && braceDepth === 0) {
        selfClosing = src[j - 1] === "/";
        break;
      }
      j++;
    }
    const tagBody = src.slice(open + "<Route".length, j);
    const pathMatch = /path="([^"]+)"/.exec(tagBody);
    if (pathMatch?.[1]) {
      const segment: string = pathMatch[1];
      const parentPrefix = (stack[stack.length - 1] ?? "").replace(/\/\*$/, "");
      const absolute: string = segment.startsWith("/")
        ? segment
        : `${parentPrefix}/${segment}`;
      const normalized = absolute.replace(/\/+$/, "");
      if (normalized.length > 0) routes.add(normalized);
      if (!selfClosing) stack.push(normalized);
    } else if (!selfClosing) {
      stack.push(stack[stack.length - 1] ?? "");
    }
    i = j + 1;
  }
  return routes;
};

const definedRoutes = extractRoutes(withLiteralSegments);

describe("NAV ↔ ROUTE parity (continuous-verification regression guard)", () => {
  it("the router defines a meaningful route surface", () => {
    // Sanity: the parser found the real tree (guards against silent no-ops).
    expect(definedRoutes.size).toBeGreaterThan(80);
    expect(definedRoutes.has("/teacher/modules")).toBe(true);
    expect(definedRoutes.has("/student/friends")).toBe(true);
  });

  for (const role of Object.keys(navItems) as UserRole[]) {
    const items = navItems[role];
    it(`every ${role} nav item resolves to a defined route (no 404 sidebar links)`, () => {
      const missing = items
        .map((item) => item.to)
        .filter((to) => !definedRoutes.has(to));
      expect(missing).toEqual([]);
    });

    it(`${role} nav has no duplicate destinations`, () => {
      const destinations = items.map((item) => item.to);
      expect(new Set(destinations).size).toBe(destinations.length);
    });
  }

  it("previously-orphaned admin pages are now surfaced in the admin nav", () => {
    const adminDests = navItems.admin.map((item) => item.to);
    // Regression: these routes existed with zero navigation entry (2026-09-05 audit).
    expect(adminDests).toContain("/admin/historical-evidence");
    expect(adminDests).toContain("/admin/graduate-attributes");
    expect(adminDests).toContain("/admin/onboarding/pending");
  });

  it("the duplicate Institution Structure nav entry stays removed", () => {
    const adminDests = navItems.admin.map((item) => item.to);
    // Both /admin/departments and /admin/settings/institution open the same
    // DepartmentManager — the sidebar must expose exactly one of them.
    expect(adminDests).not.toContain("/admin/settings/institution");
    expect(adminDests).toContain("/admin/departments");
  });
});

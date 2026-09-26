// @vitest-environment node
// Declared routes + authored nav contracts; not authenticated destination rendering.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { navItems } from "@/lib/navItems";
import { navActiveAliases } from "@/lib/navActive";
import {
  getMobileTabItems,
  getMoreNavItems,
  getPrimaryNavItems,
  mobileFabPathByRole,
} from "@/lib/navPresentation";
import { readDeclaredRoutes } from "../../../scripts/audit/route-inventory-contract.mjs";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const routes = readDeclaredRoutes(
  read("src/router/AppRouter.tsx"),
  read("src/lib/criticalRoutes.ts")
);
const routeByPath = new Map(
  routes.filter((item) => item.kind === "leaf").map((item) => [item.path, item])
);
const roles = ["admin", "coordinator", "teacher", "student", "parent"] as const;
const resources = Object.fromEntries(
  ["en", "ar"].map((lang) => [
    lang,
    JSON.parse(read(`src/locales/${lang}/common.json`)),
  ])
);
const translation = (lang: "en" | "ar", key: string): unknown =>
  key
    .split(".")
    .reduce<unknown>(
      (owner, part) =>
        owner && typeof owner === "object" && part in owner
          ? (owner as Record<string, unknown>)[part]
          : undefined,
      resources[lang]
    );

describe("S05 route-backed role navigation destinations", () => {
  it("keeps exactly the five approved role sets and explicit canonical settings owner", () => {
    expect(Object.keys(navItems).sort()).toEqual([...roles].sort());
    expect(routeByPath.get("/admin/settings/configuration")).toMatchObject({
      group: "admin",
      owner: "InstitutionSettingsPage",
    });
    for (const alias of [
      "/admin/departments",
      "/admin/structure",
      "/admin/settings/institution",
    ])
      expect(routeByPath.get(alias)?.owner).toBe("DepartmentManager");
    expect(navItems.admin.map((item) => item.to)).toContain(
      "/admin/settings/configuration"
    );
    expect(navItems.admin.map((item) => item.to)).not.toContain(
      "/admin/settings/institution"
    );
  });

  it("keeps presentation aliases bound to real routes with the same owner or redirect", () => {
    for (const [role, aliases] of Object.entries(navActiveAliases))
      for (const [path, target] of Object.entries(aliases ?? {})) {
        const source = routeByPath.get(path),
          canonical = routeByPath.get(target);
        expect(source).toMatchObject({ group: role, kind: "leaf" });
        expect(canonical).toMatchObject({ group: role, kind: "leaf" });
        expect(
          source?.owner === canonical?.owner || source?.owner === "Navigate"
        ).toBe(true);
        expect(
          navItems[role as keyof typeof navItems].some(
            (item) => item.to === path
          )
        ).toBe(false);
      }
  });
  it.each(roles)(
    "exposes every %s-listed destination once across primary and MORE",
    (role) => {
      const source = navItems[role].map((item) => item.to);
      const primary = getPrimaryNavItems(role),
        more = getMoreNavItems(role),
        all = [...primary, ...more];
      expect(new Set(source).size).toBe(source.length);
      expect(all).toHaveLength(source.length);
      expect(new Set(all.map((item) => item.to))).toEqual(new Set(source));
      for (const item of all) {
        expect(item.to.startsWith(`/${role}/`)).toBe(true);
        expect(routeByPath.get(item.to)).toMatchObject({
          group: role,
          kind: "leaf",
        });
        for (const lang of ["en", "ar"] as const) {
          const value = translation(lang, item.labelKey);
          expect(typeof value).toBe("string");
          expect((value as string).trim()).not.toBe("");
          expect(value).not.toBe(item.labelKey);
          expect(value).not.toMatch(/⚠|\ufffd/);
        }
      }
      const mobile = getMobileTabItems(role),
        primaryPaths = new Set(primary.map((item) => item.to));
      expect(
        mobile.filter((item) => item.raised).map((item) => item.to)
      ).toEqual([mobileFabPathByRole[role]]);
      for (const tab of mobile) {
        expect(primaryPaths.has(tab.to)).toBe(true);
        expect(routeByPath.get(tab.to)).toMatchObject({
          group: role,
          kind: "leaf",
        });
      }
    }
  );

  it("keeps conditional student surveys in declared MORE without promising it is always rendered", () => {
    expect(
      getMoreNavItems("student").find((item) => item.to === "/student/surveys")
        ?.labelKey
    ).toBe("nav.surveys");
  });
});

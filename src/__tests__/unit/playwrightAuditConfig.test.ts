// Import the configuration only: globalSetup/teardown are path declarations,
// so this checks the browser contract without launching or seeding anything.
// These imports also keep both configurations in the root TypeScript graph.
import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../../playwright.config.ts";
import visualConfig from "../../../playwright.visual.config.ts";

const originalArgv = process.argv;
afterEach(() => { process.argv = originalArgv; });

describe("Playwright audit configuration contract", () => {
  it.each(["admin", "coordinator", "teacher", "student", "parent", "cross-role", "rtl-ar"])(
    "%s applies reduced motion through supported browser context options",
    (name) => {
      const project = config.projects?.find((entry) => entry.name === name);
      expect(project).toBeDefined();
      expect(project?.use?.contextOptions?.reducedMotion).toBe("reduce");
      expect(project?.use).not.toHaveProperty("reducedMotion");
    }
  );

  it("keeps the documented student Chromium and parent WebKit matrix", () => {
    const student = config.projects?.find((project) => project.name === "student");
    const parent = config.projects?.find((project) => project.name === "parent");
    expect(student?.use?.defaultBrowserType).toBe("chromium");
    expect(parent?.use?.defaultBrowserType).toBe("webkit");
  });

  it("applies the supported reduced-motion API to the isolated visual config", () => {
    expect(visualConfig.use?.contextOptions?.reducedMotion).toBe("reduce");
    expect(visualConfig.use).not.toHaveProperty("reducedMotion");
  });

  it.each([
    ["audit", config],
    ["visual", visualConfig],
  ] as const)("%s verification neither updates nor ignores snapshots", (_name, current) => {
    expect(current.updateSnapshots).toBe("none");
    expect(current.ignoreSnapshots).toBe(false);
  });

  // Import actual config modules with controlled arguments. No Playwright runner,
  // browser, globalSetup, seed, teardown or capture module is executed here.
  for (const kind of ["audit", "visual"] as const) {
    const load = () => kind === "audit"
      ? import("../../../playwright.config.ts")
      : import("../../../playwright.visual.config.ts");

    it.each([
      ["long update", ["--update-snapshots"]],
      ["explicit update mode", ["--update-snapshots", "all"]],
      ["equals update mode", ["--update-snapshots=missing"]],
      ["short update", ["-u"]],
      ["attached short mode", ["-uchanged"]],
      ["combined short options", ["-qu"]],
      ["explicit none override", ["--update-snapshots=none"]],
      ["ignored comparisons", ["--ignore-snapshots"]],
    ] as const)(`${kind} rejects %s before runner setup`, async (_label, args) => {
      process.argv = ["node", "playwright", "test", ...args];
      vi.resetModules();
      await expect(load()).rejects.toThrow("Snapshot update/ignore CLI overrides are disabled");
    });

    it(`${kind} permits ordinary collection arguments without changing policy`, async () => {
      process.argv = ["node", "playwright", "test", "--list", "--grep=update-snapshots"];
      vi.resetModules();
      const current = (await load()).default;
      expect(current.updateSnapshots).toBe("none");
      expect(current.ignoreSnapshots).toBe(false);
    });
  }

  it("initializes browser evidence before unchanged Preview seed setup", () => {
    expect(config.globalSetup).toEqual([
      "./tests/e2e/_fixtures/axe-setup.ts",
      "./tests/e2e/_fixtures/seed.ts",
    ]);
    expect(config.globalTeardown).toBe("./tests/e2e/_fixtures/teardown.ts");
  });
});

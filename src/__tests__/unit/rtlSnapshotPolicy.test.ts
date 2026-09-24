// Hermetic control-flow tests of the actual RTL spec: the Playwright registration,
// filesystem, auth loader and page are isolated. No runner/setup/browser/network,
// snapshot files or image-approval claim is involved.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type RtlPageFixture = {
  context: () => object;
  goto: (url: string) => Promise<void>;
  waitForLoadState: (state: string) => Promise<void>;
  url: () => string;
  locator: (selector: string) => object;
  screenshot: (options: { fullPage: boolean }) => Promise<Uint8Array>;
};
type SnapshotInfoFixture = {
  config: { updateSnapshots: string };
  project: { ignoreSnapshots: boolean };
  snapshotPath: (name: string) => string;
};
type RegisteredCase = {
  title: string;
  run: (fixtures: { page: RtlPageFixture }, info: SnapshotInfoFixture) => Promise<void>;
};

const harness = vi.hoisted(() => ({
  cases: [] as RegisteredCase[],
  exists: vi.fn(),
  mkdir: vi.fn(),
  write: vi.fn(),
  loadStorageState: vi.fn(),
  compare: vi.fn(),
  html: { fixture: "html" },
  attributes: {} as Record<string, string | undefined>,
  currentUrl: "about:blank",
  redirectPath: undefined as string | undefined,
}));

vi.mock("node:fs", () => {
  // Cover Node's CJS default interop as well as named imports, without exposing
  // the real filesystem to the spec's registration or verification callbacks.
  const filesystem = {
    existsSync: harness.exists,
    mkdirSync: harness.mkdir,
    writeFileSync: harness.write,
  };
  return { ...filesystem, default: filesystem };
});
vi.mock("../../../tests/e2e/_helpers/auth.ts", () => ({
  loadStorageState: harness.loadStorageState,
}));
vi.mock("@playwright/test", () => ({
  test: Object.assign(
    (title: string, run: RegisteredCase["run"]) => { harness.cases.push({ title, run }); },
    { describe: (_title: string, register: () => void) => { register(); } }
  ),
  expect: Object.assign(
    (actual: unknown) => ({
      toHaveAttribute: async (name: string, expected: string | RegExp) => {
        expect(actual).toBe(harness.html);
        if (expected instanceof RegExp) expect(harness.attributes[name]).toMatch(expected);
        else expect(harness.attributes[name]).toBe(expected);
      },
      toMatchSnapshot: (name: string, options: unknown) => {
        harness.compare(actual, name, options);
      },
    }),
    {
      poll: (read: () => unknown) => ({
        toBe: async (expected: unknown) => { expect(await read()).toBe(expected); },
      }),
    }
  ),
}));

const collectionEffects = { exists: 0, mkdir: 0, write: 0, auth: 0 };
beforeAll(async () => {
  await import("../../../tests/e2e/rtl/layout.spec.ts");
  // Record BEFORE clearing per-case mocks, so module-load writes cannot be hidden.
  collectionEffects.exists = harness.exists.mock.calls.length;
  collectionEffects.mkdir = harness.mkdir.mock.calls.length;
  collectionEffects.write = harness.write.mock.calls.length;
  collectionEffects.auth = harness.loadStorageState.mock.calls.length;
});
beforeEach(() => {
  vi.clearAllMocks();
  harness.exists.mockReturnValue(true);
  harness.attributes = { dir: "rtl", lang: "ar" };
  harness.currentUrl = "about:blank";
  harness.redirectPath = undefined;
});

function registered(role: string) {
  const entry = harness.cases.find(({ title }) => title.includes(`— ${role} `));
  if (!entry) throw new Error(`Missing registered RTL case for ${role}`);
  return entry;
}

function fixture() {
  const screenshot = new Uint8Array([1, 2, 3]);
  const page = {
    context: vi.fn(() => ({})),
    goto: vi.fn(async (url: string) => {
      harness.currentUrl = harness.redirectPath ? new URL(harness.redirectPath, url).href : url;
    }),
    waitForLoadState: vi.fn(async (_state: string) => {}),
    url: vi.fn(() => harness.currentUrl),
    locator: vi.fn((_selector: string) => harness.html),
    screenshot: vi.fn(async (_options: { fullPage: boolean }) => screenshot),
  };
  const info = {
    config: { updateSnapshots: "none" },
    project: { ignoreSnapshots: false },
    snapshotPath: vi.fn((name: string) => `/matcher-owned/project-platform/${name}`),
  };
  return { page, info, screenshot };
}

const roleCases = [
  ["admin", "/admin/dashboard", "dashboard"],
  ["coordinator", "/coordinator/matrix", "curriculum matrix"],
  ["teacher", "/teacher/dashboard", "dashboard"],
  ["student", "/student/learning-path", "learning path"],
  ["parent", "/parent/dashboard", "dashboard"],
] as const;

describe("RTL verification policy", () => {
  it("registers five cases without filesystem or auth activity during collection", () => {
    expect(harness.cases).toHaveLength(5);
    expect(collectionEffects).toEqual({ exists: 0, mkdir: 0, write: 0, auth: 0 });
  });

  it.each(roleCases)("%s checks exactly the matcher's path and preserves its real surface", async (role, path, surface) => {
    const { page, info, screenshot } = fixture();
    await registered(role).run({ page }, info);
    const name = `rtl-${role}.png`;
    expect(registered(role).title).toContain(`${role} ${surface} renders`);
    expect(new URL(harness.currentUrl).pathname).toBe(path);
    expect(info.snapshotPath).toHaveBeenCalledExactlyOnceWith(name);
    expect(harness.exists).toHaveBeenCalledExactlyOnceWith(`/matcher-owned/project-platform/${name}`);
    expect(harness.loadStorageState).toHaveBeenCalledWith(expect.any(Object), role);
    expect(page.locator).toHaveBeenCalledWith("html");
    expect(page.screenshot).toHaveBeenCalledExactlyOnceWith({ fullPage: true });
    expect(harness.compare).toHaveBeenCalledExactlyOnceWith(screenshot, name, {
      maxDiffPixelRatio: 0.003,
      threshold: 0.2,
    });
    expect(harness.mkdir).not.toHaveBeenCalled();
    expect(harness.write).not.toHaveBeenCalled();
  });

  it("fails on a missing canonical baseline before auth, navigation, capture or comparison", async () => {
    harness.exists.mockReturnValue(false);
    const { page, info } = fixture();
    await expect(registered("admin").run({ page }, info)).rejects.toThrow(
      "Missing RTL baseline: /matcher-owned/project-platform/rtl-admin.png"
    );
    expect(harness.loadStorageState).not.toHaveBeenCalled();
    expect(page.context).not.toHaveBeenCalled();
    expect(page.goto).not.toHaveBeenCalled();
    expect(page.screenshot).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
    expect(harness.write).not.toHaveBeenCalled();
    expect(harness.mkdir).not.toHaveBeenCalled();
  });

  it("does not accept the obsolete independently named baseline", async () => {
    harness.exists.mockImplementation((path: string) => path.endsWith("/rtl-screens/admin.png"));
    const { page, info } = fixture();
    await expect(registered("admin").run({ page }, info)).rejects.toThrow("Missing RTL baseline");
    expect(harness.exists).toHaveBeenCalledExactlyOnceWith("/matcher-owned/project-platform/rtl-admin.png");
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it.each(["all", "changed", "missing"])("rejects resolved updateSnapshots=%s before even reading the baseline", async (mode) => {
    const { page, info } = fixture();
    info.config.updateSnapshots = mode;
    await expect(registered("admin").run({ page }, info)).rejects.toThrow("updateSnapshots=none");
    expect(harness.exists).not.toHaveBeenCalled();
    expect(harness.loadStorageState).not.toHaveBeenCalled();
    expect(page.goto).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it("rejects resolved ignoreSnapshots even with an existing reference", async () => {
    const { page, info } = fixture();
    info.project.ignoreSnapshots = true;
    await expect(registered("admin").run({ page }, info)).rejects.toThrow("ignoreSnapshots=false");
    expect(harness.exists).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it.each([
    ["missing direction", undefined, "ar"],
    ["wrong direction", "ltr", "ar"],
    ["missing language", "rtl", undefined],
    ["wrong language", "rtl", "en"],
    ["unrelated language prefix", "rtl", "arc"],
  ] as const)("rejects %s instead of treating language and direction as alternatives", async (_label, dir, lang) => {
    const { page, info } = fixture();
    harness.attributes = { dir, lang };
    await expect(registered("admin").run({ page }, info)).rejects.toThrow();
    expect(page.screenshot).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it("accepts an actual Arabic regional language tag without forcing attributes", async () => {
    const { page, info } = fixture();
    harness.attributes = { dir: "rtl", lang: "ar-QA" };
    await registered("admin").run({ page }, info);
    expect(harness.compare).toHaveBeenCalledTimes(1);
  });

  it.each(["/login", "/student/dashboard"])("rejects an unexpected final route %s before capturing", async (redirect) => {
    const { page, info } = fixture();
    harness.redirectPath = redirect;
    await expect(registered("admin").run({ page }, info)).rejects.toThrow();
    expect(page.screenshot).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it("does not accept a different page merely because its role prefix matches", async () => {
    const { page, info } = fixture();
    harness.redirectPath = "/coordinator/dashboard";
    await expect(registered("coordinator").run({ page }, info)).rejects.toThrow();
    expect(page.screenshot).not.toHaveBeenCalled();
  });
});

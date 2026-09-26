// @vitest-environment node
// This suite exercises a Node filesystem CLI; do not apply browser asset-URL transforms.
import { spawnSync } from "node:child_process";
import {
  closeSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  run, scanDesignSystem, scanSource,
  type DesignLintFilesystem,
} from "../../../scripts/design-lint/check.mjs";

const workspaces: string[] = [];
const script = fileURLToPath(new URL("../../../scripts/design-lint/check.mjs", import.meta.url));
// Build forbidden fixture utilities so this source-text gate can scan its own
// regression tests without excluding test directories from enforcement.
const background = (color = "blue", shade = "50"): string => ["bg", color, shade].join("-");
const legacy = ["from-teal-500", "to-blue-600"].join(" ");
const rawGradient = "var(--brand-gradient)";
const workspace = (): string => {
  const root = mkdtempSync(join(tmpdir(), "edeviser-design-lint-"));
  workspaces.push(root);
  return root;
};
const fixture = (root: string, file: string, source: string): void => {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source, "utf8");
};
const filesystem = (): DesignLintFilesystem => ({
  lstat: lstatSync,
  readdir: (path) => readdirSync(path, { withFileTypes: true }),
  readFile: (path) => readFileSync(path, "utf8"),
});
const output = (): { log: Mock<(message: string) => void>; error: Mock<(message: string) => void> } => ({
  log: vi.fn<(message: string) => void>(), error: vi.fn<(message: string) => void>(),
});

// Use file descriptors rather than subprocess output pipes: this also works in
// the Windows workspace sandbox and still asserts the actual CLI diagnostics.
const node = (root: string, args: string[]): { status: number | null; text: string } => {
  const logPath = join(root, "cli-output.log");
  const fd = openSync(logPath, "w");
  try {
    const child = spawnSync(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", fd, fd],
      timeout: 15000,
    });
    if (child.error) throw child.error;
    return { status: child.status, text: readFileSync(logPath, "utf8") };
  } finally {
    closeSync(fd);
  }
};

afterEach(() => {
  for (const root of workspaces.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("design lint pure source scanner", () => {
  it("detects each intended check and preserves line numbers across CRLF", () => {
    const findings = scanSource("src/pages/Fixture.tsx", [
      "// clean line", background(), legacy, 'className="ml-4"', rawGradient,
    ].join("\r\n"));
    expect(findings.map(({ check, line }) => ({ check, line }))).toEqual([
      { check: "icon-background", line: 2 },
      { check: "legacy-gradient", line: 3 },
      { check: "physical-css", line: 4 },
      { check: "raw-brand-gradient", line: 5 },
    ]);
  });

  it("detects all original icon colors without conflating 50 with 500", () => {
    const colors = [
      "blue", "green", "yellow", "red", "purple", "indigo", "orange", "teal",
      "pink", "rose", "amber", "emerald", "cyan", "sky", "violet", "fuchsia",
    ];
    for (const color of colors) {
      expect(scanSource("src/example.ts", background(color))).toHaveLength(1);
      expect(scanSource("src/example.ts", background(color, "500"))).toEqual([]);
    }
  });

  it("honors utility boundaries, variants, important and opacity modifiers", () => {
    const forbidden = background();
    for (const text of [forbidden, `hover:${forbidden}`, `!${forbidden}`, `${forbidden}!`, `${forbidden}/80`]) {
      expect(scanSource("src/example.tsx", text)).toHaveLength(1);
    }
    for (const text of [`custom-${forbidden}`, `${forbidden}-custom`, `${forbidden}0`, `_${forbidden}`]) {
      expect(scanSource("src/example.tsx", text)).toEqual([]);
    }
    expect(scanSource("src/example.tsx", 'className="hover:-ml-4 !pr-2"')).toHaveLength(1);
    expect(scanSource("src/example.tsx", 'className={`ml-${spacing}`}')).toHaveLength(1);
    expect(scanSource("src/example.tsx", 'className="ml-(--spacing)"')).toHaveLength(1);
    expect(scanSource("src/example.tsx", 'className="custom-ml-4 ms-4 me-4 ps-4 pe-4"')).toEqual([]);
  });

  it("keeps both legacy pair checks without overbroad suffix or prefix matches", () => {
    const alternate = ["bg-gradient-to-r", "from-teal-500"].join(" ");
    for (const pair of [legacy, alternate]) {
      expect(scanSource("src/styles.css", pair)).toHaveLength(1);
      expect(scanSource("src/styles.css", pair.replace(" ", "   "))).toHaveLength(1);
      expect(scanSource("src/styles.css", `custom-${pair}`)).toEqual([]);
      expect(scanSource("src/styles.css", `${pair}0`)).toEqual([]);
    }
  });

  it("preserves extension-specific check scopes, not broad directory exclusions", () => {
    const source = `${background()} ${legacy} ml-4 ${rawGradient}`;
    expect(scanSource("src/file.ts", source).map(({ check }) => check)).toEqual([
      "icon-background", "legacy-gradient",
    ]);
    expect(scanSource("src/file.css", source).map(({ check }) => check)).toEqual(["legacy-gradient"]);
    expect(scanSource("src/file.json", source)).toEqual([]);
    for (const file of ["src/__tests__/nested/Fixture.tsx", "src/components/ui/Fixture.tsx", "src/design-system/nested/Fixture.tsx"]) {
      expect(scanSource(file, source)).toHaveLength(4);
    }
  });

  it("preserves each exact semantic exemption and never exempts neighboring files or other checks", () => {
    const exemptions = [
      "src/lib/attainmentClassifier.ts", "src/lib/bloomsVerbs.ts",
      "src/lib/leagueTier.ts", "src/lib/aiGovernancePolicy.ts", "src/pages/LoginPage.tsx",
    ];
    for (const file of exemptions) {
      expect(scanSource(file, background())).toEqual([]);
      expect(scanSource(file.replace(/\//g, "\\"), background())).toEqual([]);
      expect(scanSource(`${file}.backup.tsx`, background())).toHaveLength(1);
      expect(scanSource(`${file}/nested.ts`, background())).toHaveLength(1);
      expect(scanSource(file, legacy)).toHaveLength(1);
    }
    expect(scanSource("src/pages/LoginPage.tsx", `ml-4 ${rawGradient}`)).toHaveLength(2);
  });

  it("limits the raw gradient exemption to NotFoundPage, not prefixes or other checks", () => {
    expect(scanSource("src/pages/NotFoundPage.tsx", rawGradient)).toEqual([]);
    expect(scanSource("src/pages/NotFoundPage.tsx.backup.tsx", rawGradient)).toHaveLength(1);
    expect(scanSource("src/pages/NotFoundPage.tsx", `${background()} ml-4`)).toHaveLength(2);
    expect(scanSource("src/pages/Other.tsx", "var( --brand-gradient )")).toHaveLength(1);
  });

  it("remains pure and repeatable, counting repeated same-line colors only once", () => {
    const source = `${background()} ${background()} ${background("red")}`;
    const first = scanSource("src/example.ts", source);
    expect(first).toHaveLength(2);
    expect(scanSource("src/example.ts", source)).toEqual(first);
  });
});

describe("design lint deterministic traversal and failure reporting", () => {
  it("scans clean fixtures and reports an explicit successful run", () => {
    const root = workspace();
    fixture(root, "src/pages/Clean.tsx", 'className="bg-white/80 bg-transparent ms-4"');
    expect(scanDesignSystem(root)).toEqual({ filesScanned: 1, violations: [] });
    const messages = output();
    expect(run(["--root", root], messages)).toBe(0);
    expect(messages.log).toHaveBeenCalledWith("ALL CHECKS PASSED");
    expect(messages.error).not.toHaveBeenCalled();
  });

  it("scans arbitrarily nested, hidden and root-level source in sorted order", () => {
    const root = workspace();
    const paths = [
      "src/z/last.tsx", "src/a/deep/deeper/first.tsx", "src/root.ts",
      "src/a.ts", "src/.hidden/nested.tsx",
    ];
    for (const file of paths) fixture(root, file, `\n${background()}`);
    fixture(root, "src/nested/style.css", legacy);
    fixture(root, "src/nested/ignored.json", background());
    const io = filesystem();
    const normalReadDirectory = io.readdir;
    io.readdir = (path) => normalReadDirectory(path).reverse();
    const expectedPaths = [...paths, "src/nested/style.css"].sort();
    const result = scanDesignSystem(root, io);
    expect(result.filesScanned).toBe(6);
    expect(result.violations.map(({ file }) => file)).toEqual(expectedPaths);
    expect(scanDesignSystem(root)).toEqual(result);
    const messages = output();
    expect(run(["--root", root], messages)).toBe(1);
    expect(messages.error).toHaveBeenCalledWith("6 TOTAL VIOLATION(S) FOUND");
  });

  it("fails closed for missing roots, missing src, non-directories and empty scans", () => {
    const root = workspace();
    for (const directory of [join(root, "missing"), root]) {
      expect(() => scanDesignSystem(directory)).toThrow(/Cannot inspect/);
      const messages = output();
      expect(run(["--root", directory], messages)).toBe(2);
      expect(messages.log).not.toHaveBeenCalledWith("ALL CHECKS PASSED");
    }
    writeFileSync(join(root, "src"), "not a directory");
    expect(() => scanDesignSystem(root)).toThrow(/real directory/);
    rmSync(join(root, "src"));
    mkdirSync(join(root, "src"));
    expect(() => scanDesignSystem(root)).toThrow(/No .ts, .tsx or .css/);
  });

  it.each(["readdir", "readFile"] as const)("fails closed on %s errors without printing passing checks", (operation) => {
    const root = workspace();
    fixture(root, "src/deep/fixture.tsx", background());
    const io = filesystem();
    io[operation] = () => { throw new Error("EACCES: controlled I/O failure"); };
    expect(() => scanDesignSystem(root, io)).toThrow(/EACCES: controlled I\/O failure/);
    const messages = output();
    expect(run(["--root", root], messages, io)).toBe(2);
    expect(messages.error).toHaveBeenCalledWith(expect.stringContaining("EACCES: controlled I/O failure"));
    expect(messages.log.mock.calls.flat().join("\n")).not.toContain("[PASS]");
  });

  it("rejects linked entries rather than omitting them or following cycles", () => {
    const root = workspace();
    fixture(root, "src/deep/fixture.tsx", background());
    const io = filesystem();
    const readDirectory = io.readdir;
    io.readdir = (path) => readDirectory(path).map((entry) => {
      // A Dirent seam avoids requiring Windows symlink-creation privileges.
      entry.isSymbolicLink = () => true;
      return entry;
    });
    expect(() => scanDesignSystem(root, io)).toThrow(/Symbolic links are not supported/);
  });

  it.each([["--unknown"], ["--root"], ["--root", "--unknown"], ["one", "two"]])("rejects malformed arguments %j", (...args) => {
    const messages = output();
    expect(run(args, messages)).toBe(2);
    expect(messages.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });
});

describe("design lint actual Node CLI", () => {
  it("runs the real CLI from a different cwd and distinguishes clean from violating fixtures", () => {
    const root = workspace();
    fixture(root, "src/nested/Clean.tsx", 'className="bg-transparent ms-4"');
    const clean = node(root, [script, "--root", root]);
    expect(clean.status).toBe(0);
    expect(clean.text).toContain("Scanned 1 source file(s).");
    expect(clean.text).toContain("ALL CHECKS PASSED");
    fixture(root, "src/nested/Bad.tsx", background());
    const violating = node(root, [script, "--root", root]);
    expect(violating.status).toBe(1);
    expect(violating.text).toContain("src/nested/Bad.tsx:1:");
    expect(violating.text).toContain("1 TOTAL VIOLATION(S) FOUND");
    expect(violating.text).not.toContain("ALL CHECKS PASSED");
  });

  it("returns an error exit for missing source and invalid arguments", () => {
    const root = workspace();
    const missing = node(root, [script, "--root", root]);
    expect(missing.status).toBe(2);
    expect(missing.text).toContain("[ERROR]");
    expect(missing.text).not.toContain("ALL CHECKS PASSED");
    expect(node(root, [script, "--bogus"]).status).toBe(2);
  });

  it("does not execute a scan, log or exit when imported", () => {
    const root = workspace();
    const result = node(root, ["--input-type=module", "--eval", `await import(${JSON.stringify(pathToFileURL(script).href)});`]);
    expect(result).toEqual({ status: 0, text: "" });
  });
});

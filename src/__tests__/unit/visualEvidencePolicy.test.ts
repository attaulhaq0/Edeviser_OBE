// @vitest-environment node
// No Playwright runner, prototype server, screenshot capture or baseline write.
import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  prototypeCandidatePath,
  writePrototypeCandidate,
} from "../../../visual/compare";
import { SCREENS, VIEWPORTS } from "../../../visual/screen-map";

const root = resolve(__dirname, "../../..");
const read = (path: string) =>
  readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
const scratch: string[] = [];
afterEach(() => {
  for (const path of scratch.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe("G02 historical visual evidence must not certify itself", () => {
  it("writes unreviewed candidates exclusively without touching existing references", () => {
    const workspace = mkdtempSync(join(tmpdir(), "edeviser-visual-policy-"));
    scratch.push(workspace);
    const reference = join(
      workspace,
      "visual",
      "references",
      "student-dashboard__mobile.png"
    );
    mkdirSync(dirname(reference), { recursive: true });
    writeFileSync(reference, "historical-bytes", "utf8");
    const candidate = writePrototypeCandidate(
      Buffer.from("fixture-png"),
      "student-dashboard",
      "mobile",
      "run-001",
      workspace
    );
    expect(candidate).toBe(
      prototypeCandidatePath(
        "student-dashboard",
        "mobile",
        "run-001",
        workspace
      )
    );
    expect(candidate).toContain(
      join("test-results", "visual-candidates", "run-001")
    );
    expect(existsSync(candidate)).toBe(true);
    expect(readFileSync(reference, "utf8")).toBe("historical-bytes");
    expect(() =>
      writePrototypeCandidate(
        Buffer.from("changed"),
        "student-dashboard",
        "mobile",
        "run-001",
        workspace
      )
    ).toThrow();
    expect(readFileSync(candidate, "utf8")).toBe("fixture-png");
  });

  it("rejects path traversal before creating even a candidate directory", () => {
    const workspace = mkdtempSync(join(tmpdir(), "edeviser-visual-policy-"));
    scratch.push(workspace);
    expect(() =>
      writePrototypeCandidate(
        Buffer.from("x"),
        "../history",
        "mobile",
        "run-002",
        workspace
      )
    ).toThrow("Invalid prototype candidate path segment");
    expect(() =>
      prototypeCandidatePath(
        "student-dashboard",
        "../desktop",
        "run-002",
        workspace
      )
    ).toThrow("Invalid prototype candidate path segment");
    expect(existsSync(join(workspace, "test-results"))).toBe(false);
  });

  it("requires baseline existence, real role session and exact route before historic comparison", () => {
    const parity = read("visual/parity.spec.ts");
    const missing = parity.indexOf(
      "if (!hasReference(screen.id, viewport.name))"
    );
    const auth = parity.indexOf(
      "await loadStorageState(page.context(), screen.role)"
    );
    const navigate = parity.indexOf("await page.goto(screen.appPath");
    const compare = parity.indexOf("const result = comparePng(");
    expect(missing).toBeGreaterThan(0);
    expect(missing).toBeLessThan(auth);
    expect(auth).toBeLessThan(navigate);
    expect(navigate).toBeLessThan(compare);
    expect(parity).not.toMatch(
      /test\.skip\(\s*!hasReference|storageStateFor\(/
    );
    expect(parity).toContain(
      "No active application comparison rows. A green empty suite is not visual evidence."
    );
    expect(parity).toContain('localStorage.setItem("edeviser-language", "en")');
    expect(parity).toContain('localStorage.setItem("theme", "light")');
    expect(parity).toContain('toHaveAttribute("dir", "ltr")');
    expect(
      parity.match(/new URL\(page\.url\(\)\)\.pathname/g)?.length
    ).toBeGreaterThanOrEqual(2);
  });

  it("retains historical thresholds and never promotes a prototype capture", () => {
    const active = SCREENS.filter((screen) => screen.rebuilt && screen.appPath);
    expect(active).toHaveLength(5);
    expect(active.every((screen) => screen.maxDiffRatio === 0.6)).toBe(true);
    expect(VIEWPORTS).toHaveLength(4);
    const capture = read("visual/prototype-reference.spec.ts");
    expect(capture).toMatch(/writePrototypeCandidate\(\s*screenshot\s*,/);
    expect(capture).not.toContain("referencePath(");
    expect(capture).not.toMatch(/screenshot\(\s*\{\s*path:/);
    expect(capture).toContain("CAPTURED_UNREVIEWED");
    const guidance = read("visual/README.md");
    expect(guidance).toContain("not application visual approval");
    expect(guidance).toContain("60% mismatched pixels");
  });
});

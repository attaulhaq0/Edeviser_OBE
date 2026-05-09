// Unit tests for scripts/audit/icon-label-scan.ts (Task 15.2, Req 11.2).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanIconOnlyButtons } from "../icon-label-scan.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-icon-label-"));
  process.chdir(workspaceDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
  } catch {
    /* noop */
  }
});

const writePage = (relPath: string, content: string) => {
  const full = join(workspaceDir, "src", "pages", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

const writeComponent = (relPath: string, content: string) => {
  const full = join(workspaceDir, "src", "components", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

describe("scanIconOnlyButtons (Task 15.2, Req 11.2)", () => {
  it("returns empty when src/ is missing", () => {
    expect(scanIconOnlyButtons()).toEqual([]);
  });

  it("flags an icon-only Button with no aria-label as Major", () => {
    writePage(
      "admin/demo.tsx",
      `
      export const D = () => (
        <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
      );
    `
    );
    const findings = scanIconOnlyButtons();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.requirementId).toBe("11.2");
    expect(findings[0]?.detail?.tag).toBe("Button");
  });

  it("passes an icon-only Button with aria-label", () => {
    writePage(
      "admin/demo.tsx",
      `
      export const D = () => (
        <Button aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      );
    `
    );
    expect(scanIconOnlyButtons()).toEqual([]);
  });

  it("passes an icon-only Button with aria-labelledby", () => {
    writePage(
      "admin/demo.tsx",
      `
      export const D = () => (
        <Button aria-labelledby="pager-label"><ChevronRight className="h-4 w-4" /></Button>
      );
    `
    );
    expect(scanIconOnlyButtons()).toEqual([]);
  });

  it("passes an icon-only Button with a visually-hidden sr-only child", () => {
    writePage(
      "admin/demo.tsx",
      `
      export const D = () => (
        <Button><ChevronRight className="h-4 w-4" /><span className="sr-only">Next</span></Button>
      );
    `
    );
    // The second span is not an icon, so isIconOnlyBody returns false — no
    // finding. This documents the intended behavior.
    expect(scanIconOnlyButtons()).toEqual([]);
  });

  it("does NOT flag a Button with visible text content", () => {
    writePage(
      "admin/demo.tsx",
      `
      export const D = () => (
        <Button><ChevronRight className="h-4 w-4" />Next</Button>
      );
    `
    );
    expect(scanIconOnlyButtons()).toEqual([]);
  });

  it("excludes src/components/ui/ (vendored Shadcn primitives)", () => {
    writeComponent(
      "ui/button.tsx",
      `
      export const X = () => <button><Icon /></button>;
    `
    );
    expect(scanIconOnlyButtons()).toEqual([]);
  });

  it("flags two-icon-only bodies as well", () => {
    writePage(
      "admin/demo.tsx",
      `
      export const D = () => (
        <Button><PlusIcon className="h-4 w-4" /><ArrowRight className="h-4 w-4" /></Button>
      );
    `
    );
    const findings = scanIconOnlyButtons();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
  });
});

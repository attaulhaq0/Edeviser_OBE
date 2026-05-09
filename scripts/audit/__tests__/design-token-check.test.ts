// Unit tests for scripts/audit/design-token-check.ts
//
// Covers:
//   - scanPhysicalSpacing (Task 10.4 / Req 10.3)
//   - scanFullPageSkeletons (Task 10.5 / Req 9.8)

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  scanFullPageSkeletons,
  scanPhysicalSpacing,
} from "../design-token-check.ts";

let originalCwd: string;
let workspaceDir: string;

const seedWorkspace = () => {
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-design-"));
  mkdirSync(join(workspaceDir, "audit", "baselines"), { recursive: true });
  process.chdir(workspaceDir);
};

beforeEach(() => {
  originalCwd = process.cwd();
  seedWorkspace();
});

afterEach(() => {
  process.chdir(originalCwd);
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

const writeSrcFile = (relPath: string, content: string) => {
  const full = join(workspaceDir, "src", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

const writeAllowlist = (body: unknown) => {
  writeFileSync(
    join(workspaceDir, "audit", "baselines", "i18n-allowlist.json"),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

// ─── Physical margin/padding scanner ──────────────────────────────────────

describe("scanPhysicalSpacing (Task 10.4, Req 10.3)", () => {
  it("returns empty when src/ is missing", () => {
    expect(scanPhysicalSpacing()).toEqual([]);
  });

  it("flags a bare ml-4 without an ms-* counterpart", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <div className="ml-4 text-sm">x</div>;`
    );
    const findings = scanPhysicalSpacing();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.requirementId).toBe("10.3");
    expect(findings[0]?.detail?.family).toBe("ml");
  });

  it("does NOT flag ml-4 when ms-4 is present in the same className", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <div className="ml-4 ms-4">x</div>;`
    );
    expect(scanPhysicalSpacing()).toEqual([]);
  });

  it("honors the allowlist for ml-auto", () => {
    writeAllowlist({
      physicalSpacingExceptions: [{ utility: "ml-auto" }],
    });
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <div className="ml-auto">x</div>;`
    );
    expect(scanPhysicalSpacing()).toEqual([]);
  });

  it("flags all six physical families (ml, mr, pl, pr, left, right)", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <div className="ml-1 mr-2 pl-3 pr-4 left-0 right-0">x</div>;`
    );
    const findings = scanPhysicalSpacing();
    const families = new Set(findings.map((f) => f.detail?.family));
    expect(families).toEqual(
      new Set(["ml", "mr", "pl", "pr", "left", "right"])
    );
  });

  it("detects responsive-prefixed utilities (md:ml-4)", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <div className="md:ml-4">x</div>;`
    );
    const findings = scanPhysicalSpacing();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.utility).toBe("md:ml-4");
  });

  it("scans cn() string-literal arguments as well as className strings", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `import { cn } from '@/lib/utils';\nexport const D = () => <div className={cn('pr-8 text-sm')}>x</div>;`
    );
    const findings = scanPhysicalSpacing();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.family).toBe("pr");
  });

  it("excludes vendored Shadcn primitives in src/components/ui/", () => {
    writeSrcFile(
      "components/ui/select.tsx",
      `export const Item = () => <div className="pr-8 pl-2">x</div>;`
    );
    expect(scanPhysicalSpacing()).toEqual([]);
  });

  it("excludes test files under __tests__", () => {
    writeSrcFile(
      "__tests__/example.test.tsx",
      `export const T = () => <div className="ml-4">x</div>;`
    );
    expect(scanPhysicalSpacing()).toEqual([]);
  });

  it("does not falsely match embedded tokens like .html-ml-4 or custom-ml-4", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <div className="custom-ml-4 data-ml-4">x</div>;`
    );
    // The physical regex has a (?<![\w-]) lookbehind so these are not flagged.
    expect(scanPhysicalSpacing()).toEqual([]);
  });
});

// ─── Full-page skeleton scanner ───────────────────────────────────────────

describe("scanFullPageSkeletons (Task 10.5, Req 9.8)", () => {
  it("returns empty when src/pages/ is missing", () => {
    expect(scanFullPageSkeletons()).toEqual([]);
  });

  it('flags <Skeleton className="h-screen ..."> as a full-page skeleton', () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <Skeleton className="h-screen w-full" />;`
    );
    const findings = scanFullPageSkeletons();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.requirementId).toBe("9.8");
    expect(findings[0]?.detail?.component).toBe("Skeleton");
  });

  it('flags <Shimmer className="min-h-screen">', () => {
    writeSrcFile(
      "pages/loading.tsx",
      `export const L = () => <Shimmer className="min-h-screen rounded-xl" />;`
    );
    const findings = scanFullPageSkeletons();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.component).toBe("Shimmer");
  });

  it("does NOT flag a container div with h-screen (only Skeleton/Shimmer)", () => {
    writeSrcFile(
      "pages/layout.tsx",
      `export const L = () => <div className="flex h-screen">children</div>;`
    );
    expect(scanFullPageSkeletons()).toEqual([]);
  });

  it("does NOT flag a component-level Shimmer (no h-screen in props)", () => {
    writeSrcFile(
      "pages/demo.tsx",
      `export const D = () => <Shimmer className="h-32 rounded-xl" />;`
    );
    expect(scanFullPageSkeletons()).toEqual([]);
  });

  it("handles multi-line JSX attributes", () => {
    writeSrcFile(
      "pages/multi.tsx",
      [
        "export const M = () => (",
        "  <Skeleton",
        '    className="min-h-screen"',
        "    aria-busy",
        "  />",
        ");",
      ].join("\n")
    );
    const findings = scanFullPageSkeletons();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.component).toBe("Skeleton");
  });

  it("does not scan outside src/pages/ for the skeleton rule", () => {
    // Rule scoped to pages/ only — src/components/shared/ is out of scope
    // for the "no full-page skeleton" rule because a shared Shimmer
    // wrapper is expected to be composed with intentional layout.
    writeSrcFile(
      "components/shared/Shimmer.tsx",
      `export const SelfShimmer = () => <Shimmer className="h-screen" />;`
    );
    expect(scanFullPageSkeletons()).toEqual([]);
  });
});

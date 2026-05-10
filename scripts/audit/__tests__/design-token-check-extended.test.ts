// Unit tests for the extended design-token-check.ts rules:
//   - Task 10.1 / Req 9.1: forbidden color families on Card/Tab files
//   - Task 10.2 / Req 9.2: glassmorphism on data cards
//   - Task 10.3 / Req 9.3: max one gradient CTA button per <section>
//   - Task 10.6 / Req 9.7: every <Route> wrapped by ErrorBoundary
//   - Task 10.7 / Req 9.1+9.2: Card/Tab classifier

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  isCardOrTabFile,
  scanForbiddenColorFamilies,
  scanGlassmorphism,
  scanMultipleGradientButtons,
  scanRouteErrorBoundaries,
} from "../design-token-check.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-design-token-ext-"));
  process.chdir(workspaceDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

// ─── Task 10.7: Card/Tab classifier ──────────────────────────────────────

describe("isCardOrTabFile (Task 10.7)", () => {
  it("returns true when file imports Card from ui/card", () => {
    expect(
      isCardOrTabFile(`import { Card } from '@/components/ui/card';`)
    ).toBe(true);
  });

  it("returns true when file imports Tabs from ui/tabs", () => {
    expect(
      isCardOrTabFile(`import { Tabs } from '@/components/ui/tabs';`)
    ).toBe(true);
  });

  it("returns true when file has a CVA call with 'card' in the string", () => {
    expect(
      isCardOrTabFile(`const variants = cva('card-base rounded-xl')`)
    ).toBe(true);
  });

  it("returns false for a plain component with no Card/Tab imports", () => {
    expect(
      isCardOrTabFile(`import { Button } from '@/components/ui/button';`)
    ).toBe(false);
  });
});

// ─── Task 10.1: forbidden color families ─────────────────────────────────

describe("scanForbiddenColorFamilies (Task 10.1, Req 9.1)", () => {
  it("returns empty when src/ does not exist", () => {
    expect(scanForbiddenColorFamilies()).toEqual([]);
  });

  it("flags bg-pink-500 on a Card file", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Dashboard.tsx"),
      `import { Card } from '@/components/ui/card';
const X = () => <Card className="bg-pink-500 p-4">hello</Card>;`
    );
    const findings = scanForbiddenColorFamilies();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.requirementId).toBe("9.1");
    expect(findings[0]?.detail?.family).toBe("pink");
  });

  it("does not flag bg-blue-500 (allowed brand color)", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Dashboard.tsx"),
      `import { Card } from '@/components/ui/card';
const X = () => <Card className="bg-blue-500 p-4">hello</Card>;`
    );
    expect(scanForbiddenColorFamilies()).toEqual([]);
  });

  it("does not flag files that are not Card/Tab files", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Plain.tsx"),
      `import { Button } from '@/components/ui/button';
const X = () => <div className="bg-pink-500">hello</div>;`
    );
    expect(scanForbiddenColorFamilies()).toEqual([]);
  });
});

// ─── Task 10.2: glassmorphism ─────────────────────────────────────────────

describe("scanGlassmorphism (Task 10.2, Req 9.2)", () => {
  it("returns empty when src/ does not exist", () => {
    expect(scanGlassmorphism()).toEqual([]);
  });

  it("flags backdrop-blur on a Card file", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Modal.tsx"),
      `import { Card } from '@/components/ui/card';
const X = () => <Card className="backdrop-blur-md bg-white/80">content</Card>;`
    );
    const findings = scanGlassmorphism();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.requirementId).toBe("9.2");
  });

  it("does not flag solid bg-white (no opacity modifier)", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Card.tsx"),
      `import { Card } from '@/components/ui/card';
const X = () => <Card className="bg-white shadow-md">content</Card>;`
    );
    expect(scanGlassmorphism()).toEqual([]);
  });
});

// ─── Task 10.3: max one gradient CTA per section ─────────────────────────

describe("scanMultipleGradientButtons (Task 10.3, Req 9.3)", () => {
  it("returns empty when src/ does not exist", () => {
    expect(scanMultipleGradientButtons()).toEqual([]);
  });

  it("flags two gradient buttons in the same <section>", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Actions.tsx"),
      `const X = () => (
  <section>
    <Button className="bg-gradient-to-r from-teal-500 to-blue-600">Save</Button>
    <Button className="bg-gradient-to-r from-teal-500 to-blue-600">Submit</Button>
  </section>
);`
    );
    const findings = scanMultipleGradientButtons();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.requirementId).toBe("9.3");
    expect(findings[0]?.detail?.count).toBe(2);
  });

  it("does not flag a single gradient button per section", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "Actions.tsx"),
      `const X = () => (
  <section>
    <Button className="bg-gradient-to-r from-teal-500 to-blue-600">Save</Button>
  </section>
);`
    );
    expect(scanMultipleGradientButtons()).toEqual([]);
  });
});

// ─── Task 10.6: Route wrapped by ErrorBoundary ───────────────────────────

describe("scanRouteErrorBoundaries (Task 10.6, Req 9.7)", () => {
  it("returns empty when src/router/ does not exist", () => {
    expect(scanRouteErrorBoundaries()).toEqual([]);
  });

  it("flags a router file with Routes but no ErrorBoundary import", () => {
    mkdirSync(join(workspaceDir, "src", "router"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "router", "AppRouter.tsx"),
      `import { Route } from 'react-router-dom';
const Router = () => (
  <Routes>
    <Route element={<Dashboard />} path="/dashboard" />
  </Routes>
);`
    );
    const findings = scanRouteErrorBoundaries();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.requirementId).toBe("9.7");
  });

  it("does not flag a router file that imports ErrorBoundary", () => {
    mkdirSync(join(workspaceDir, "src", "router"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "router", "AppRouter.tsx"),
      `import { Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
const Router = () => (
  <Routes>
    <Route element={<ErrorBoundary><Dashboard /></ErrorBoundary>} path="/dashboard" />
  </Routes>
);`
    );
    expect(scanRouteErrorBoundaries()).toEqual([]);
  });

  it("does not flag a router file that imports RouteGuard", () => {
    mkdirSync(join(workspaceDir, "src", "router"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "router", "AppRouter.tsx"),
      `import { Route } from 'react-router-dom';
import { RouteGuard } from '@/router/RouteGuard';
const Router = () => (
  <Routes>
    <Route element={<RouteGuard><Dashboard /></RouteGuard>} path="/dashboard" />
  </Routes>
);`
    );
    expect(scanRouteErrorBoundaries()).toEqual([]);
  });
});

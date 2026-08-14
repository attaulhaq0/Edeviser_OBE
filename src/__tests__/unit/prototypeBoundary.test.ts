import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  evaluatePrototypeDiff,
  scanBuildArtifacts,
  scanProductionReferences,
} from "../../../scripts/check-prototype-boundary.mjs";

const workspaces: string[] = [];

const workspace = (): string => {
  const path = mkdtempSync(join(tmpdir(), "edeviser-prototype-boundary-"));
  workspaces.push(path);
  return path;
};

afterEach(() => {
  for (const path of workspaces.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("Prototype Boundary diff policy", () => {
  it("rejects a modified prototype file", () => {
    expect(evaluatePrototypeDiff("M\tprototype/shared.css\n")).not.toEqual([]);
  });

  it("rejects an added prototype file", () => {
    expect(evaluatePrototypeDiff("A\tprototype/new-page.html\n")).not.toEqual(
      []
    );
  });

  it("rejects a prototype rename into production source", () => {
    expect(
      evaluatePrototypeDiff("R100\tprototype/tutor.html\tsrc/pages/Tutor.tsx\n")
    ).not.toEqual([]);
  });

  it("allows a normal production source change", () => {
    expect(evaluatePrototypeDiff("M\tsrc/pages/LoginPage.tsx\n")).toEqual([]);
  });

  it("allows a prototype deletion when it is isolated", () => {
    expect(evaluatePrototypeDiff("D\tprototype/legacy.html\n")).toEqual([]);
  });
});

describe("Prototype Boundary production imports", () => {
  it("rejects an src import from prototype", () => {
    const root = workspace();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "src", "leak.ts"),
      'import mockData from "../../prototype/demo-data.js";\n'
    );

    expect(scanProductionReferences(root)).toEqual([
      "src/leak.ts:1 references ../../prototype/demo-data.js",
    ]);
  });

  it("allows normal production imports", () => {
    const root = workspace();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "src", "clean.ts"),
      'import value from "@/lib/value";\n'
    );

    expect(scanProductionReferences(root)).toEqual([]);
  });
});

describe("Prototype Boundary build artifacts", () => {
  it("rejects a prototype path in dist", () => {
    const root = workspace();
    mkdirSync(join(root, "dist", "prototype"), { recursive: true });
    writeFileSync(join(root, "dist", "prototype", "roles.html"), "reference");

    expect(scanBuildArtifacts(root, join(root, "dist"))).not.toEqual([]);
  });

  it("rejects a prototype-only marker in dist", () => {
    const root = workspace();
    mkdirSync(join(root, "dist", "assets"), { recursive: true });
    writeFileSync(
      join(root, "dist", "assets", "app.js"),
      "EDEVISER PROTOTYPE — Shared Utilities"
    );

    expect(scanBuildArtifacts(root, join(root, "dist"))).not.toEqual([]);
  });

  it("allows a normal production build", () => {
    const root = workspace();
    mkdirSync(join(root, "dist", "assets"), { recursive: true });
    writeFileSync(
      join(root, "dist", "index.html"),
      '<script src="/assets/app.js"></script>'
    );
    writeFileSync(join(root, "dist", "assets", "app.js"), "console.log('app')");

    expect(scanBuildArtifacts(root, join(root, "dist"))).toEqual([]);
  });
});

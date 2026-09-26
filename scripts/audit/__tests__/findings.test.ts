// @vitest-environment node
// Import before changing cwd: artifact destinations must not capture the repo.
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type FindingsArtifact, writeFindingsArtifact } from "../findings.ts";

// Native ESM namespace bindings cannot be redefined by spyOn. Mock only the
// write export, retaining real filesystem behavior behind the safety guard.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
});
const actualFs = await vi.importActual<typeof import("node:fs")>("node:fs");

let originalCwd: string;
let workspaces: string[];

const artifact = (message: string): FindingsArtifact => ({
  stage: "fixture",
  generatedAt: "2026-01-01T00:00:00.000Z",
  requirementIds: ["11.2"],
  findings: [{ severity: "Major", requirementId: "11.2", message }],
});

beforeEach(() => {
  originalCwd = process.cwd();
  workspaces = [];
  // Even if the import-time-root bug returns, fail before writing into the
  // repository. Calls inside temporary workspaces still perform real I/O.
  vi.mocked(fs.writeFileSync).mockImplementation((file, data, options) => {
    expect(workspaces.some((root) => String(file).startsWith(`${root}${sep}`))).toBe(true);
    actualFs.writeFileSync(file, data, options);
  });
});

afterEach(() => {
  vi.mocked(fs.writeFileSync).mockReset();
  process.chdir(originalCwd);
  for (const workspace of workspaces) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

const createWorkspace = (): string => {
  const workspace = fs.mkdtempSync(join(tmpdir(), "audit-findings-"));
  workspaces.push(workspace);
  return workspace;
};

describe("writeFindingsArtifact", () => {
  it("resolves each write in the current workspace after a single import", () => {
    const first = createWorkspace();
    const second = createWorkspace();
    const firstArtifact = artifact("first workspace");
    const secondArtifact = artifact("second workspace");

    process.chdir(first);
    expect(writeFindingsArtifact("fixture-findings.json", firstArtifact)).toBe(
      "audit/output/fixture-findings.json"
    );
    process.chdir(second);
    expect(writeFindingsArtifact("fixture-findings.json", secondArtifact)).toBe(
      "audit/output/fixture-findings.json"
    );

    expect(JSON.parse(fs.readFileSync(join(first, "audit/output/fixture-findings.json"), "utf8"))).toEqual(firstArtifact);
    expect(JSON.parse(fs.readFileSync(join(second, "audit/output/fixture-findings.json"), "utf8"))).toEqual(secondArtifact);
  });

  it("creates nested output directories and returns a POSIX workspace-relative path", () => {
    const workspace = createWorkspace();
    process.chdir(workspace);
    const expected = artifact("nested finding");

    const result = writeFindingsArtifact(join("nested", "fixture-findings.json"), expected);

    expect(result).toBe("audit/output/nested/fixture-findings.json");
    expect(fs.readFileSync(join(workspace, result), "utf8")).toBe(
      `${JSON.stringify(expected, null, 2)}\n`
    );
  });
});

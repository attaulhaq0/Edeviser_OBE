// Unit tests for scripts/audit/waivers.ts (Task 20.1, Req 16.4).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadWaivers } from "../waivers.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-waivers-"));
  mkdirSync(join(workspaceDir, "audit"), { recursive: true });
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

const writeWaivers = (body: unknown) => {
  writeFileSync(
    join(workspaceDir, "audit", "waivers.json"),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

describe("loadWaivers (Task 20.1, Req 16.4)", () => {
  it("returns empty when audit/waivers.json is missing", () => {
    const result = loadWaivers();
    expect(result.present).toBe(false);
    expect(result.waivers).toEqual([]);
    expect(result.parseError).toBeNull();
  });

  it("loads a valid waiver with three signers", () => {
    writeWaivers({
      waivers: [
        {
          severity: "Critical",
          findingId: "finding-1",
          signers: {
            releaseEngineer: "re@x",
            qaLead: "qa@x",
            techLead: "tech@x",
          },
          expiresAt: "2099-01-01T00:00:00.000Z",
          rationale: "test",
        },
      ],
    });
    const result = loadWaivers();
    expect(result.present).toBe(true);
    expect(result.waivers).toHaveLength(1);
    expect(result.rejectedEntries).toBe(0);
  });

  it("rejects a waiver missing any signer", () => {
    writeWaivers({
      waivers: [
        {
          severity: "Critical",
          findingId: "finding-1",
          signers: { releaseEngineer: "re@x", qaLead: "qa@x" },
          expiresAt: "2099-01-01T00:00:00.000Z",
          rationale: "test",
        },
      ],
    });
    const result = loadWaivers();
    expect(result.waivers).toEqual([]);
    expect(result.rejectedEntries).toBe(1);
  });

  it("rejects non-Critical severities", () => {
    writeWaivers({
      waivers: [
        {
          severity: "Major",
          findingId: "finding-1",
          signers: {
            releaseEngineer: "re@x",
            qaLead: "qa@x",
            techLead: "tech@x",
          },
          expiresAt: "2099-01-01T00:00:00.000Z",
          rationale: "test",
        },
      ],
    });
    expect(loadWaivers().waivers).toEqual([]);
  });

  it("records a parse error when the file is malformed", () => {
    writeFileSync(
      join(workspaceDir, "audit", "waivers.json"),
      "{ not valid json",
      "utf8"
    );
    const result = loadWaivers();
    expect(result.present).toBe(true);
    expect(result.waivers).toEqual([]);
    expect(result.parseError).not.toBeNull();
  });

  it("ignores the file when waivers key is missing or non-array", () => {
    writeWaivers({ something: "else" });
    expect(loadWaivers().waivers).toEqual([]);
  });
});

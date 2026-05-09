// Unit tests for scripts/audit/security-scan.ts
//
// Exercises the two pure scan paths added by Task 13.1 + 13.2:
//   - scanBuiltBundleSecrets      — bundle leak detection (Blocker)
//   - scanViteEnvAllowlist        — VITE_ allowlist enforcement (Blocker)
//
// Uses happy-dom-free vitest + the temp filesystem. Each test wires up a
// synthetic workspace by chdir'ing into a tmpdir so the scanner's hard-coded
// `resolve('dist')` and `resolve('src')` land on fixture files.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  scanBuiltBundleSecrets,
  scanViteEnvAllowlist,
} from "../security-scan.ts";

let originalCwd: string;
let workspaceDir: string;

const seedWorkspace = () => {
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-security-"));
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

const writeBaseline = (
  filename: "secret-patterns.json" | "vite-env.allowlist.json",
  body: unknown
) => {
  writeFileSync(
    join(workspaceDir, "audit", "baselines", filename),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

const writeBundleFile = (relPath: string, content: string) => {
  const full = join(workspaceDir, "dist", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

const writeSrcFile = (relPath: string, content: string) => {
  const full = join(workspaceDir, "src", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

describe("scanBuiltBundleSecrets (Task 13.1, Req 13.1)", () => {
  it("returns bundleExists=false when dist/ is missing", () => {
    const result = scanBuiltBundleSecrets();
    expect(result.bundleExists).toBe(false);
    expect(result.findings).toEqual([]);
  });

  it("flags a SUPABASE_SERVICE_ROLE_KEY leak as Blocker", () => {
    writeBundleFile(
      "assets/index-abc123.js",
      'const x = "SUPABASE_SERVICE_ROLE_KEY"; // leaked'
    );
    const result = scanBuiltBundleSecrets();
    expect(result.bundleExists).toBe(true);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    const hit = result.findings.find(
      (f) => f.detail?.patternName === "supabase-service-role-jwt-literal"
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("Blocker");
    expect(hit?.requirementId).toBe("13.1");
  });

  it("flags a decoded service_role JWT role claim as Blocker", () => {
    writeBundleFile(
      "assets/bundle.js",
      '"iss":"supabase","role":"service_role","exp":1000'
    );
    const result = scanBuiltBundleSecrets();
    expect(
      result.findings.some(
        (f) => f.detail?.patternName === "supabase-service-role-jwt-role-claim"
      )
    ).toBe(true);
  });

  it("flags a Resend-shape key token as Blocker", () => {
    writeBundleFile(
      "assets/bundle.js",
      'const r = "re_abc123XYZ456789abcdefghij";'
    );
    const result = scanBuiltBundleSecrets();
    expect(
      result.findings.some(
        (f) => f.detail?.patternName === "resend-api-key-token"
      )
    ).toBe(true);
  });

  it("applies patterns from the baseline file in addition to built-ins", () => {
    writeBaseline("secret-patterns.json", {
      patterns: [
        {
          name: "custom-project-secret",
          regex: "MY_CUSTOM_PROJECT_SECRET",
          description: "Custom secret banned from client",
        },
      ],
    });
    writeBundleFile(
      "assets/bundle.js",
      'const c = "MY_CUSTOM_PROJECT_SECRET";'
    );
    const result = scanBuiltBundleSecrets();
    expect(
      result.findings.some(
        (f) => f.detail?.patternName === "custom-project-secret"
      )
    ).toBe(true);
  });

  it("returns zero findings when the bundle is clean", () => {
    writeBundleFile(
      "assets/clean-bundle.js",
      'const greeting = "hello world"; export { greeting };'
    );
    const result = scanBuiltBundleSecrets();
    expect(result.bundleExists).toBe(true);
    expect(result.findings).toEqual([]);
  });
});

describe("scanViteEnvAllowlist (Task 13.2, Req 13.2)", () => {
  it("returns a Major finding when the allowlist baseline is missing", () => {
    const findings = scanViteEnvAllowlist();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.requirementId).toBe("13.2");
  });

  it("flags unlisted VITE_ vars as Blocker", () => {
    writeBaseline("vite-env.allowlist.json", {
      allowed: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    });
    writeSrcFile(
      "pages/evil.tsx",
      `export const evil = import.meta.env.VITE_EVIL_SECRET;`
    );
    const findings = scanViteEnvAllowlist();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Blocker");
    expect(findings[0]?.detail?.viteVarName).toBe("VITE_EVIL_SECRET");
  });

  it("does not flag vars that are in the allowlist", () => {
    writeBaseline("vite-env.allowlist.json", {
      allowed: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    });
    writeSrcFile(
      "lib/supabase.ts",
      `export const url = import.meta.env.VITE_SUPABASE_URL;\nexport const key = import.meta.env.VITE_SUPABASE_ANON_KEY;`
    );
    expect(scanViteEnvAllowlist()).toEqual([]);
  });

  it("ignores test files inside src/__tests__", () => {
    writeBaseline("vite-env.allowlist.json", { allowed: [] });
    writeSrcFile(
      "__tests__/example.test.ts",
      `const v = process.env.VITE_TEST_ONLY_VAR;`
    );
    expect(scanViteEnvAllowlist()).toEqual([]);
  });

  it("detects process.env.VITE_* references the same as import.meta.env", () => {
    writeBaseline("vite-env.allowlist.json", {
      allowed: ["VITE_SUPABASE_URL"],
    });
    writeSrcFile(
      "lib/server-side-escape.ts",
      `const x = process.env.VITE_SHOULD_NOT_BE_HERE;`
    );
    const findings = scanViteEnvAllowlist();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.viteVarName).toBe("VITE_SHOULD_NOT_BE_HERE");
  });
});

// Unit tests for scripts/audit/i18n-check.ts
//
// Covers:
//   - scanLocaleKeyParity (Task 11.1 / Req 10.1)
//
// Fixture strategy mirrors the security + design-token scanners: chdir into
// a tmpdir, plant a synthetic src/locales/ tree, call the pure function.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanLocaleKeyParity } from "../i18n-check.ts";

let originalCwd: string;
let workspaceDir: string;

const seedWorkspace = () => {
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-i18n-"));
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

const writeLocale = (locale: "en" | "ar", namespace: string, body: unknown) => {
  const dir = join(workspaceDir, "src", "locales", locale);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${namespace}.json`),
    typeof body === "string" ? body : JSON.stringify(body, null, 2),
    "utf8"
  );
};

describe("scanLocaleKeyParity (Task 11.1, Req 10.1)", () => {
  it("returns a Major finding when src/locales/ is missing", () => {
    const findings = scanLocaleKeyParity();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.requirementId).toBe("10.1");
  });

  it("returns no findings when en and ar keys match exactly", () => {
    writeLocale("en", "auth", {
      login: { title: "Sign In", button: "Submit" },
      logout: { button: "Sign Out" },
    });
    writeLocale("ar", "auth", {
      login: { title: "تسجيل الدخول", button: "إرسال" },
      logout: { button: "تسجيل الخروج" },
    });
    expect(scanLocaleKeyParity()).toEqual([]);
  });

  it("flags a key present only in en", () => {
    writeLocale("en", "auth", {
      login: { title: "Sign In", extraEnKey: "Only in en" },
    });
    writeLocale("ar", "auth", {
      login: { title: "تسجيل الدخول" },
    });
    const findings = scanLocaleKeyParity();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.detail?.rule).toBe("key-missing-from-ar");
    expect(findings[0]?.detail?.key).toBe("login.extraEnKey");
  });

  it("flags a key present only in ar", () => {
    writeLocale("en", "auth", { login: { title: "Sign In" } });
    writeLocale("ar", "auth", {
      login: { title: "تسجيل الدخول", extraArKey: "Only in ar" },
    });
    const findings = scanLocaleKeyParity();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.rule).toBe("key-missing-from-en");
    expect(findings[0]?.detail?.key).toBe("login.extraArKey");
  });

  it("flags an entire namespace missing from ar/", () => {
    writeLocale("en", "auth", { login: { title: "Sign In" } });
    writeLocale("en", "admin", { dashboard: { title: "Dashboard" } });
    writeLocale("ar", "auth", { login: { title: "تسجيل الدخول" } });
    // ar/admin.json is intentionally missing

    const findings = scanLocaleKeyParity();
    // One namespace-missing finding, no per-key findings for admin.
    const namespaceFinding = findings.find(
      (f) => f.detail?.rule === "missing-namespace"
    );
    expect(namespaceFinding).toBeDefined();
    expect(namespaceFinding?.detail?.namespace).toBe("admin");
    expect(namespaceFinding?.detail?.missingFrom).toBe("ar");
  });

  it("flags an entire namespace missing from en/", () => {
    writeLocale("en", "auth", { login: { title: "Sign In" } });
    writeLocale("ar", "auth", { login: { title: "تسجيل الدخول" } });
    writeLocale("ar", "gamification", { xp: { label: "نقاط الخبرة" } });

    const findings = scanLocaleKeyParity();
    const namespaceFinding = findings.find(
      (f) => f.detail?.rule === "missing-namespace"
    );
    expect(namespaceFinding?.detail?.namespace).toBe("gamification");
    expect(namespaceFinding?.detail?.missingFrom).toBe("en");
  });

  it("reports a parse error when a locale JSON file is malformed", () => {
    writeLocale("en", "auth", { login: { title: "Sign In" } });
    writeLocale("ar", "auth", '{ "login": { "title": "unclosed');

    const findings = scanLocaleKeyParity();
    const parseFinding = findings.find(
      (f) => f.detail?.rule === "locale-file-parse-error"
    );
    expect(parseFinding).toBeDefined();
    expect(parseFinding?.severity).toBe("Major");
    expect(parseFinding?.detail?.namespace).toBe("auth");
  });

  it("handles deeply nested keys correctly", () => {
    writeLocale("en", "admin", {
      users: {
        table: { header: { name: "Name", email: "Email" } },
      },
    });
    writeLocale("ar", "admin", {
      users: {
        table: { header: { name: "الاسم" } },
      },
    });
    const findings = scanLocaleKeyParity();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.key).toBe("users.table.header.email");
  });

  it("accepts matching empty-object terminal keys", () => {
    writeLocale("en", "common", { placeholders: {} });
    writeLocale("ar", "common", { placeholders: {} });
    expect(scanLocaleKeyParity()).toEqual([]);
  });
});

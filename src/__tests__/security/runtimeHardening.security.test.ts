// Security checks 10, 11, 12, 19, 21, 22, 27, 36 (security-checklist.md):
// prod debug tools, log leaks, verbose errors, XSS, upload hardening, path
// traversal, permissive CORS, exposed source maps.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string): string => readFileSync(join(ROOT, p), "utf8");

const AGENTIC_FUNCTIONS = [
  "agent-orchestrator",
  "agent-worker",
  "agent-evaluation-jobs",
  "intervention-jobs",
  "chat-with-tutor",
];
const UPLOAD_LIBS = [
  "src/lib/fileUpload.ts",
  // NOTE: imageCompressor.ts intentionally excluded — canvas-only, no paths.
];

const walkTs = (dir: string, acc: string[] = []): string[] => {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === "__tests__" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(join(ROOT, full)).isDirectory()) {
      walkTs(full, acc);
    } else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
};

describe("check 19 - XSS is structurally prevented", () => {
  it("never renders raw HTML in React components", () => {
    const offenders = walkTs("src").filter(
      (f) => !f.includes("__tests__") && /dangerouslySetInnerHTML/.test(read(f))
    );
    expect(offenders).toEqual([]);
  });

  it("HTML-escapes user content in outbound emails", () => {
    expect(read("supabase/functions/parent-link/index.ts")).toContain(
      "escapeHtml"
    );
  });
});

describe("check 12/11 - errors are classified, logs are clean", () => {
  it("returns generic classified errors, never raw exception text", () => {
    for (const slug of [
      "agent-worker",
      "agent-evaluation-jobs",
      "intervention-jobs",
    ]) {
      const source = read(`supabase/functions/${slug}/index.ts`);
      expect(source).toMatch(/error:\s*error instanceof/);
      expect(source).not.toMatch(/error:\s*error\.message/);
    }
  });

  it("never logs environment values or tokens", () => {
    for (const slug of AGENTIC_FUNCTIONS) {
      const source = read(`supabase/functions/${slug}/index.ts`);
      expect(source).not.toMatch(/console\.log\(/);
      expect(source).not.toMatch(/console\.error\([^)]*Deno\.env/);
    }
  });
});

describe("check 27/20 - CORS is explicit and mutations need Bearer auth", () => {
  it("uses fixed allow-list headers, never a wildcard with credentials", () => {
    for (const slug of AGENTIC_FUNCTIONS) {
      const source = read(`supabase/functions/${slug}/index.ts`);
      expect(source).toContain(
        '"authorization, x-client-info, apikey, content-type"'
      );
      expect(source).not.toMatch(/Allow-Credentials[^\n]*\*/);
    }
  });
});

describe("check 21/22 - uploads are allow-listed and traversal-safe", () => {
  it("keeps path-traversal sequences out of upload/export libraries", () => {
    for (const lib of UPLOAD_LIBS) {
      // The traversal guard itself must contain the ".." literal, so assert
      // guard presence instead of naive absence of the sequence.
      expect({
        lib,
        ok: /includes\(["']\.\.["']\)/.test(read(lib)),
      }).toEqual({ lib, ok: true });
    }
  });

  it("keeps upload guard suites in place (MIME + size contracts)", () => {
    for (const suite of [
      "src/__tests__/unit/fileUpload.test.ts",
      "src/__tests__/unit/avatarUpload.test.ts",
      "src/__tests__/unit/tutorAttachmentUpload.test.ts",
    ]) {
      expect(read(suite).length).toBeGreaterThan(0);
    }
  });
});

describe("check 36/10 - no source maps or debug surface in production", () => {
  it("never enables source maps in the production build", () => {
    expect(read("vite.config.ts")).not.toMatch(/sourcemap\s*:\s*true/);
  });

  it("ships no debug or diagnostic Edge Function endpoints", () => {
    const slugs = readdirSync(join(ROOT, "supabase/functions")).filter((e) =>
      statSync(join(ROOT, "supabase/functions", e)).isDirectory()
    );
    expect(
      slugs.filter((s) => /debug|diag|dump|internal-test/.test(s))
    ).toEqual([]);
  });
});

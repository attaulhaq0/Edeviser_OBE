// Security checks 1, 2, 3, 13, 14 (security-checklist.md):
// exposed DB credentials, public .env files, hardcoded secrets, secrets in
// git, secrets in the client JS bundle. Static hygiene proofs over every
// tracked source tree - failures here mean credentials could leak to anyone
// who receives the bundle or the repository.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const full = join(dir, entry);
    if (statSync(join(ROOT, full)).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx|js|jsx|json|sql|sh|md|toml)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
};

const SECRET_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ["OpenAI-style key", /sk-[A-Za-z0-9]{20,}/],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_]+/],
  ["DeepSeek key literal", /["'`]gsk-[A-Za-z0-9]{16,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["PEM private key", /BEGIN (RSA |EC )?PRIVATE KEY/],
  ["Bearer literal secret", /Bearer\s+["'`][A-Za-z0-9_-]{32,}["'`]/],
];

describe("check 1/3/13 - no hardcoded secrets in any tracked source", () => {
  const trees = [
    ...walk("src"),
    ...walk("supabase/functions"),
    ...walk("scripts"),
  ].filter((f) => !f.includes("__tests__") && !f.includes(".test."));

  it("scans a meaningful number of files (guard against silent no-op)", () => {
    expect(trees.length).toBeGreaterThan(200);
  });

  it("contains no secret-shaped literals", () => {
    const offenders: string[] = [];
    for (const file of trees) {
      const content = readFileSync(join(ROOT, file), "utf8");
      for (const [name, pattern] of SECRET_PATTERNS) {
        if (pattern.test(content)) offenders.push(`${file}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never embeds a service-role or DB password reference in client code", () => {
    for (const file of walk("src")) {
      const content = readFileSync(join(ROOT, file), "utf8");
      // Test infrastructure legitimately names secret env variables in
      // contracts; only shipped client code is scanned here.
      if (!file.includes("__tests__")) {
        expect(content).not.toMatch(
          /SERVICE_ROLE|service_role_key|DB_PASSWORD/
        );
      }
    }
  });
});

describe("check 2 - .env files are never public", () => {
  it("gitignore covers every env variant while keeping the placeholder example", () => {
    const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.env\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });

  it(".env.example documents placeholders, never real credentials", () => {
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    for (const [name, pattern] of SECRET_PATTERNS) {
      expect({
        file: ".env.example",
        pattern: name,
        hit: pattern.test(example),
      }).toEqual({
        file: ".env.example",
        pattern: name,
        hit: false,
      });
    }
  });
});

describe("check 14 - client JS exposes only public-by-design env keys", () => {
  it("restricts import.meta.env access to VITE_-prefixed keys", () => {
    const offenders: string[] = [];
    const accessPattern = /import\.meta\.env\.([A-Za-z0-9_]+)/g;
    for (const file of walk("src")) {
      const content = readFileSync(join(ROOT, file), "utf8");
      for (const match of content.matchAll(accessPattern)) {
        const key = match[1];
        const SAFE_BUILTINS = ["DEV", "PROD", "MODE", "BASE_URL"];
        if (key && !key.startsWith("VITE_") && !SAFE_BUILTINS.includes(key)) {
          offenders.push(`${relative(ROOT, join(ROOT, file))}: ${key}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

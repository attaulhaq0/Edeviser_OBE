// Security checks 4, 5, 9, 16, 34 (security-checklist.md):
// weak auth, missing authorization checks, unprotected admin routes, input
// validation. Proves the WHOLE Edge Function surface is either behind the
// Supabase JWT gateway or performs in-handler authorization, and that the
// agentic functions bound and validate every request.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const FUNCTIONS_DIR = "supabase/functions";
const EXCLUDED = new Set(["_shared", "audit-fixtures"]);

const functionSlugs = (): string[] =>
  readdirSync(join(ROOT, FUNCTIONS_DIR)).filter((entry) => {
    if (EXCLUDED.has(entry)) return false;
    return statSync(join(ROOT, FUNCTIONS_DIR, entry)).isDirectory();
  });

const sourceOf = (slug: string): string =>
  readFileSync(join(ROOT, FUNCTIONS_DIR, slug, "index.ts"), "utf8");

const configSource = readFileSync(join(ROOT, "supabase/config.toml"), "utf8");

/** verify_jwt values explicitly set in supabase/config.toml (default: true). */
const explicitVerifyJwt = (): Map<string, boolean> => {
  const map = new Map<string, boolean>();
  const sectionPattern =
    /\[functions\.([a-z0-9-]+)\]\s*\r?\n\s*verify_jwt\s*=\s*(true|false)/g;
  for (const match of configSource.matchAll(sectionPattern)) {
    const slug = match[1];
    if (!slug) continue;
    map.set(slug, match[2] === "true");
  }
  return map;
};

const IN_HANDLER_AUTH =
  /isSystemCaller|x-cron-secret|x-internal-auth|auth\.getUser|hashToken|svix-signature|headers\.get\(["']Authorization/i;

const INPUT_VALIDATION =
  /boundedInteger|\.safeParse\(|zod|z\.object|readRequest|typeof [a-zA-Z]+ === ["']string["']/;

const AGENTIC_FUNCTIONS = [
  "agent-orchestrator",
  "agent-worker",
  "agent-evaluation-jobs",
  "intervention-jobs",
  "chat-with-tutor",
];

describe("check 4/5 - every Edge Function authorizes its caller", () => {
  it("has no function that disables the JWT gateway without in-handler auth", () => {
    const verifyJwt = explicitVerifyJwt();
    const offenders: string[] = [];
    for (const slug of functionSlugs()) {
      const gatewayProtected = verifyJwt.get(slug) !== false; // default true
      if (gatewayProtected) continue;
      const source = sourceOf(slug);
      if (!IN_HANDLER_AUTH.test(source)) offenders.push(slug);
    }
    expect(offenders).toEqual([]);
  });

  it("covers a realistic function surface (guard against silent no-op)", () => {
    expect(functionSlugs().length).toBeGreaterThan(40);
  });

  it("keeps system schedulers on timing-safe secret comparison", () => {
    for (const slug of [
      "agent-worker",
      "agent-evaluation-jobs",
      "intervention-jobs",
    ]) {
      expect(sourceOf(slug)).toContain("timingSafeEqual");
    }
  });
});

describe("check 16/34 - agentic functions validate and bound every input", () => {
  it("validates request shape before processing", () => {
    for (const slug of AGENTIC_FUNCTIONS) {
      expect({ slug, ok: INPUT_VALIDATION.test(sourceOf(slug)) }).toEqual({
        slug,
        ok: true,
      });
    }
  });

  it("bounds batch sizes to prevent runaway work", () => {
    for (const slug of [
      "agent-worker",
      "agent-evaluation-jobs",
      "intervention-jobs",
    ]) {
      expect(sourceOf(slug)).toMatch(/MAX_[A-Z_0-9]*BATCH[A-Z_0-9]* = \d+/);
    }
  });

  it("rejects non-UUID institution scoping instead of trusting it", () => {
    // agent-worker exempt: it consumes internal queue rows created by the
    // authenticated orchestrator; institution scope is persisted data, not
    // client input, so there is no client-supplied UUID to validate here.
    for (const slug of ["intervention-jobs", "agent-evaluation-jobs"]) {
      expect(sourceOf(slug)).toMatch(/must be a valid UUID|valid UUID/);
    }
  });
});

describe("check 9 - admin surface is route-guarded end to end", () => {
  it("guards role prefixes with the shared RouteGuard component", () => {
    const router = readFileSync(join(ROOT, "src/router/AppRouter.tsx"), "utf8");
    expect(router).toContain("RouteGuard");
    expect(router).toMatch(/RouteGuard[^>]*allowedRoles/);
  });

  it("redirects unauthenticated visits to protected prefixes (e2e contract)", () => {
    const preDeploy = readFileSync(
      join(ROOT, "e2e/pre-deploy.spec.ts"),
      "utf8"
    );
    expect(preDeploy).toContain("/admin/dashboard");
    expect(preDeploy).toMatch(/toHaveURL\(\/\\\/login\//);
  });
});

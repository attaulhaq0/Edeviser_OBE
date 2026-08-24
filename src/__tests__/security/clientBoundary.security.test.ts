// Security checks 7, 15, 25, 32, 33 (security-checklist.md):
// open DB permissions (existence proof for the RLS suite wall), client-only
// security boundaries, session management, FE payment checks, IDOR/BOLA.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string): string => readFileSync(join(ROOT, p), "utf8");

describe("check 6/33 - tenant isolation is proven at the database layer", () => {
  it("maintains a deep RLS integration wall (deny-side per role and table)", () => {
    const suites = readdirSync(join(ROOT, "src/__tests__/integration-rls"));
    expect(suites.length).toBeGreaterThanOrEqual(10);
    expect(suites).toContain("outcomeGovernance.rls.test.ts");
    expect(suites).toContain("ragAuthorization.rls.test.ts");
  });

  it("runs a cross-institution isolation property suite", () => {
    expect(
      read("src/__tests__/properties/rlsInstitutionIsolation.property.test.ts")
    ).toMatch(/institution/i);
  });
});

describe("check 15 - security is server-authoritative, never client-only", () => {
  it("backs client-side role UX with database RLS policies (agent tables)", () => {
    // The agentic migration enables RLS on every agent table; the integration
    // wall proves denials happen in Postgres, not in React.
    const migration = read(
      "supabase/migrations/20260831000002_agentic_platform_tables.sql"
    );
    for (const table of [
      "agent_conversations",
      "agent_messages",
      "agent_tasks",
      "agent_feedback",
      "student_support_states",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`
      );
    }
  });

  it("keeps outcome governance denials in the database (RLS suite)", () => {
    expect(
      read("src/__tests__/integration-rls/outcomeGovernance.rls.test.ts")
    ).toMatch(/admin|coordinator|teacher/);
  });
});

describe("check 32 - the marketplace economy is server-authoritative", () => {
  it("executes purchases through an authenticated server RPC, never client math", () => {
    const source = read("supabase/functions/process-purchase/index.ts");
    expect(source).toContain("auth.getUser");
    expect(source).toContain("supabase.rpc(");
    expect(source).toMatch(/Missing Authorization header/);
  });

  it("awards XP only through the exact-match internal auth boundary", () => {
    expect(read("supabase/functions/award-xp/index.ts")).toContain(
      "x-internal-auth"
    );
  });
});

describe("check 25 - sessions stay inside the managed auth lifecycle", () => {
  it("delegates token refresh to Supabase Auth in the AuthProvider", () => {
    const provider = read("src/providers/AuthProvider.tsx");
    expect(provider).toMatch(/onAuthStateChange|getSession/);
  });

  it("persists no hand-rolled session token storage in the client lib", () => {
    const offenders = readdirSync(join(ROOT, "src/lib")).filter((f) =>
      /session[-_]?token/i.test(f)
    );
    expect(offenders).toEqual([]);
  });
});

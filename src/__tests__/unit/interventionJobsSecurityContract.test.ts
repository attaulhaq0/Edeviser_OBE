// Feature: Intervention loop jobs (tasks.md 4.7 + 8.2). Contract properties:
// system-caller-only auth, bounded batches, deterministic official metrics
// (no LLM in the loop), SKIP LOCKED claims with bounded attempts and
// dead-lettering, weekly idempotent generation, and no duplicate cron names.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const functionSource = source("supabase/functions/intervention-jobs/index.ts");
const migrationSource = source(
  "supabase/migrations/20260901000001_create_intervention_loop_jobs.sql"
);
const manifest: {
  runtimeGroups: Array<{
    name: string;
    functions: Array<{ slug: string; verifyJwt: boolean }>;
  }>;
} = JSON.parse(source("scripts/runtime-dependency-manifest.json"));

describe("intervention-jobs function contract", () => {
  it("rejects callers without the managed server key or cron secret", () => {
    expect(functionSource).toContain("isSystemCaller");
    expect(functionSource).toContain("getManagedServerKey");
    expect(functionSource).toContain("timingSafeEqual");
    expect(functionSource).toContain(
      'return json(401, { error: "Unauthorized" })'
    );
    // Auth gate runs before any processing.
    const authIndex = functionSource.indexOf("if (!isSystemCaller(req))");
    const serveIndex = functionSource.indexOf("serve(async (req: Request)");
    expect(authIndex).toBeGreaterThan(serveIndex);
    expect(functionSource.slice(serveIndex, authIndex)).not.toContain(
      "admin.rpc"
    );
  });

  it("bounds every batch and never invokes an LLM provider", () => {
    expect(functionSource).toContain("const MAX_BATCH_SIZE = 100");
    expect(functionSource).toContain("boundedInteger");
    for (const forbidden of [
      "provider-factory",
      "deepseek",
      "createAIProvider",
      "chat/completions",
    ]) {
      expect(functionSource).not.toContain(forbidden);
    }
  });

  it("derives the post metric deterministically from the learning state", () => {
    expect(functionSource).toContain("derivePostActionMetric");
    expect(functionSource).toContain('source: "student_learning_state"');
    expect(functionSource).toContain("complete_intervention_evaluation_v1");
    expect(functionSource).toContain("fail_intervention_evaluation_v1");
    expect(functionSource).toContain("INSUFFICIENT_EVIDENCE");
    expect(functionSource).not.toMatch(/Math\.random|Date\.now\(\) %/);
  });
});

describe("intervention loop migration contract", () => {
  it("claims due measurements with SKIP LOCKED, bounded attempts, dead-letter", () => {
    expect(migrationSource).toContain("FOR UPDATE SKIP LOCKED");
    expect(migrationSource).toContain("evaluation_attempt_count < 3");
    expect(migrationSource).toContain("evaluation_dead_lettered_at IS NULL");
    expect(migrationSource).toContain("evaluation_lease_until");
  });

  it("keeps official metrics inside measure_intervention_v1 only", () => {
    expect(migrationSource).toContain(
      "v_row := public.measure_intervention_v1("
    );
    expect(migrationSource).toContain("SECURITY DEFINER");
    expect(
      migrationSource.match(/SET search_path = ''/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(4);
  });

  it("generates weekly-idempotent teacher-routed intervention jobs", () => {
    expect(migrationSource).toContain(
      "ON CONFLICT (institution_id, idempotency_key) DO NOTHING"
    );
    expect(migrationSource).toContain("'intervention:v1:'");
    expect(migrationSource).toContain("date_trunc('week', now())");
    expect(migrationSource).toContain("'intervention'");
    expect(migrationSource).toContain("'teacher'");
    // Institution autonomy guard: A0 institutions never generate candidates.
    expect(migrationSource).toContain("<> 'A0'");
    // 7-day suppression window prevents repeat nudges for the same outcome.
    expect(migrationSource).toContain("interval '7 days'");
  });

  it("restricts every loop RPC to the service role", () => {
    const rpcs = [
      "enqueue_intervention_generation_jobs_v1",
      "claim_due_intervention_measurements_v1",
      "complete_intervention_evaluation_v1",
      "fail_intervention_evaluation_v1",
    ];
    for (const rpc of rpcs) {
      expect(migrationSource).toContain(
        `GRANT EXECUTE ON FUNCTION public.${rpc}`
      );
    }
    expect(
      migrationSource.match(/FROM PUBLIC, anon, authenticated;/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(4);
  });

  it("registers both cron families without duplicate job names", () => {
    expect(migrationSource).toContain("'intervention-evaluation-jobs'");
    expect(migrationSource).toContain("'intervention-generation-jobs'");
    expect(migrationSource).toContain("cron.unschedule");
    expect(migrationSource.match(/cron\.schedule/g)?.length ?? 0).toBe(2);
  });
});

describe("intervention-jobs runtime governance", () => {
  it("is registered in the tutor-intelligence deployment group without JWT gateway", () => {
    const group = manifest.runtimeGroups.find(
      (g) => g.name === "tutor-intelligence"
    );
    const entry = group?.functions.find((f) => f.slug === "intervention-jobs");
    expect(entry).toBeDefined();
    expect(entry?.verifyJwt).toBe(false);
  });

  it("is declared in the batch deploy script and supabase config", () => {
    expect(source("scripts/deploy-edge-functions.sh")).toContain(
      "# supabase functions deploy intervention-jobs"
    );
    const config = source("supabase/config.toml");
    expect(config).toContain("[functions.intervention-jobs]");
    expect(config).toMatch(
      /\[functions\.intervention-jobs\]\s*\r?\nverify_jwt = false/
    );
  });
});

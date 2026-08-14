import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const worker = readFileSync(
  resolve(process.cwd(), "supabase/functions/agent-worker/index.ts"),
  "utf8"
);

const grantsMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260826000001_restrict_internal_rls_helper_execute.sql"
  ),
  "utf8"
);

const proactiveMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260829000001_create_proactive_agent_queue.sql"
  ),
  "utf8"
);

describe("agent-worker security contract", () => {
  it("keeps scheduled scans fail-closed to server or cron credentials", () => {
    expect(worker).toMatch(
      /authHeader\.replace\("Bearer ", ""\) === serverKey/
    );
    expect(worker).toMatch(
      /req\.headers\.get\("x-cron-secret"\) === cronSecret/
    );
    expect(worker).toMatch(
      /if \(!isSystemCaller\(req\)\) \{\s*return json\(401, \{ error: "Unauthorized" \}\);/
    );
  });

  it("does not let CORS preflight authorize a worker operation", () => {
    expect(worker).toMatch(
      /if \(req\.method === "OPTIONS"\) \{\s*return new Response\("ok", \{ headers: corsHeaders \}\);/
    );
    expect(worker).toMatch(/if \(req\.method !== "POST"\)/);
    expect(worker).toMatch(/return json\(405/);
  });

  it("uses the shared orchestrator and canonical proposal boundary", () => {
    expect(worker).toContain("runAgentOrchestrator");
    expect(worker).toContain("agent_action_proposals");
    expect(worker).not.toContain("approve_protected_action");
    expect(worker).not.toContain("ai_feedback");
  });

  it("rejects retired or unknown actions instead of treating them as scans", () => {
    expect(worker).toContain('body.action !== "scheduled_scan"');
    expect(worker).toContain('body.action !== "evidence_event"');
    expect(worker).toContain("Unsupported worker action");
    expect(worker).not.toContain("approve_protected_action");
  });

  it("claims a bounded durable queue with retries and dead letters", () => {
    expect(worker).toContain("claim_proactive_agent_jobs_v1");
    expect(worker).toContain("complete_proactive_agent_job_v1");
    expect(worker).toContain("fail_proactive_agent_job_v1");
    expect(proactiveMigration).toContain("FOR UPDATE SKIP LOCKED");
    expect(proactiveMigration).toContain("'dead_letter'");
    expect(proactiveMigration).toContain("lease_expired_after_max_attempts");
    expect(proactiveMigration).toContain(
      "job.attempt_count < job.max_attempts"
    );
    expect(proactiveMigration).toContain(
      "UNIQUE (institution_id, idempotency_key)"
    );
  });

  it("defaults proactive and auto-action features to disabled", () => {
    expect(worker).toMatch(/!config\.enabled \|\| !config\.proactiveEnabled/);
    expect(worker).toMatch(/disabled: true,[\s\S]*reason: "feature_flag"/);
  });

  it("routes only canonical deterministic Learning State risk signals", () => {
    expect(proactiveMigration).toContain("student_learning_states");
    expect(proactiveMigration).toContain("risk.item->>'kind' = 'low_mastery'");
    expect(proactiveMigration).not.toContain("ai_feedback");
    expect(proactiveMigration).not.toContain("student_gamification");
    expect(proactiveMigration).toContain("<> 'A0'");
  });
});

describe("internal RLS helper grant contract", () => {
  it("removes anonymous execution without removing authenticated RLS evaluation", () => {
    for (const fn of [
      "auth_institution_id()",
      "auth_user_role()",
      "auth_user_status()",
      "is_student_in_my_institution(uuid)",
      "student_enrolled_in_team_course(uuid)",
      "team_i_captain(uuid)",
      "team_i_captain_student_formed_active(uuid)",
      "team_in_course_i_teach(uuid)",
      "team_in_course_i_teach_active(uuid)",
      "team_in_my_institution(uuid)",
      "get_coordinator_accreditation_readiness()",
      "get_teacher_dashboard(uuid)",
    ]) {
      expect(grantsMigration).toContain(
        `REVOKE EXECUTE ON FUNCTION public.${fn} FROM PUBLIC, anon;`
      );
      expect(grantsMigration).toContain(
        `GRANT EXECUTE ON FUNCTION public.${fn} TO authenticated, service_role;`
      );
    }
  });

  it("keeps server-side team XP mutation restricted to service role", () => {
    expect(grantsMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) FROM PUBLIC, anon, authenticated;"
    );
    expect(grantsMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) TO service_role;"
    );
  });
});

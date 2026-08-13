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

describe("agent-worker security contract", () => {
  it("keeps scheduled scans fail-closed to server or cron credentials", () => {
    expect(worker).toMatch(
      /authHeader\.replace\("Bearer ", ""\) === serverKey/
    );
    expect(worker).toMatch(
      /req\.headers\.get\("x-cron-secret"\) === cronSecret/
    );
    expect(worker).toMatch(
      /if \(!isSystemCaller\(req\)\) return response\(401, \{ error: "Unauthorized" \}\);/
    );
  });

  it("does not let CORS preflight authorize a worker operation", () => {
    expect(worker).toMatch(
      /if \(req\.method === "OPTIONS"\)\s+return new Response\("ok", \{ headers: corsHeaders \}\);/
    );
    expect(worker).toMatch(
      /if \(req\.method !== "POST"\) return \{ action: "scheduled_scan" \};/
    );
  });

  it("requires a verified user JWT and teacher identity for protected approvals", () => {
    expect(worker).toMatch(/supabase\.auth\.getUser\(\s*token\s*\)/);
    expect(worker).toMatch(
      /if \(userError \|\| !userData\.user\)\s+return response\(401/
    );
    expect(worker).toMatch(/actorData\?\.role !== "teacher"/);
    expect(worker).toMatch(/Teacher approval is required/);
  });

  it("revalidates proposal ownership, tenancy, course ownership, evidence and idempotency", () => {
    expect(worker).toMatch(/proposal\.actor_id !== actorData\.id/);
    expect(worker).toMatch(
      /proposal\.institution_id !== actorData\.institution_id/
    );
    expect(worker).toMatch(/courseData\?\.teacher_id !== actorData\.id/);
    expect(worker).toMatch(/Evidence is no longer available/);
    expect(worker).toMatch(/Proposal was already executed/);
    expect(worker).toMatch(/Proposal is already being processed/);
  });

  it("defaults proactive and auto-action features to disabled", () => {
    expect(worker).toMatch(/AI_PROACTIVE_AGENTS_ENABLED"\) !== "true"/);
    expect(worker).toMatch(/AI_AUTO_LOW_RISK_ENABLED"\) === "true"/);
    expect(worker).toMatch(
      /return \{ success: true, disabled: true, reason: "feature_flag" \}/
    );
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

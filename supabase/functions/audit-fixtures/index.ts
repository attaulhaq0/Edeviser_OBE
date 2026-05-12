// supabase/functions/audit-fixtures/index.ts
//
// Pre-deployment E2E audit fixture endpoint. Four routes:
//
//   POST /seed                 — provision seed users, linked/unlinked parents,
//                                 ILO→PLO→CLO chain, prerequisite-gated assignment
//   POST /teardown             — truncate rows inside the per-run audit namespace
//   POST /impersonate          — mint short-lived JWT for a seed role (tests)
//   POST /event/bonus-xp       — create a time-bounded Bonus XP event for Req 3.4
//
// Critical safety contract (Task 2.2 + design.md §Fixture Endpoint gating):
//   - ENV_ID MUST equal "audit-staging". Any other value returns 403.
//   - ENV_ID == "production" is hard-blocked at the top of every handler.
//   - Every request body is Zod-validated before any side effect (Task 2.3,
//     Req 13.4).
//
// See:
//   - .kiro/specs/pre-deployment-e2e-audit/design.md §Fixture Endpoint
//   - .kiro/specs/pre-deployment-e2e-audit/tasks.md §2
//   - .kiro/steering/supabase-patterns.md (Standard Edge Function Structure)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import {
  BonusXpEventRequestSchema,
  ImpersonateRequestSchema,
  SeedRequestSchema,
  TeardownRequestSchema,
} from "./schemas.ts";

// ─── CORS ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── Fixed seed identifiers ────────────────────────────────────────────────
// These IDs match design.md §Seed OBE Chain verbatim and are referenced by
// every role's E2E spec plus the RLS matrix runner's parent-linkage probe.

const AUDIT_INSTITUTION_ID = "audit-inst";
const AUDIT_PROGRAM_ID = "audit-prog-1";
const AUDIT_COURSE_ID = "audit-course-1";
const AUDIT_ILO_ID = "audit-ilo-1";
const AUDIT_PLO_ID = "audit-plo-1";
const AUDIT_CLO_PREREQ_ID = "audit-clo-0";
const AUDIT_CLO_TARGET_ID = "audit-clo-1";
const AUDIT_ASSIGNMENT_ID = "audit-assign-1";
const PREREQUISITE_GATE_PERCENTAGE = 60;

export const SEED_EMAILS = {
  admin: "audit+admin@edeviser.test",
  coordinator: "audit+coordinator@edeviser.test",
  teacher: "audit+teacher@edeviser.test",
  student: "audit+student@edeviser.test",
  parentLinked: "audit+parent-linked@edeviser.test",
  parentUnlinked: "audit+parent-unlinked@edeviser.test",
} as const;

// ─── Environment gating (Task 2.2, Req 13.2, Req 13.7) ────────────────────
// This runs BEFORE every request handler so the fixture endpoint cannot
// leak into a non-audit environment even through a misconfiguration.

const assertAuditStaging = (): Response | null => {
  const envId = Deno.env.get("ENV_ID");
  if (envId === "production") {
    // Belt-and-suspenders: explicit reject even if the equality check below
    // were bypassed somehow. design.md §Fixture Endpoint gating item 2.
    return json({ error: "fixture endpoint disabled in production" }, 403);
  }
  if (envId !== "audit-staging") {
    return json(
      {
        error: "fixture endpoint disabled",
        detail: `ENV_ID=${envId ?? "unset"}`,
      },
      403
    );
  }
  return null;
};

// ─── Service-role client factory ───────────────────────────────────────────

const makeServiceClient = (): SupabaseClient => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error(
      "audit-fixtures: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// ─── Seed helpers ──────────────────────────────────────────────────────────

const upsertUser = async (
  supabase: SupabaseClient,
  email: string,
  role: string,
  metadata: Record<string, unknown>
): Promise<string> => {
  // Try to find existing user first
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === email);
  if (existing) {
    // Update metadata to ensure it's current
    await supabase.auth.admin.updateUserById(existing.id, {
      user_metadata: { role, ...metadata },
      app_metadata: { role, ...metadata },
    });
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "AuditSeed2024!",
    email_confirm: true,
    user_metadata: { role, ...metadata },
    app_metadata: { role, ...metadata },
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user.id;
};

// ─── Route: POST /seed (Tasks 3.1–3.8) ────────────────────────────────────

const handleSeed = async (req: Request): Promise<Response> => {
  const parsed = SeedRequestSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return json(
      { error: "invalid request body", issues: parsed.error.issues },
      400
    );
  }

  const supabase = makeServiceClient();
  const { runId, roles } = parsed.data;
  const errors: string[] = [];
  const seeded: Record<string, string> = {};

  // ── 3.1 Admin seed user ──────────────────────────────────────────────────
  if (roles.includes("admin")) {
    try {
      const adminId = await upsertUser(supabase, SEED_EMAILS.admin, "admin", {
        institution_id: AUDIT_INSTITUTION_ID,
      });
      seeded.admin = adminId;
      // Upsert profile row
      await supabase.from("profiles").upsert(
        {
          id: adminId,
          email: SEED_EMAILS.admin,
          role: "admin",
          institution_id: AUDIT_INSTITUTION_ID,
          full_name: "Audit Admin",
        },
        { onConflict: "id" }
      );
    } catch (e) {
      errors.push(`admin: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3.2 Coordinator seed user ────────────────────────────────────────────
  if (roles.includes("coordinator")) {
    try {
      const coordId = await upsertUser(
        supabase,
        SEED_EMAILS.coordinator,
        "coordinator",
        { institution_id: AUDIT_INSTITUTION_ID, program_id: AUDIT_PROGRAM_ID }
      );
      seeded.coordinator = coordId;
      await supabase.from("profiles").upsert(
        {
          id: coordId,
          email: SEED_EMAILS.coordinator,
          role: "coordinator",
          institution_id: AUDIT_INSTITUTION_ID,
          full_name: "Audit Coordinator",
        },
        { onConflict: "id" }
      );
    } catch (e) {
      errors.push(`coordinator: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3.3 Teacher seed user ────────────────────────────────────────────────
  if (roles.includes("teacher")) {
    try {
      const teacherId = await upsertUser(
        supabase,
        SEED_EMAILS.teacher,
        "teacher",
        { institution_id: AUDIT_INSTITUTION_ID }
      );
      seeded.teacher = teacherId;
      await supabase.from("profiles").upsert(
        {
          id: teacherId,
          email: SEED_EMAILS.teacher,
          role: "teacher",
          institution_id: AUDIT_INSTITUTION_ID,
          full_name: "Audit Teacher",
        },
        { onConflict: "id" }
      );
      // Assign teacher to course
      await supabase.from("courses").upsert(
        {
          id: AUDIT_COURSE_ID,
          name: "Audit Course 1",
          institution_id: AUDIT_INSTITUTION_ID,
          program_id: AUDIT_PROGRAM_ID,
          teacher_id: teacherId,
          code: "AUDIT-101",
        },
        { onConflict: "id" }
      );
    } catch (e) {
      errors.push(`teacher: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3.4 Student seed user ────────────────────────────────────────────────
  if (roles.includes("student")) {
    try {
      const studentId = await upsertUser(
        supabase,
        SEED_EMAILS.student,
        "student",
        { institution_id: AUDIT_INSTITUTION_ID }
      );
      seeded.student = studentId;
      await supabase.from("profiles").upsert(
        {
          id: studentId,
          email: SEED_EMAILS.student,
          role: "student",
          institution_id: AUDIT_INSTITUTION_ID,
          full_name: "Audit Student",
        },
        { onConflict: "id" }
      );
      // Enroll student in course
      await supabase.from("student_courses").upsert(
        {
          student_id: studentId,
          course_id: AUDIT_COURSE_ID,
          institution_id: AUDIT_INSTITUTION_ID,
          status: "active",
        },
        { onConflict: "student_id,course_id" }
      );
    } catch (e) {
      errors.push(`student: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3.5 Parent (linked, verified) ───────────────────────────────────────
  if (roles.includes("parent")) {
    try {
      const parentLinkedId = await upsertUser(
        supabase,
        SEED_EMAILS.parentLinked,
        "parent",
        { institution_id: AUDIT_INSTITUTION_ID }
      );
      seeded.parentLinked = parentLinkedId;
      await supabase.from("profiles").upsert(
        {
          id: parentLinkedId,
          email: SEED_EMAILS.parentLinked,
          role: "parent",
          institution_id: AUDIT_INSTITUTION_ID,
          full_name: "Audit Parent Linked",
        },
        { onConflict: "id" }
      );
      // Insert parent_student_links row if student was seeded
      if (seeded.student) {
        await supabase.from("parent_student_links").upsert(
          {
            parent_id: parentLinkedId,
            student_id: seeded.student,
            verified: true,
            institution_id: AUDIT_INSTITUTION_ID,
          },
          { onConflict: "parent_id,student_id" }
        );
      }

      // ── 3.6 Parent (unlinked) ──────────────────────────────────────────
      const parentUnlinkedId = await upsertUser(
        supabase,
        SEED_EMAILS.parentUnlinked,
        "parent",
        { institution_id: AUDIT_INSTITUTION_ID }
      );
      seeded.parentUnlinked = parentUnlinkedId;
      await supabase.from("profiles").upsert(
        {
          id: parentUnlinkedId,
          email: SEED_EMAILS.parentUnlinked,
          role: "parent",
          institution_id: AUDIT_INSTITUTION_ID,
          full_name: "Audit Parent Unlinked",
        },
        { onConflict: "id" }
      );
      // No parent_student_links row for unlinked parent (by design)
    } catch (e) {
      errors.push(`parent: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3.7 ILO → PLO → CLO chain ───────────────────────────────────────────
  try {
    // Institution
    await supabase
      .from("institutions")
      .upsert(
        { id: AUDIT_INSTITUTION_ID, name: "Audit Institution" },
        { onConflict: "id" }
      );
    // Program
    await supabase.from("programs").upsert(
      {
        id: AUDIT_PROGRAM_ID,
        name: "Audit Program 1",
        institution_id: AUDIT_INSTITUTION_ID,
      },
      { onConflict: "id" }
    );
    // ILO
    await supabase.from("learning_outcomes").upsert(
      {
        id: AUDIT_ILO_ID,
        type: "ilo",
        title: "Audit ILO 1",
        institution_id: AUDIT_INSTITUTION_ID,
        description: "Audit ILO for pre-deployment testing",
      },
      { onConflict: "id" }
    );
    // PLO
    await supabase.from("learning_outcomes").upsert(
      {
        id: AUDIT_PLO_ID,
        type: "plo",
        title: "Audit PLO 1",
        program_id: AUDIT_PROGRAM_ID,
        institution_id: AUDIT_INSTITUTION_ID,
        description: "Audit PLO for pre-deployment testing",
      },
      { onConflict: "id" }
    );
    // PLO → ILO mapping (weight=100)
    await supabase.from("outcome_mappings").upsert(
      {
        child_id: AUDIT_PLO_ID,
        parent_id: AUDIT_ILO_ID,
        weight: 100,
        child_type: "plo",
        parent_type: "ilo",
        institution_id: AUDIT_INSTITUTION_ID,
      },
      { onConflict: "child_id,parent_id" }
    );
    // CLO-0 (Remembering — prerequisite)
    await supabase.from("learning_outcomes").upsert(
      {
        id: AUDIT_CLO_PREREQ_ID,
        type: "clo",
        title: "Audit CLO 0 — Remembering",
        course_id: AUDIT_COURSE_ID,
        institution_id: AUDIT_INSTITUTION_ID,
        blooms_level: "Remembering",
        description: "Prerequisite CLO",
      },
      { onConflict: "id" }
    );
    // CLO-0 → PLO mapping (weight=50)
    await supabase.from("outcome_mappings").upsert(
      {
        child_id: AUDIT_CLO_PREREQ_ID,
        parent_id: AUDIT_PLO_ID,
        weight: 50,
        child_type: "clo",
        parent_type: "plo",
        institution_id: AUDIT_INSTITUTION_ID,
      },
      { onConflict: "child_id,parent_id" }
    );
    // CLO-1 (Applying — target)
    await supabase.from("learning_outcomes").upsert(
      {
        id: AUDIT_CLO_TARGET_ID,
        type: "clo",
        title: "Audit CLO 1 — Applying",
        course_id: AUDIT_COURSE_ID,
        institution_id: AUDIT_INSTITUTION_ID,
        blooms_level: "Applying",
        description: "Target CLO",
      },
      { onConflict: "id" }
    );
    // CLO-1 → PLO mapping (weight=50, total=100)
    await supabase.from("outcome_mappings").upsert(
      {
        child_id: AUDIT_CLO_TARGET_ID,
        parent_id: AUDIT_PLO_ID,
        weight: 50,
        child_type: "clo",
        parent_type: "plo",
        institution_id: AUDIT_INSTITUTION_ID,
      },
      { onConflict: "child_id,parent_id" }
    );
  } catch (e) {
    errors.push(`obe-chain: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3.8 Assignment with prerequisite gate and rubric ────────────────────
  try {
    // Rubric
    const rubricId = `${AUDIT_ASSIGNMENT_ID}-rubric`;
    await supabase.from("rubrics").upsert(
      {
        id: rubricId,
        title: "Audit Rubric",
        course_id: AUDIT_COURSE_ID,
        institution_id: AUDIT_INSTITUTION_ID,
        criteria: [
          {
            id: "c1",
            title: "Overall Performance",
            weight: 100,
            levels: [
              { score: 4, description: "Excellent" },
              { score: 3, description: "Good" },
              { score: 2, description: "Satisfactory" },
              { score: 1, description: "Needs Improvement" },
            ],
          },
        ],
      },
      { onConflict: "id" }
    );
    // Assignment
    await supabase.from("assignments").upsert(
      {
        id: AUDIT_ASSIGNMENT_ID,
        title: "Audit Assignment 1",
        course_id: AUDIT_COURSE_ID,
        institution_id: AUDIT_INSTITUTION_ID,
        clo_ids: [AUDIT_CLO_TARGET_ID],
        rubric_id: rubricId,
        prerequisite_clo_id: AUDIT_CLO_PREREQ_ID,
        prerequisite_gate_percentage: PREREQUISITE_GATE_PERCENTAGE,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        max_score: 100,
      },
      { onConflict: "id" }
    );
  } catch (e) {
    errors.push(`assignment: ${e instanceof Error ? e.message : String(e)}`);
  }

  return json({
    ok: errors.length === 0,
    runId,
    seeded,
    errors: errors.length > 0 ? errors : undefined,
    identifiers: {
      institutionId: AUDIT_INSTITUTION_ID,
      programId: AUDIT_PROGRAM_ID,
      courseId: AUDIT_COURSE_ID,
      iloId: AUDIT_ILO_ID,
      ploId: AUDIT_PLO_ID,
      cloPrereqId: AUDIT_CLO_PREREQ_ID,
      cloTargetId: AUDIT_CLO_TARGET_ID,
      assignmentId: AUDIT_ASSIGNMENT_ID,
      prerequisiteGatePercentage: PREREQUISITE_GATE_PERCENTAGE,
      emails: SEED_EMAILS,
    },
  });
};

// ─── Route: POST /teardown (Task 3.9) ─────────────────────────────────────
// Deletes rows namespaced with `audit-<runId>-` in FK-safe order.
// Does NOT delete from evidence, audit_logs, xp_transactions (append-only).

const handleTeardown = async (req: Request): Promise<Response> => {
  const parsed = TeardownRequestSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return json(
      { error: "invalid request body", issues: parsed.error.issues },
      400
    );
  }

  const supabase = makeServiceClient();
  const { runId } = parsed.data;
  const prefix = `audit-${runId}-`;
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  // FK-safe delete order: leaves first, then parents
  // grades → submissions → rubric_scores → assignments → outcome_mappings
  // → clo → plo → ilo → enrollments → courses → programs
  const tables: Array<{ table: string; column: string }> = [
    { table: "grades", column: "id" },
    { table: "submissions", column: "id" },
    { table: "assignments", column: "id" },
    { table: "outcome_mappings", column: "child_id" },
    { table: "clos", column: "id" },
    { table: "plos", column: "id" },
    { table: "ilos", column: "id" },
    { table: "enrollments", column: "id" },
    { table: "courses", column: "id" },
    { table: "programs", column: "id" },
  ];

  for (const { table, column } of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .like(column, `${prefix}%`);
      if (error) {
        errors.push(`${table}: ${error.message}`);
      } else {
        deleted[table] = count ?? 0;
      }
    } catch (e) {
      errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return json({
    ok: errors.length === 0,
    runId,
    deleted,
    errors: errors.length > 0 ? errors : undefined,
  });
};

// ─── Route: POST /impersonate (Task 3.10) ────────────────────────────────
// Returns a magic-link JWT for the matching seed user.

const handleImpersonate = async (req: Request): Promise<Response> => {
  const parsed = ImpersonateRequestSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return json(
      { error: "invalid request body", issues: parsed.error.issues },
      400
    );
  }

  // Second gate — redundant with assertAuditStaging but documented in
  // design.md §Authentication Strategy bullet 4 as "redundant but explicit".
  if (Deno.env.get("ENV_ID") !== "audit-staging") {
    return json({ error: "impersonation disabled" }, 403);
  }

  const supabase = makeServiceClient();
  const { role, variant } = parsed.data;

  // Resolve the email for the requested role + variant
  let email: string;
  if (role === "parent") {
    email =
      variant === "unlinked"
        ? SEED_EMAILS.parentUnlinked
        : SEED_EMAILS.parentLinked;
  } else {
    email = SEED_EMAILS[role as keyof typeof SEED_EMAILS];
  }

  // Find the user by email
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();
  if (listError) {
    return json({ error: listError.message }, 500);
  }
  const user = listData?.users?.find((u) => u.email === email);
  if (!user) {
    return json(
      { error: `seed user not found for role=${role} variant=${variant}` },
      404
    );
  }

  // Generate a magic link (one-time sign-in link)
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkError) {
    return json({ error: linkError.message }, 500);
  }

  return json({
    ok: true,
    role,
    variant,
    email,
    userId: user.id,
    magicLink: linkData.properties?.action_link ?? null,
    // Also return the hashed token for programmatic use
    token: linkData.properties?.hashed_token ?? null,
  });
};

// ─── Route: POST /event/bonus-xp (Task 3.11) ─────────────────────────────
// Inserts a namespaced row into bonus_xp_events.

const handleBonusXpEvent = async (req: Request): Promise<Response> => {
  const parsed = BonusXpEventRequestSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return json(
      { error: "invalid request body", issues: parsed.error.issues },
      400
    );
  }

  const supabase = makeServiceClient();
  const { multiplier, startsAt, endsAt } = parsed.data;

  const { data, error } = await supabase
    .from("xp_events")
    .insert({
      xp_multiplier: multiplier,
      starts_at: startsAt,
      ends_at: endsAt,
      institution_id: AUDIT_INSTITUTION_ID,
      name: `Audit Bonus XP Event (${multiplier}x)`,
      event_type: "bonus_weekend",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({
    ok: true,
    id: data?.id,
    multiplier,
    startsAt,
    endsAt,
  });
};

// ─── Router ────────────────────────────────────────────────────────────────

type Route = "/seed" | "/teardown" | "/impersonate" | "/event/bonus-xp";

const routeOf = (pathname: string): Route | null => {
  // Strip any leading "/audit-fixtures" path prefix Supabase adds in prod.
  const trimmed = pathname.replace(/^\/audit-fixtures/, "");
  if (trimmed === "/seed") return "/seed";
  if (trimmed === "/teardown") return "/teardown";
  if (trimmed === "/impersonate") return "/impersonate";
  if (trimmed === "/event/bonus-xp") return "/event/bonus-xp";
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const gated = assertAuditStaging();
  if (gated !== null) {
    return gated;
  }

  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const route = routeOf(url.pathname);

  try {
    switch (route) {
      case "/seed":
        return await handleSeed(req);
      case "/teardown":
        return await handleTeardown(req);
      case "/impersonate":
        return await handleImpersonate(req);
      case "/event/bonus-xp":
        return await handleBonusXpEvent(req);
      default:
        return json(
          { error: "not found", detail: `unknown route ${url.pathname}` },
          404
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    return json({ error: "internal error", detail: message }, 500);
  }
});

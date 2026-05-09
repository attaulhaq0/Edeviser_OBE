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

// ─── Route: POST /seed (Tasks 3.1–3.8 land full implementations) ──────────
// Phase 1 handler: validates body, acknowledges receipt, and returns the
// canonical seed identifiers so callers can begin wiring Playwright specs
// against known IDs. The per-role user/OBE/assignment inserts are delegated
// to Tasks 3.1–3.8 which extend this route body. Keeping those inserts in
// their own PRs keeps review surface small and each sub-task independently
// verifiable.

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

  // Service client is materialised so downstream tasks can extend without
  // refactoring the handler. Unused right now — marked with a void cast so
  // Deno's no-unused-vars rule does not fire when linted.
  void makeServiceClient();

  return json({
    ok: true,
    runId: parsed.data.runId,
    note: "seed stub — per-role inserts land in tasks 3.1–3.8",
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

// ─── Route: POST /teardown (Task 3.9 lands the delete orchestration) ──────

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

  void makeServiceClient();

  // The FK-safe delete orchestration is task 3.9. Stub returns ok so the
  // Playwright globalTeardown wiring (task 4.2) can exercise the endpoint.
  return json({
    ok: true,
    runId: parsed.data.runId,
    note: "teardown stub — namespaced truncation lands in task 3.9",
  });
};

// ─── Route: POST /impersonate (Task 3.10 lands the JWT generation) ────────

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

  void makeServiceClient();

  return json({
    ok: true,
    role: parsed.data.role,
    note: "impersonate stub — magiclink generation lands in task 3.10",
  });
};

// ─── Route: POST /event/bonus-xp (Task 3.11 lands the insert) ────────────

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

  void makeServiceClient();

  return json({
    ok: true,
    multiplier: parsed.data.multiplier,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    note: "bonus-xp stub — bonus_xp_events insert lands in task 3.11",
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

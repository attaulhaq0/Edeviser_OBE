/**
 * Feature: continuous-verification — SECURITY DEFINER / MV exposure regression.
 *
 * Two security invariants verified black-box against a live database:
 *
 *   1. `mv_historical_evidence` (materialized view, cross-institution OBE
 *      aggregates) must NOT be SELECTable by `anon` or `authenticated`.
 *      Before migration `20260905205552_lock_mv_historical_evidence_select`
 *      the MV had an anon/authenticated SELECT grant and **no RLS** —
 *      owner-semantics bypassed the source-table policies entirely, exposing
 *      cross-tenant attainment data and contradicting the admin-gated
 *      `get_historical_evidence` function. After the migration the ACL is
 *      `postgres,service_role` only, so direct REST reads must fail with a
 *      permission error.
 *
 *   2. `get_historical_evidence` keeps its fail-closed guard: a non-admin
 *      caller receives ZERO rows (the function returns an empty set rather
 *      than raising), so even the gated path cannot leak cross-tenant data.
 *
 *   3. Internal worker SECURITY DEFINER RPCs (`claim_proactive_agent_jobs_v1`,
 *      `execute_approved_agent_personal_action_v1`) are locked to
 *      `postgres,service_role` — anon/authenticated invocation must be denied.
 *
 * Skip-safe (Req 19.7): `describe.skipIf(!shouldRunRls())` — without preview
 * secrets the suite is skipped and `npm run test:rls` exits 0. The dedicated
 * `rls-smoke` CI job (preview branch with the migration replayed) is where
 * these execute for real.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readRlsEnv, shouldRunRls } from "./guard";
import { seedRlsFixtures, teardownRlsFixtures, type SeededCtx } from "./seed";
import { signInAs } from "./signIn";

/** Narrow structural type for RPCs not present in the generated types. */
type UntypedRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

interface HistoricalEvidenceRow {
  semester_id: string;
  outcome_type: string;
  evidence_count: number;
}

describe.skipIf(!shouldRunRls())(
  "RLS — historical-evidence MV + internal worker RPC boundaries",
  () => {
    let ctx: SeededCtx | null = null;
    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[rls-smoke mv_historical_evidence] seeded context unavailable — beforeAll seeding did not complete."
        );
      }
      return ctx;
    };

    const anonClient = () => {
      const env = readRlsEnv();
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error("[rls-smoke] anon env missing on live path");
      }
      return createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
    });

    afterAll(async () => {
      if (ctx !== null) {
        await teardownRlsFixtures(ctx);
        ctx = null;
      }
    });

    it("anon cannot SELECT mv_historical_evidence (permission denied)", async () => {
      const { error } = await anonClient()
        .from("mv_historical_evidence")
        .select("*")
        .limit(1);
      // Post-revoke the REST read must fail (42501) — never silently return rows.
      expect(error).not.toBeNull();
    });

    it("authenticated student cannot SELECT mv_historical_evidence", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      const { error } = await client
        .from("mv_historical_evidence")
        .select("*")
        .limit(1);
      expect(error).not.toBeNull();
    });

    it("student calling get_historical_evidence gets ZERO rows (fail-closed guard)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      const { data, error } = await (client as unknown as UntypedRpcClient).rpc(
        "get_historical_evidence",
        { p_outcome_type: null, p_blooms_level: null }
      );
      // The function is SECURITY DEFINER and intentionally returns an EMPTY
      // set for non-admins rather than raising — assert the empty contract.
      expect(error).toBeNull();
      const rows = (data ?? []) as HistoricalEvidenceRow[];
      expect(rows).toHaveLength(0);
    });

    it("anon cannot invoke the claim_proactive_agent_jobs_v1 worker RPC", async () => {
      const { error } = await (anonClient() as unknown as UntypedRpcClient).rpc(
        "claim_proactive_agent_jobs_v1",
        {
          p_worker_id: "00000000-0000-0000-0000-000000000000",
          p_batch_size: 1,
          p_lease_seconds: 60,
        }
      );
      expect(error).not.toBeNull();
    });

    it("authenticated student cannot invoke execute_approved_agent_personal_action_v1", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      const { error } = await (client as unknown as UntypedRpcClient).rpc(
        "execute_approved_agent_personal_action_v1",
        {
          p_proposal_id: "00000000-0000-0000-0000-000000000000",
          p_actor_id: c.studentId,
        }
      );
      expect(error).not.toBeNull();
    });
  }
);

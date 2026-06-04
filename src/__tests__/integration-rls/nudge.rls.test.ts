/**
 * Feature: qa-partner-review-remediation — Req 1 (Nudge_Service) + Req 19
 * (RLS_Smoke_Test), task 9.1 — RED FIRST.
 *
 * RLS insert smoke cases for the teacher→student Nudge, exercised through the
 * authorized `send_teacher_nudge(p_student_id uuid, p_message text)` RPC.
 *
 * ⚠️ RED-FIRST: this file is written BEFORE the RPC exists. The RPC is created
 * in task 9.2, its types regenerated in 9.3, and `useSendNudge` is routed
 * through it in 9.4. Until 9.2 lands, `rpc("send_teacher_nudge", …)` resolves
 * with a "function does not exist" error, so:
 *   - the "own student → success" case FAILS (an error is present where none is
 *     expected) — this failure is the proof the smoke test detects the bug;
 *   - the "non-taught student → rejected" case happens to be satisfied for the
 *     wrong reason (any error counts as rejected), and flips to a genuine
 *     authorization rejection (`42501`) once the RPC ships.
 * This red signal only manifests in the dedicated `rls-smoke` CI job against a
 * Supabase preview branch (secrets present). With no secrets — the normal local
 * / unit-CI case — `runRlsCases` skips the whole suite, so `npm run test:rls`
 * still exits 0 (Req 19.7 / skip-safety).
 *
 * Cases (Req 1.8, 19.3, 19.4, 19.5):
 *   1. notifications (via nudge RPC) — teacher nudges their OWN enrolled student
 *      → success (the RPC confirms the `courses ⋈ student_courses` teaching
 *      relationship for `auth.uid()` and inserts the notification).
 *   2. notifications (via nudge RPC) — teacher nudges a NON-taught student
 *      (`ctx.otherStudentId`, deliberately un-enrolled by the seed) → rejected
 *      (the RPC must raise an authorization error and insert nothing — Req 1.8).
 *
 * This file ONLY declares cases + hands them to {@link runRlsCases} (task 5.2),
 * reusing the existing harness, seeded context, and per-role sign-in verbatim.
 *
 * Typing note (red-first): `send_teacher_nudge` is not in the generated
 * `Database` types until task 9.3, so a direct `client.rpc("send_teacher_nudge",
 * …)` would not type-check yet. We therefore route the call through a tiny
 * helper that casts ONLY the `rpc` method to a loose signature. This does NOT
 * use `.from/.insert/.update/.upsert(... as never)` — the patterns the
 * Static_Cast_Guard (Req 17) forbids — so the guard stays green. Once 9.3
 * regenerates the types, this helper can be deleted and the call made directly.
 *
 * Teardown note (FK / cleanup): `notifications.user_id` references
 * `profiles(id)` WITHOUT `ON DELETE CASCADE` (see
 * `supabase/migrations/20260222073828_create_system_tables.sql`). Once 9.2 lands
 * and the success case actually inserts a notification row, the default
 * `teardownRlsFixtures` (which deletes the seeded student's auth user/profile)
 * would be blocked by that row. So the suite's teardown is wrapped to delete the
 * inserted `notifications` rows (scoped to the seeded students) BEFORE delegating
 * to the default teardown. Fixtures are namespaced per `runId`, so this stays
 * best-effort and collision-free, and it is a no-op on the current red-first run
 * (no row is inserted while the RPC is absent).
 */
import { runRlsCases, type ActionResult, type RLSCase } from "./runner";
import { createAdminClient, teardownRlsFixtures, type SeededCtx } from "./seed";
import type { RoleClient } from "./signIn";

/**
 * Loose signature for an RPC that is not yet present in the generated
 * `Database` types. Mirrors the slice of the Supabase `rpc(...)` result the
 * runner inspects ({@link ActionResult}).
 */
type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>
) => Promise<ActionResult>;

/**
 * Invokes an RPC by name without compile-time knowledge of the generated
 * `Functions` map. Casts ONLY the `rpc` method (never a `.from/.insert/.update/
 * .upsert(... as never)` builder cast), keeping the Static_Cast_Guard green.
 * Remove once task 9.3 regenerates types and `send_teacher_nudge` is typed.
 */
const callRpc = (
  client: RoleClient,
  fn: string,
  args: Record<string, unknown>
): Promise<ActionResult> => {
  const rpc = client.rpc as unknown as UntypedRpc;
  return rpc(fn, args);
};

const RLS_CASES: readonly RLSCase[] = [
  {
    table: "notifications",
    description:
      "teacher nudges their own enrolled student via send_teacher_nudge RPC",
    asRole: "teacher",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await callRpc(client, "send_teacher_nudge", {
        p_student_id: ctx.studentId,
        p_message: "Keep going!",
      });
      return { error };
    },
  },
  {
    table: "notifications",
    description:
      "teacher cannot nudge a student they do not teach (RPC authorization rejects)",
    asRole: "teacher",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await callRpc(client, "send_teacher_nudge", {
        p_student_id: ctx.otherStudentId,
        p_message: "hi",
      });
      return { error };
    },
  },
];

/**
 * Deletes any `notifications` rows the success case inserts (scoped to the two
 * seeded students) before the default teardown removes their profiles — see the
 * FK note in the file header. Best-effort: a delete failure must not stop the
 * rest of teardown from running.
 */
const teardownWithNudgeRows = async (ctx: SeededCtx): Promise<void> => {
  try {
    const admin = createAdminClient();
    await admin
      .from("notifications")
      .delete()
      .in("user_id", [ctx.studentId, ctx.otherStudentId]);
  } catch (error) {
    console.warn(
      `[rls-smoke teardown] pre-clean of inserted notifications skipped: ${String(
        error
      )}`
    );
  }
  await teardownRlsFixtures(ctx);
};

runRlsCases(RLS_CASES, {
  suiteName:
    "RLS smoke — teacher nudge via send_teacher_nudge RPC (task 9.1, red-first)",
  teardown: teardownWithNudgeRows,
});

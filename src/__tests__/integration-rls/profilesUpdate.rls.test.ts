/**
 * Feature: profile-picture-upload + profiles RLS recursion fix.
 *
 * Deny-side RLS cases for UPDATE on public.profiles, guarding the fix in
 * migration 20260821000019_fix_profiles_update_own_recursion.sql.
 *
 * Background: the previous `profiles_update_own` WITH CHECK enforced
 * immutability of role / institution_id / status via an inline SELECT on
 * `profiles`, which made every UPDATE abort with SQLSTATE 42P17 ("infinite
 * recursion detected in policy for relation profiles"). That broke the language
 * switcher, theme / notification preferences, AND the avatar upload's
 * profiles.avatar_url write (all surfaced as HTTP 500). The fix re-sources the
 * current values from the SECURITY DEFINER helpers (auth_user_role /
 * auth_institution_id / auth_user_status), which bypass RLS, so the guard is
 * preserved without recursion.
 *
 * Cases (allowed AND denied for the self-update path — Req: deny-side per
 * role × table):
 *   1. profiles — student updates a benign own column (preferred_language)
 *                 → success  (the exact path that used to 500 with 42P17).
 *   2. profiles — parent updates a benign own column (preferred_language)
 *                 → success.
 *   3. profiles — student attempts to escalate their own role to 'admin'
 *                 → rejected (WITH CHECK pins role to the stored value).
 *   4. profiles — student attempts to change their own status to 'active'…
 *                 actually to a different value → rejected (status is pinned).
 *
 * Skip-safety: runRlsCases wraps everything in describe.skipIf(!shouldRunRls()),
 * so with no preview secrets nothing connects and `npm run test:rls` exits 0.
 * Default teardown deletes the seeded users (cascading their profiles), so the
 * benign preferred_language writes need no special cleanup and the rejected
 * cases make no changes at all.
 */
import { runRlsCases, type RLSCase } from "./runner";

const RLS_CASES: readonly RLSCase[] = [
  {
    table: "profiles",
    description:
      "student updates own preferred_language (regression: used to 42P17/500)",
    asRole: "student",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await client
        .from("profiles")
        .update({ preferred_language: "ar" })
        .eq("id", ctx.studentId);
      return { error };
    },
  },
  {
    table: "profiles",
    description: "parent updates own preferred_language",
    asRole: "parent",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await client
        .from("profiles")
        .update({ preferred_language: "en" })
        .eq("id", ctx.parentId);
      return { error };
    },
  },
  {
    table: "profiles",
    description:
      "student cannot escalate own role to admin (WITH CHECK pins role)",
    asRole: "student",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", ctx.studentId);
      return { error };
    },
  },
  {
    table: "profiles",
    description: "student cannot change own status (WITH CHECK pins status)",
    asRole: "student",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client
        .from("profiles")
        .update({ status: "suspended" })
        .eq("id", ctx.studentId);
      return { error };
    },
  },
];

runRlsCases(RLS_CASES, {
  suiteName: "RLS — profiles UPDATE self-edit (recursion fix, migration …019)",
});

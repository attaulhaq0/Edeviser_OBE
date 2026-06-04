/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test), task 5.2
 *
 * Per-role sign-in helper (Req 19.2).
 *
 * Each call creates a FRESH **anon** client (`createClient(url, anonKey)`) and
 * signs in with the seeded credentials for the requested role. A fresh client
 * per call is deliberate: RLS is evaluated against the signed-in `auth.uid()`,
 * so reusing one client across roles would leak sessions and produce false
 * results. The returned client is authenticated as exactly that role and is
 * what the RLS cases use to perform their real insert/update/RPC.
 *
 * Skip-safety contract: importing this module MUST NOT throw and MUST NOT
 * create any client. `createClient` + `signInWithPassword` only run inside
 * `signInAs`, which is only ever called on the live path guarded by
 * `shouldRunRls()`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { readRlsEnv, type RlsEnv } from "./guard";

/** A Supabase client authenticated as one seeded role. */
export type RoleClient = SupabaseClient<Database>;

/**
 * Creates a fresh anon client and signs it in with the given credentials.
 * Returns the authenticated client so the caller can perform a real,
 * RLS-evaluated mutation as that user.
 *
 * A fresh client per call is deliberate (Req 19.2): RLS is evaluated against
 * the signed-in `auth.uid()`, so each role must get its own client with no
 * shared/persisted session. The table-driven runner resolves the per-role
 * `email`/`password` from the {@link SeededCtx} and passes them here.
 *
 * Throws a descriptive error if anon secrets are missing or sign-in fails —
 * only ever reached on the live (preview) path behind `shouldRunRls()`.
 *
 * @param email Seeded user email (e.g. `ctx.emails[role]`).
 * @param password Seeded shared password (`ctx.password`).
 * @param env Injectable env snapshot (defaults to the real `process.env`).
 */
export const signInAs = async (
  email: string,
  password: string,
  env: RlsEnv = readRlsEnv()
): Promise<RoleClient> => {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "[rls-smoke signIn] signInAs requires SUPABASE_URL and SUPABASE_ANON_KEY. " +
        "This should only be called on the live (preview) path guarded by shouldRunRls()."
    );
  }

  // Fresh client per call — no shared session, so RLS sees only this user.
  const client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `[rls-smoke signIn] signInWithPassword(<${email}>) failed: ${error.message}`
    );
  }

  return client;
};

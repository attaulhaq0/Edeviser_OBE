import { createClient } from "@supabase/supabase-js";

const url = process.env.NOOR_LOCAL_SUPABASE_URL;
const anonKey = process.env.NOOR_LOCAL_ANON_KEY;
const password = process.env.NOOR_LOCAL_TEST_PASSWORD;
if (
  !url ||
  !anonKey ||
  !password ||
  !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)
) {
  throw new Error("Local Noor URL, anon key and runtime password are required");
}

const users = [
  ["noor.admin@local.test", "admin"],
  ["noor.coordinator@local.test", "coordinator"],
  ["noor.teacher@local.test", "teacher"],
  ["noor.student@local.test", "student"],
  ["noor.parent@local.test", "parent"],
] as const;
const client = createClient(url, anonKey, { auth: { persistSession: false } });

async function main(): Promise<void> {
  const results: Array<{
    role: string;
    authenticated: boolean;
    profileAccessible: boolean;
    profileError?: string;
    institutionAccessible: boolean;
    courseRows: number;
    crossTenantRows: number;
  }> = [];
  for (const [email, expectedRole] of users) {
    const { data: signIn, error: signInError } =
      await client.auth.signInWithPassword({
        email,
        password,
      });
    if (signInError)
      throw new Error(`${expectedRole} sign-in failed: ${signInError.message}`);
    const userId = signIn.user?.id;
    if (!userId) throw new Error(`${expectedRole} sign-in returned no user`);
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,institution_id")
      .eq("id", userId)
      .maybeSingle();
    const institutionId =
      profile?.institution_id ?? "00000000-0000-4000-8000-000000000003";
    const { data: institution, error: institutionError } = await client
      .from("institutions")
      .select("id")
      .eq("id", institutionId)
      .maybeSingle();
    const { data: courses, error: coursesError } = await client
      .from("courses")
      .select("id");
    if (coursesError && !coursesError.message.includes("permission denied"))
      throw new Error(
        `${expectedRole} course query failed: ${coursesError.message}`
      );
    const { data: crossTenant, error: crossTenantError } = await client
      .from("institutions")
      .select("id")
      .eq("id", "00000000-0000-4000-8000-000000000002");
    if (
      crossTenantError &&
      !crossTenantError.message.includes("permission denied")
    )
      throw new Error(
        `${expectedRole} isolation query failed: ${crossTenantError.message}`
      );
    if (profileError || !profile || profile.role !== expectedRole)
      throw new Error(
        `${expectedRole} profile resolution failed: ${
          profileError?.message ?? "missing or wrong role"
        }`
      );
    if (coursesError)
      throw new Error(
        `${expectedRole} course query failed: ${coursesError.message}`
      );
    if (crossTenantError)
      throw new Error(
        `${expectedRole} isolation query failed: ${crossTenantError.message}`
      );
    results.push({
      role: expectedRole,
      authenticated: true,
      profileAccessible: !profileError,
      profileError: profileError?.message,
      institutionAccessible: !institutionError && Boolean(institution),
      courseRows: courses?.length ?? 0,
      crossTenantRows: crossTenant?.length ?? 0,
    });
    await client.auth.signOut();
  }
  console.log(JSON.stringify(results));
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Local Noor checks failed"
  );
  process.exitCode = 1;
});

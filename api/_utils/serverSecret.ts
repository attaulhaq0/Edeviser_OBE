/**
 * Resolve the server-only Supabase secret key without exposing its value.
 *
 * Vercel server routes should use the managed secret-key JSON object. The
 * legacy JWT fallback is deliberately opt-in for a bounded transition window.
 */
export function getManagedServerKey(
  env: NodeJS.ProcessEnv = process.env
): string {
  // Supabase's Vercel integration refreshes this branch-scoped value whenever
  // a Preview branch is created or recreated. Prefer that canonical binding
  // over the Edge Runtime's JSON key set, which may also exist in Vercel as a
  // stale, manually scoped override from an earlier Preview project.
  const integrationKey = env.SUPABASE_SECRET_KEY;
  if (integrationKey) return integrationKey;

  const configured = env.SUPABASE_SECRET_KEYS;
  const keyName = env.SUPABASE_SECRET_KEY_NAME ?? "default";

  if (configured) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configured) as unknown;
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS is not valid JSON");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("SUPABASE_SECRET_KEYS must be a JSON object");
    }

    const selected = (parsed as Record<string, unknown>)[keyName];
    if (typeof selected !== "string" || selected.length === 0) {
      throw new Error(`SUPABASE_SECRET_KEYS is missing key '${keyName}'`);
    }
    return selected;
  }

  if (env.ALLOW_LEGACY_SERVICE_ROLE_KEY === "true") {
    const legacy = env.SUPABASE_SERVICE_ROLE_KEY;
    if (legacy) return legacy;
  }

  throw new Error("Managed Supabase server key is not configured");
}

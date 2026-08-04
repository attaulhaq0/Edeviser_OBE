/** Resolve a server-only Supabase key without exposing it to browser code. */
export function getManagedServerKey(): string {
  const configured = Deno.env.get("SUPABASE_SECRET_KEYS");
  const keyName = Deno.env.get("SUPABASE_SECRET_KEY_NAME") ?? "default";

  if (configured) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configured);
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS is not valid JSON");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("SUPABASE_SECRET_KEYS must be a JSON object");
    }

    const value = (parsed as Record<string, unknown>)[keyName];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`SUPABASE_SECRET_KEYS is missing key '${keyName}'`);
    }
    return value;
  }

  // Temporary transition path. It is opt-in and can be disabled centrally by
  // omitting ALLOW_LEGACY_SERVICE_ROLE_KEY from the function environment.
  if (Deno.env.get("ALLOW_LEGACY_SERVICE_ROLE_KEY") === "true") {
    const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (legacy) return legacy;
  }

  throw new Error("No managed Supabase server key is configured");
}

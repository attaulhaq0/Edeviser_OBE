import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthResult {
  user: {
    id: string;
    role: string;
    institution_id: string;
    is_active: boolean;
  } | null;
  error: string | null;
}

/**
 * Validates JWT from the Authorization header and returns user info.
 * Used by edge functions that require authenticated callers.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Missing authorization header" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, error: "Unauthorized" };
  }

  // Role and institution are canonical profile data, never JWT metadata.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, institution_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // Authorization is derived exclusively from the canonical profile. JWT
  // metadata is user-controlled at signup and must never grant a role or
  // tenant context. Missing/inactive profiles are denied consistently.
  if (
    profileError ||
    !callerProfile ||
    callerProfile.is_active !== true ||
    typeof callerProfile.role !== "string" ||
    typeof callerProfile.institution_id !== "string"
  ) {
    return { user: null, error: "Profile is missing or inactive" };
  }

  return {
    user: {
      id: user.id,
      role: callerProfile.role,
      institution_id: callerProfile.institution_id,
      is_active: true,
    },
    error: null,
  };
}

/**
 * Validates a cron secret header for cron-only functions.
 * Falls back to JWT auth if the cron secret is not present.
 */
export function authenticateCronRequest(req: Request): {
  authorized: boolean;
  error: string | null;
} {
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");

  if (expectedSecret && cronSecret === expectedSecret) {
    return { authorized: true, error: null };
  }

  // Also accept service role key in Authorization header (for internal calls)
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey) {
    return { authorized: true, error: null };
  }

  return {
    authorized: false,
    error: "Unauthorized: missing or invalid cron secret",
  };
}

export function unauthorizedResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbiddenResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

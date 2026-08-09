import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  hashToken,
  invitationCorsHeaders,
  jsonResponse,
} from "../_shared/invitation.ts";

const PreviewRequestSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i),
});

const invalid = () =>
  jsonResponse(
    { valid: false, error: "Invitation is invalid or expired" },
    404
  );

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: invitationCorsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return invalid();
  }
  const parsedBody = PreviewRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) return invalid();
  const tokenHash = await hashToken(parsedBody.data.token);

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data, error } = await client.rpc("preview_invitation", {
    p_token_hash: tokenHash,
  });
  if (error || !data) return invalid();
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return invalid();
  return jsonResponse({
    valid: true,
    institutionName:
      typeof row.institution_name === "string"
        ? row.institution_name
        : undefined,
    invitedEmail:
      typeof row.invited_email === "string" ? row.invited_email : undefined,
    role: typeof row.role === "string" ? row.role : undefined,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : undefined,
  });
};

Deno.serve(handler);

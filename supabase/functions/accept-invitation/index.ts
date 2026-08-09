import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  hashToken,
  invitationCorsHeaders,
  isEmail,
  jsonResponse,
  normalizeEmail,
} from "../_shared/invitation.ts";

const AcceptRequestSchema = z
  .object({
    token: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{64}$/i),
    fullName: z.string().trim().min(2).max(100),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    locale: z.string().trim().max(10).optional().default("en"),
  })
  .strict();
type AcceptRequest = z.infer<typeof AcceptRequestSchema>;

const genericFailure = () =>
  jsonResponse(
    {
      success: false,
      error: "Invitation is invalid, expired, or already used",
    },
    400
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
    return genericFailure();
  }
  const parsedBody = AcceptRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) return genericFailure();
  const body: AcceptRequest = parsedBody.data;
  const { token, fullName, password } = body;

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    getManagedServerKey()
  );
  const forwardedIp = req.headers.get("x-real-ip")?.trim() ?? "";
  const clientIp = /^[0-9a-fA-F:.]+$/.test(forwardedIp)
    ? forwardedIp
    : "0.0.0.0";
  const { data: rateLimited } = await service.rpc(
    "check_rate_limit_approaching",
    {
      p_ip_address: clientIp,
      p_event_type: "invitation_accept",
      p_threshold: 10,
      p_window_minutes: 15,
    }
  );
  if (rateLimited === true)
    return jsonResponse({ error: "Too many attempts. Try again later." }, 429);
  const { error: rateRecordError } = await service
    .from("rate_limit_events")
    .insert({
      ip_address: clientIp,
      event_type: "invitation_accept",
      metadata: { route: "accept-invitation" },
    });
  if (rateRecordError)
    return jsonResponse(
      { error: "Invitation service is temporarily unavailable" },
      503
    );
  const tokenHash = await hashToken(token);
  const { data: invitation, error: invitationError } = await service
    .from("invitations")
    .select("id,email,role,institution_id,status,expires_at,student_id")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (invitationError || !invitation || invitation.role !== "parent")
    return genericFailure();

  const email = normalizeEmail(invitation.email);
  if (!isEmail(email)) return genericFailure();

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        invitation_id: invitation.id,
        locale: body.locale,
      },
    });
  if (createError || !created.user) {
    // Existing Auth accounts must sign in and use the explicit existing-parent
    // linking workflow; never mutate or move their role/tenant here.
    if (
      createError?.message.toLowerCase().includes("already") ||
      createError?.message.toLowerCase().includes("registered")
    ) {
      return jsonResponse(
        {
          success: false,
          errorCode: "ACCOUNT_EXISTS",
          error:
            "An account already exists for this email. Sign in and ask an administrator to verify the link.",
        },
        409
      );
    }
    return genericFailure();
  }

  const userId = created.user.id;
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id,role,institution_id,is_active")
    .eq("id", userId)
    .maybeSingle();
  const { data: finalized, error: finalizeError } = await service.rpc(
    "finalize_invitation_acceptance",
    {
      p_invitation_id: invitation.id,
      p_user_id: userId,
    }
  );
  if (
    profileError ||
    !profile ||
    profile.role !== "parent" ||
    profile.institution_id !== invitation.institution_id ||
    !finalized ||
    finalizeError
  ) {
    await service.auth.admin.deleteUser(userId);
    return genericFailure();
  }

  return jsonResponse({ success: true, requiresLogin: true });
};

Deno.serve(handler);

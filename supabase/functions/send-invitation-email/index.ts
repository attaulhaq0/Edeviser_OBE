import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { authenticateRequest } from "../_shared/auth.ts";
import {
  appUrl,
  canSendTo,
  fromAddress,
  generateToken,
  hashToken,
  invitationCorsHeaders,
  isEmail,
  jsonResponse,
  maskEmail,
  normalizeEmail,
  readEmailMode,
  replyTo,
} from "../_shared/invitation.ts";

const InviteRoleSchema = z.enum([
  "coordinator",
  "teacher",
  "student",
  "parent",
]);
type InviteRole = z.infer<typeof InviteRoleSchema>;

const InviteRequestSchema = z
  .object({
    invites: z
      .array(
        z
          .object({
            email: z.string().trim().email().max(320),
            role: InviteRoleSchema,
          })
          .strict()
      )
      .min(1)
      .max(100),
  })
  .strict();
type InviteRequest = z.infer<typeof InviteRequestSchema>;

interface InvitationResult {
  email: string;
  success: boolean;
  invitationId?: string;
  deliveryStatus?: string;
  errorCode?: string;
  message?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sendResendEmail = async (params: {
  recipient: string;
  institutionName: string;
  role: InviteRole;
  link: string;
}): Promise<
  { ok: true; messageId: string } | { ok: false; message: string }
> => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey)
    return { ok: false, message: "Email provider is not configured" };

  const reply = replyTo();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      ...(reply ? { reply_to: reply } : {}),
      to: [params.recipient],
      subject: `You're invited to join ${params.institutionName} on Edeviser`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h1>Welcome to Edeviser</h1>
        <p>You have been invited to join <strong>${escapeHtml(
          params.institutionName
        )}</strong> as a <strong>${escapeHtml(params.role)}</strong>.</p>
        <p><a href="${escapeHtml(params.link)}">Accept your invitation</a></p>
        <p>This invitation expires in seven days.</p>
      </div>`,
    }),
  });

  if (!response.ok) {
    // Provider details are intentionally not returned to the browser.
    return {
      ok: false,
      message: `Provider rejected the email (${response.status})`,
    };
  }
  const payload = (await response.json()) as { id?: unknown };
  return typeof payload.id === "string"
    ? { ok: true, messageId: payload.id }
    : { ok: false, message: "Provider did not return a message id" };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: invitationCorsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await authenticateRequest(req);
  if (!auth.user)
    return jsonResponse({ error: auth.error ?? "Unauthorized" }, 401);
  if (auth.user.role !== "admin")
    return jsonResponse({ error: "Admin permission required" }, 403);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const parsedBody = InviteRequestSchema.safeParse(rawBody);
  if (!parsedBody.success)
    return jsonResponse({ error: "Invalid invitation payload" }, 400);
  const body: InviteRequest = parsedBody.data;

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const mode = readEmailMode();
  const baseIdempotency =
    req.headers.get("x-idempotency-key")?.trim() ?? crypto.randomUUID();
  const results: InvitationResult[] = [];

  for (const invite of body.invites) {
    const email = normalizeEmail(invite?.email);
    const role = invite?.role;
    if (!isEmail(email)) {
      results.push({
        email: maskEmail(email),
        success: false,
        errorCode: "INVALID_EMAIL",
        message: "Invitation could not be sent",
      });
      continue;
    }
    if (
      !role ||
      !["coordinator", "teacher", "student", "parent"].includes(role)
    ) {
      results.push({
        email: maskEmail(email),
        success: false,
        errorCode: "INVALID_ROLE",
        message: "Invitation could not be sent",
      });
      continue;
    }

    const rawToken = generateToken();
    const tokenHash = await hashToken(rawToken);
    const idempotencyKey = `${baseIdempotency}:${email}:${role}`;
    const { data: created, error: createError } = await service.rpc(
      "create_invitation",
      {
        p_actor_id: auth.user.id,
        p_email: email,
        p_role: role,
        p_token_hash: tokenHash,
        p_idempotency_key: idempotencyKey,
      }
    );
    if (createError || !created) {
      const message = createError?.message ?? "Invitation could not be created";
      results.push({
        email: maskEmail(email),
        success: false,
        errorCode: message.includes("duplicate")
          ? "DUPLICATE_INVITATION"
          : "INVITATION_CREATE_FAILED",
        message: "Invitation could not be sent",
      });
      continue;
    }

    const record = created as {
      invitation_id?: string;
      institution_id?: string;
      institution_name?: string;
      recipient_email?: string;
    };
    const invitationId = record.invitation_id;
    if (!invitationId || !record.institution_id) {
      results.push({
        email: maskEmail(email),
        success: false,
        errorCode: "INVITATION_CREATE_FAILED",
        message: "Invitation could not be sent",
      });
      continue;
    }

    const { data: delivery, error: deliveryError } = await service
      .from("email_deliveries")
      .upsert(
        {
          institution_id: record.institution_id,
          recipient_email: email,
          email_type: "invitation",
          entity_type: "invitation",
          entity_id: invitationId,
          provider: "resend",
          status: mode === "disabled" ? "cancelled" : "queued",
          attempt_count: 0,
          idempotency_key: idempotencyKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider,idempotency_key" }
      )
      .select("id,status,provider_message_id")
      .single();
    if (deliveryError || !delivery) {
      results.push({
        email: maskEmail(email),
        success: false,
        invitationId,
        errorCode: "DELIVERY_RECORD_FAILED",
        message: "Invitation could not be sent",
      });
      continue;
    }

    if (mode === "disabled") {
      results.push({
        email: maskEmail(email),
        success: false,
        invitationId,
        deliveryStatus: "cancelled",
        errorCode: "EMAIL_DISABLED",
        message: "Email sending is disabled",
      });
      continue;
    }
    if (!canSendTo(email, mode)) {
      await service
        .from("email_deliveries")
        .update({
          status: "cancelled",
          last_error_code: "EMAIL_NOT_ALLOWLISTED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
      results.push({
        email: maskEmail(email),
        success: false,
        invitationId,
        deliveryStatus: "cancelled",
        errorCode: "EMAIL_NOT_ALLOWLISTED",
        message: "Recipient is not allowlisted for sandbox email",
      });
      continue;
    }

    const sent = await sendResendEmail({
      recipient: email,
      institutionName: record.institution_name ?? "your institution",
      role,
      link: `${appUrl()}/accept-invite/${rawToken}`,
    });
    if (!sent.ok) {
      await service
        .from("email_deliveries")
        .update({
          status: "failed",
          attempt_count: 1,
          failed_at: new Date().toISOString(),
          last_error_code: "EMAIL_SEND_FAILED",
          last_error_message: sent.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
      results.push({
        email: maskEmail(email),
        success: false,
        invitationId,
        deliveryStatus: "failed",
        errorCode: "EMAIL_SEND_FAILED",
        message: "Invitation could not be sent",
      });
      continue;
    }

    await service
      .from("email_deliveries")
      .update({
        status: "sent",
        attempt_count: 1,
        provider_message_id: sent.messageId,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);
    await service.rpc("mark_invitation_sent", {
      p_invitation_id: invitationId,
      p_provider_message_id: sent.messageId,
    });
    results.push({
      email: maskEmail(email),
      success: true,
      invitationId,
      deliveryStatus: "sent",
    });
  }

  const sent = results.filter((result) => result.success).length;
  return jsonResponse(
    {
      success: sent === results.length,
      requested: results.length,
      sent,
      failed: results.length - sent,
      results,
    },
    sent === results.length ? 200 : 207
  );
};

Deno.serve(handler);

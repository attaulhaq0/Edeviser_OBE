import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { authenticateRequest } from "../_shared/auth.ts";
import { getManagedServerKey } from "../_shared/serverSecret.ts";
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

const RelationshipSchema = z.enum(["mother", "father", "guardian", "other"]);
type Relationship = z.infer<typeof RelationshipSchema>;

const ParentLinkRequestSchema = z
  .object({
    action: z.enum([
      "invite",
      "link_existing",
      "verify",
      "reject",
      "revoke",
      "change_relationship",
    ]),
    student_id: z.string().uuid().optional(),
    parent_id: z.string().uuid().optional(),
    parent_email: z.string().trim().email().max(320).optional(),
    relationship: RelationshipSchema.optional(),
    relationship_label: z.string().trim().max(120).optional(),
    link_id: z.string().uuid().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();
type ParentLinkRequest = z.infer<typeof ParentLinkRequestSchema>;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const sendParentEmail = async (params: {
  email: string;
  studentName: string;
  link: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> => {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, message: "Email provider is not configured" };
  const reply = replyTo();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      ...(reply ? { reply_to: reply } : {}),
      to: [params.email],
      subject: `Connect your Edeviser family account to ${params.studentName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>Edeviser family access</h1><p>An administrator invited you to connect to <strong>${escapeHtml(
        params.studentName
      )}</strong>.</p><p><a href="${escapeHtml(
        params.link
      )}">Accept invitation</a></p><p>This invitation expires in seven days.</p></div>`,
    }),
  });
  if (!response.ok)
    return {
      ok: false,
      message: `Provider rejected the email (${response.status})`,
    };
  const payload = (await response.json()) as { id?: unknown };
  return typeof payload.id === "string"
    ? { ok: true, id: payload.id }
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
  const parsedBody = ParentLinkRequestSchema.safeParse(rawBody);
  if (!parsedBody.success)
    return jsonResponse({ error: "Invalid parent-link payload" }, 400);
  const body: ParentLinkRequest = parsedBody.data;

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    getManagedServerKey()
  );

  if (body.action === "link_existing") {
    if (!body.student_id || !body.parent_id || !body.relationship)
      return jsonResponse(
        { error: "Student, parent and relationship are required" },
        400
      );
    const { data, error } = await service.rpc("link_existing_parent", {
      p_actor_id: auth.user.id,
      p_student_id: body.student_id,
      p_parent_id: body.parent_id,
      p_relationship: body.relationship,
      p_relationship_label: body.relationship_label ?? null,
    });
    if (error)
      return jsonResponse(
        {
          error: "Parent link could not be created",
          code: error.message.includes("cross")
            ? "CROSS_INSTITUTION"
            : "LINK_CREATE_FAILED",
        },
        403
      );
    return jsonResponse({
      success: true,
      ...((data ?? {}) as Record<string, unknown>),
    });
  }

  if (
    ["verify", "reject", "revoke", "change_relationship"].includes(body.action)
  ) {
    if (!body.link_id)
      return jsonResponse({ error: "Link id is required" }, 400);
    const { data, error } = await service.rpc("admin_update_parent_link", {
      p_actor_id: auth.user.id,
      p_link_id: body.link_id,
      p_action: body.action,
      p_relationship: body.relationship ?? null,
      p_relationship_label: body.relationship_label ?? null,
      p_reason: body.reason ?? null,
    });
    if (error)
      return jsonResponse(
        {
          error: "Parent link could not be updated",
          code: "LINK_UPDATE_FAILED",
        },
        403
      );
    return jsonResponse({
      success: true,
      ...((data ?? {}) as Record<string, unknown>),
    });
  }

  if (body.action !== "invite")
    return jsonResponse({ error: "Unsupported parent-link action" }, 400);
  const email = normalizeEmail(body.parent_email);
  if (!body.student_id || !isEmail(email) || !body.relationship)
    return jsonResponse(
      { error: "Student, valid parent email and relationship are required" },
      400
    );
  if (body.relationship === "other" && !body.relationship_label?.trim())
    return jsonResponse(
      { error: "A label is required for other relationships" },
      400
    );

  const mode = readEmailMode();
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const idempotencyKey =
    req.headers.get("x-idempotency-key")?.trim() ?? crypto.randomUUID();
  const { data: created, error: createError } = await service.rpc(
    "create_parent_link_invitation",
    {
      p_actor_id: auth.user.id,
      p_student_id: body.student_id,
      p_email: email,
      p_relationship: body.relationship,
      p_relationship_label: body.relationship_label ?? null,
      p_token_hash: tokenHash,
      p_idempotency_key: idempotencyKey,
    }
  );
  if (createError || !created)
    return jsonResponse(
      {
        error: "Parent invitation could not be created",
        code: createError?.message.includes("duplicate")
          ? "DUPLICATE_LINK_OR_INVITATION"
          : "INVITATION_CREATE_FAILED",
      },
      409
    );
  const record = created as {
    invitation_id?: string;
    link_id?: string;
    institution_id?: string;
    recipient_email?: string;
    student_name?: string;
    send_required?: boolean;
  };
  if (!record.link_id)
    return jsonResponse(
      { error: "Parent relationship could not be created" },
      500
    );
  if (
    !record.send_required ||
    !record.invitation_id ||
    !record.institution_id
  ) {
    return jsonResponse({
      success: true,
      status: "pending_verification",
      linkId: record.link_id,
      existingParent: true,
      deliveryStatus: "not_required",
    });
  }

  const { data: delivery, error: deliveryError } = await service
    .from("email_deliveries")
    .insert({
      institution_id: record.institution_id,
      recipient_email: email,
      email_type: "parent_invitation",
      entity_type: "invitation",
      entity_id: record.invitation_id,
      provider: "resend",
      status: mode === "disabled" ? "cancelled" : "queued",
      idempotency_key: idempotencyKey,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (deliveryError || !delivery)
    return jsonResponse(
      {
        error: "Delivery record could not be created",
        code: "DELIVERY_RECORD_FAILED",
      },
      500
    );
  if (mode === "disabled")
    return jsonResponse(
      {
        success: false,
        linkId: record.link_id,
        invitationId: record.invitation_id,
        deliveryStatus: "cancelled",
        errorCode: "EMAIL_DISABLED",
        message: "Email sending is disabled",
      },
      503
    );
  if (!canSendTo(email, mode)) {
    await service
      .from("email_deliveries")
      .update({
        status: "cancelled",
        last_error_code: "EMAIL_NOT_ALLOWLISTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);
    return jsonResponse(
      {
        success: false,
        linkId: record.link_id,
        invitationId: record.invitation_id,
        deliveryStatus: "cancelled",
        errorCode: "EMAIL_NOT_ALLOWLISTED",
        message: "Recipient is not allowlisted for sandbox email",
      },
      403
    );
  }

  const sent = await sendParentEmail({
    email,
    studentName: record.student_name ?? "your student",
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
    return jsonResponse(
      {
        success: false,
        linkId: record.link_id,
        invitationId: record.invitation_id,
        deliveryStatus: "failed",
        errorCode: "EMAIL_SEND_FAILED",
        message: "Parent invitation could not be sent",
      },
      502
    );
  }
  await service
    .from("email_deliveries")
    .update({
      status: "sent",
      attempt_count: 1,
      provider_message_id: sent.id,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", delivery.id);
  await service.rpc("mark_invitation_sent", {
    p_invitation_id: record.invitation_id,
    p_provider_message_id: sent.id,
  });
  return jsonResponse({
    success: true,
    linkId: record.link_id,
    invitationId: record.invitation_id,
    recipient: maskEmail(email),
    deliveryStatus: "sent",
  });
};

Deno.serve(handler);

import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invitationCorsHeaders, jsonResponse } from "../_shared/invitation.ts";

const MAX_SKEW_SECONDS = 300;

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const timingSafeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1)
    result |= left[index] ^ right[index];
  return result === 0;
};

const verifySignature = async (
  body: string,
  req: Request
): Promise<boolean> => {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
  const webhookId = req.headers.get("svix-id") ?? "";
  const timestamp = req.headers.get("svix-timestamp") ?? "";
  const signatures = req.headers.get("svix-signature") ?? "";
  if (!secret || !webhookId || !timestamp || !signatures) return false;
  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_SKEW_SECONDS
  )
    return false;
  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase64(encodedSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signedContent = `${webhookId}.${timestamp}.${body}`;
  const provided = signatures
    .split(" ")
    .map((value) => value.split(","))
    .filter(([version, value]) => version === "v1" && value)
    .map(([, value]) => decodeBase64(value));
  const signedBytes = new TextEncoder().encode(signedContent);
  for (const candidate of provided) {
    if (await crypto.subtle.verify("HMAC", key, candidate, signedBytes)) {
      return true;
    }
  }
  return false;
};

const mapStatus = (eventType: string): string | null => {
  const map: Record<string, string> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.failed": "failed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.suppressed": "suppressed",
  };
  return map[eventType] ?? null;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: invitationCorsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  const body = await req.text();
  if (!(await verifySignature(body, req)))
    return jsonResponse({ error: "Invalid webhook signature" }, 401);

  let payload: { type?: unknown; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(body) as {
      type?: unknown;
      data?: Record<string, unknown>;
    };
  } catch {
    return jsonResponse({ error: "Invalid webhook payload" }, 400);
  }
  const eventType = typeof payload.type === "string" ? payload.type : "";
  const status = mapStatus(eventType);
  const eventId = req.headers.get("svix-id") ?? "";
  const providerMessageId =
    typeof payload.data?.email_id === "string"
      ? payload.data.email_id
      : typeof payload.data?.id === "string"
      ? payload.data.id
      : "";
  if (!status || !providerMessageId)
    return jsonResponse({ success: true, ignored: true });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    getManagedServerKey()
  );
  const { data: insertedEvent, error: insertError } = await service
    .from("email_delivery_events")
    .insert({
      provider: "resend",
      provider_event_id: eventId,
      event_type: eventType,
      status,
      safe_metadata: {
        provider_message_id: providerMessageId,
        reason:
          typeof payload.data?.reason === "string"
            ? payload.data.reason.slice(0, 200)
            : undefined,
      },
    })
    .select("id")
    .maybeSingle();
  if (insertError?.code === "23505")
    return jsonResponse({ success: true, replay: true });
  if (insertError || !insertedEvent)
    return jsonResponse({ error: "Webhook event could not be recorded" }, 500);

  const now = new Date().toISOString();
  const timestamps: Record<string, string> = { updated_at: now, status };
  if (status === "delivered") timestamps.delivered_at = now;
  if (status === "delayed") timestamps.delayed_at = now;
  if (status === "failed") timestamps.failed_at = now;
  if (status === "bounced") timestamps.bounced_at = now;
  if (status === "complained") timestamps.complained_at = now;
  if (status === "suppressed") timestamps.suppressed_at = now;
  const { data: delivery, error: deliveryError } = await service
    .from("email_deliveries")
    .update(timestamps)
    .eq("provider", "resend")
    .eq("provider_message_id", providerMessageId)
    .select("id")
    .maybeSingle();
  if (deliveryError)
    return jsonResponse({ error: "Delivery could not be updated" }, 500);
  return jsonResponse({
    success: true,
    recorded: true,
    matched: Boolean(delivery),
  });
};

Deno.serve(handler);

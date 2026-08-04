import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const invitationCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

export type SupabaseClient = ReturnType<typeof createClient>;

export const jsonResponse = (
  body: Record<string, unknown>,
  status = 200
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...invitationCorsHeaders, "Content-Type": "application/json" },
  });

export const normalizeEmail = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isEmail = (value: string): boolean =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@", 2);
  if (!domain) return "***";
  return `${local?.slice(0, 1) ?? "*"}***@${domain}`;
};

export const hashToken = async (token: string): Promise<string> => {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const generateToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export type EmailMode = "disabled" | "sandbox" | "production";

export const readEmailMode = (): EmailMode => {
  const value = (Deno.env.get("EMAIL_MODE") ?? "disabled").toLowerCase();
  if (value === "sandbox" || value === "production") return value;
  return "disabled";
};

export const allowlistedRecipients = (): Set<string> =>
  new Set(
    (Deno.env.get("EMAIL_ALLOWLIST") ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean)
  );

export const canSendTo = (email: string, mode: EmailMode): boolean =>
  mode === "production" ||
  (mode === "sandbox" && allowlistedRecipients().has(normalizeEmail(email)));

export const appUrl = (): string =>
  (Deno.env.get("APP_URL") ?? "https://app.edeviser.com")
    .trim()
    .replace(/\/$/, "");

export const fromAddress = (): string =>
  Deno.env.get("EMAIL_FROM") ?? "Edeviser <team@edeviser.com>";

export const replyTo = (): string | undefined => {
  const value = Deno.env.get("EMAIL_REPLY_TO")?.trim();
  return value || undefined;
};

export const safeError = (error: unknown): string => {
  if (error instanceof Error) return error.message.slice(0, 240);
  return "Unexpected invitation error";
};

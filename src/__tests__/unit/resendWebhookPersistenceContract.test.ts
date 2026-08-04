import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const read = (relativePath: string): string =>
  readFileSync(resolve(root, relativePath), "utf8");

const migration = read(
  "supabase/migrations/20260804111923_add_invitation_delivery_schema.sql"
);
const webhook = read("supabase/functions/resend-webhook/index.ts");

describe("Resend webhook persistence contract", () => {
  it("writes only columns created by the invitation delivery migration", () => {
    expect(migration).toContain("payload jsonb NOT NULL");
    expect(migration).toContain("delivery_id uuid");
    expect(webhook).toContain("delivery_id: matchedDelivery?.id ?? null");
    expect(webhook).toContain("payload: {");
    expect(webhook).not.toContain("safe_metadata:");
    expect(webhook).not.toContain("delivered_at");
    expect(webhook).not.toContain("delayed_at");
    expect(webhook).not.toContain("bounced_at");
    expect(webhook).not.toContain("complained_at");
    expect(webhook).not.toContain("suppressed_at");
  });

  it("keeps delivery matching, replay protection, and signature checks fail-closed", () => {
    expect(webhook).toContain('.eq("provider_message_id", providerMessageId)');
    expect(webhook).toContain('if (insertError?.code === "23505")');
    expect(webhook).toContain(
      "return jsonResponse({ success: true, replay: true })"
    );
    expect(webhook).toContain("if (!(await verifySignature(body, req)))");
    expect(webhook).toContain(
      'jsonResponse({ error: "Invalid webhook signature" }, 401)'
    );
  });
});

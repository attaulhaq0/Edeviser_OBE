import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const read = (relativePath: string): string =>
  readFileSync(resolve(root, relativePath), "utf8");

const config = read("supabase/config.toml");
const notification = read(
  "supabase/functions/send-email-notification/index.ts"
);
const invitations = read("supabase/functions/send-invitation-email/index.ts");
const sharedAuth = read("supabase/functions/_shared/auth.ts");
const webhook = read("supabase/functions/resend-webhook/index.ts");

const functionJwtSetting = (name: string): string | null => {
  const section = config.match(
    new RegExp(`\\[functions\\.${name}\\]([\\s\\S]*?)(?=\\n\\[|$)`)
  )?.[1];
  return section?.match(/verify_jwt\s*=\s*(true|false)/)?.[1] ?? null;
};

describe("email function authentication contract", () => {
  it("keeps both email endpoints behind the Supabase JWT gateway", () => {
    expect(functionJwtSetting("send-email-notification")).toBe("true");
    expect(functionJwtSetting("send-invitation-email")).toBe("true");
  });

  it("accepts a valid user JWT and applies the application role gate", () => {
    expect(notification).toContain("await userClient.auth.getUser()");
    expect(notification).toMatch(/role !== ["']admin["']/);
    expect(invitations).toContain("authenticateRequest(req)");
    expect(invitations).toContain('auth.user.role !== "admin"');
  });

  it("returns 401 for missing or invalid user authentication", () => {
    expect(sharedAuth).toContain('"Missing authorization header"');
    expect(sharedAuth).toContain('"Unauthorized"');
    expect(notification).toContain("status: 401");
    expect(invitations).toContain(
      'jsonResponse({ error: auth.error ?? "Unauthorized" }, 401)'
    );
  });

  it("keeps tenant and role authorization server-side", () => {
    expect(sharedAuth).toContain('.select("role, institution_id, is_active")');
    expect(sharedAuth).toContain("callerProfile.is_active !== true");
    expect(sharedAuth).toContain(
      'typeof callerProfile.institution_id !== "string"'
    );
    expect(sharedAuth).toContain("getManagedServerKey()");
    expect(notification).toContain('role !== "admin"');
    expect(invitations).toContain('auth.user.role !== "admin"');
  });

  it("keeps the internal path explicit and webhook verification fail-closed", () => {
    expect(notification).toContain("isServiceRole");
    expect(notification).toContain('authHeader.replace("Bearer ", "")');
    expect(webhook).toContain("if (!(await verifySignature(body, req)))");
    expect(webhook).toContain(
      'jsonResponse({ error: "Invalid webhook signature" }, 401)'
    );
  });

  it("does not treat a non-JWT managed secret as a gateway bearer token", () => {
    expect(notification).toContain("getManagedServerKey()");
    expect(sharedAuth).toContain("getManagedServerKey()");
    expect(config).toContain("verify_jwt = true");
  });
});

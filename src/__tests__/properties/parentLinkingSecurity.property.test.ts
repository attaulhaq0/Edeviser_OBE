import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Parent linking security invariants", () => {
  it("keeps parent provisioning on the server-side function", () => {
    const page = read("src/pages/admin/users/ParentInvitePage.tsx");
    expect(page).toContain('"parent-link"');
    expect(page).not.toContain("auth.admin.createUser");
    expect(page).not.toContain('from("parent_student_links").insert');
  });

  it("does not submit tenant or role claims from invitation acceptance", () => {
    const page = read("src/pages/auth/AcceptInvitePage.tsx");
    expect(page).toContain('"accept-invitation"');
    expect(page).not.toContain("institution_id");
    expect(page).not.toContain("requestedRole");
  });

  it("uses hashed tokens and the canonical application/email configuration", () => {
    const invitation = read(
      "supabase/functions/send-invitation-email/index.ts"
    );
    const shared = read("supabase/functions/_shared/invitation.ts");
    expect(invitation).toContain("hashToken");
    expect(invitation).toContain("appUrl()");
    expect(invitation).not.toContain("RESEND_FROM_ADDRESS");
    expect(shared).toContain('Deno.env.get("EMAIL_FROM")');
    expect(shared).toContain('Deno.env.get("APP_URL")');
  });

  it("keeps the reusable parent implementation tenant-agnostic", () => {
    const functionSource = read("supabase/functions/parent-link/index.ts");
    const page = read("src/pages/admin/users/ParentInvitePage.tsx");
    for (const tenantId of [
      "9fb38246-8bad-4372-acf7-e2d17558f2d0",
      "00000000-0000-0000-0000-000000000001",
      "4de6a0a2-758b-47f3-ab7e-984bb974d88b",
    ]) {
      expect(functionSource).not.toContain(tenantId);
      expect(page).not.toContain(tenantId);
    }
  });
});

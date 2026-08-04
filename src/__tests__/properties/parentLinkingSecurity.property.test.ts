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

  it("derives AI tenant scope from active profiles rather than JWT metadata", () => {
    const tutor = read("supabase/functions/chat-with-tutor/index.ts");
    const accreditation = read(
      "supabase/functions/generate-accreditation-report/index.ts"
    );
    expect(tutor).toContain('.from("profiles")');
    expect(tutor).toContain('select("institution_id, role, is_active")');
    expect(tutor).not.toContain("user.app_metadata?.institution_id");
    expect(tutor).not.toContain("user.user_metadata?.institution_id");
    expect(accreditation).not.toContain("user.app_metadata?.institution_id");
    expect(accreditation).not.toContain("user.user_metadata?.institution_id");
  });

  it("uses APP_URL for scheduled links instead of deriving a Vercel URL from Supabase", () => {
    for (const file of [
      "supabase/functions/weekly-summary-cron/index.ts",
      "supabase/functions/streak-risk-cron/index.ts",
      "supabase/functions/export-student-data/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("app.edeviser.com");
      expect(source).not.toContain('replace(".supabase.co", ".vercel.app")');
      expect(source).not.toContain("https://edeviser.vercel.app");
    }
  });

  it("keeps invitation tenant derivation on the server and preserves partial outcomes", () => {
    const hook = read("src/hooks/useInviteUsers.ts");
    const page = read("src/pages/admin/users/InviteUsersPage.tsx");
    expect(hook).toContain('body: { invites: request.invites }');
    expect(hook).not.toContain("institution_id: request.institution_id");
    expect(hook).toContain("InvitationResponse");
    expect(page).toContain("response.results[index]");
  });
});

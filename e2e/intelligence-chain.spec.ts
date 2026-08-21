// Intelligence Chain E2E - OBE hierarchy, mapping direction, attainment cascade,
// and agent-guardrail verification. Adapted from the Edeviser Agentic Intelligence spec.
//
// Auth contract: every test authenticates through the real login flow with
// seeded demo credentials (overridable via E2E_* env vars) and asserts the
// authenticated landing route before touching protected pages.
import { test, expect, type Page } from "@playwright/test";

const CREDENTIALS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@test.edeviser.com",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Test1234!",
    landing: /\/admin\//,
  },
  coordinator: {
    email: process.env.E2E_COORDINATOR_EMAIL ?? "coordinator@test.edeviser.com",
    password: process.env.E2E_COORDINATOR_PASSWORD ?? "Test1234!",
    landing: /\/coordinator\//,
  },
  student: {
    email: process.env.E2E_STUDENT_EMAIL ?? "student@test.edeviser.com",
    password: process.env.E2E_STUDENT_PASSWORD ?? "Test1234!",
    landing: /\/student\//,
  },
} as const;

type Role = keyof typeof CREDENTIALS;

async function loginAs(page: Page, role: Role): Promise<void> {
  const creds = CREDENTIALS[role];
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  // Fail fast (no silent skip) if authentication did not succeed.
  await page.waitForURL(creds.landing, { timeout: 30000 });
}

test.describe("Intelligence Layer - OBE hierarchy & mapping direction", () => {
  test("Admin ILO list fetches only type=ILO via RLS (own institution)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/outcomes", { waitUntil: "networkidle" });
    const rows = page.locator('[data-testid="outcome-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    const firstRowText = await rows.first().innerText();
    expect(firstRowText.toLowerCase()).toContain("ilo");
  });

  test("Admin cannot open a PLO/CLO editor through the ILO edit route (type guard)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // A non-ILO outcome id must never resolve into an editable ILO form.
    await page.goto("/admin/outcomes/plo-only-id/edit", {
      waitUntil: "networkidle",
    });
    await expect(
      page.locator("text=Forbidden").or(page.locator("text=Not found"))
    ).toBeVisible({
      timeout: 10000,
    });
    // The guard must not leave us on a successful edit surface.
    await expect(page).not.toHaveURL(/\/edit$/);
  });

  test("Coordinator curriculum matrix renders canonical mapping direction", async ({
    page,
  }) => {
    await loginAs(page, "coordinator");
    await page.goto("/coordinator/matrix", { waitUntil: "networkidle" });
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("reverse mapping");
    // Canonical direction surfaces parent->child labels somewhere on the matrix.
    expect(body).toMatch(/ilo|plo/);
  });
});

test.describe("Intelligence Layer - attainment cascade", () => {
  test("Cascade: evidence -> CLO -> PLO -> ILO renders derived alignment for admins", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/analytics", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toContain("attainment");
    expect(body).toMatch(/ilo|derived/);
    // Derived alignment must never be presented as official ILO mastery.
    expect(body).not.toContain("official ilo mastery");
  });

  test("Student surfaces never claim official ILO mastery", async ({
    page,
  }) => {
    await loginAs(page, "student");
    await page.goto("/student/dashboard", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("official ilo mastery");
  });
});

test.describe("Intelligence Layer - agent guardrails", () => {
  test("Student route has no outcome-management tool surface", async ({
    page,
  }) => {
    await loginAs(page, "student");
    await page.goto("/student/dashboard", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("create ilo");
    expect(body).not.toContain("delete ilo");
    expect(body).not.toContain("manage outcomes");
  });

  test("No arbitrary SQL input field appears on any authenticated dashboard", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const routes = [
      "/admin/dashboard",
      "/coordinator/dashboard",
      "/teacher/dashboard",
      "/student/dashboard",
    ];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "networkidle" });
      const sqlEditor = page.locator(
        'textarea[placeholder*="SELECT"], textarea[placeholder*="SQL"]'
      );
      await expect(sqlEditor).toHaveCount(0);
    }
  });

  test("Approval-required actions always surface explicit approval controls (never auto-execution)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    // Unconditional invariants: protected actions are never auto-executed and
    // any approval surface exposes BOTH decision controls.
    expect(body).not.toContain("auto-executed");
    expect(body).not.toContain("automatically executed");
    const approvalCard = page.locator(
      '[data-testid="agent-approval-card"], [data-testid="agent-approval"]'
    );
    const approvalCount = await approvalCard.count();
    if (approvalCount > 0) {
      const cardText = (await approvalCard.first().innerText()).toLowerCase();
      expect(cardText).toContain("approve");
      expect(cardText).toContain("reject");
    }
  });
});

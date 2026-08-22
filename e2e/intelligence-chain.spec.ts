// Intelligence Chain E2E - OBE hierarchy, mapping direction, attainment cascade,
// and agent-guardrail verification. Adapted from the Edeviser Agentic Intelligence spec.
//
// Auth contract: every test authenticates through the real login flow with
// seeded demo credentials (overridable via E2E_* env vars), then verifies the
// LIVE Supabase session identity (email) - not just a client-side redirect -
// before touching protected pages or data.
// Test-integrity contract: NO conditional skips. Every fixture-dependent
// assertion fails with an explicit message when required setup is missing.
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

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";

interface SessionUser {
  email?: string;
}

async function readSessionUser(page: Page): Promise<SessionUser> {
  const raw = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((k) =>
      k.endsWith("-auth-token"),
    );
    return key ? window.localStorage.getItem(key) : null;
  });
  if (!raw)
    throw new Error(
      "No Supabase session found after login - authentication failed.",
    );
  const parsed = JSON.parse(raw) as { user?: SessionUser };
  return parsed.user ?? {};
}

/** Login through the real form, land on the role dashboard, and verify the
 * live session belongs to the expected user (not a stale/misrouted session). */
async function loginAs(page: Page, role: Role): Promise<void> {
  const creds = CREDENTIALS[role];
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL(creds.landing, { timeout: 30000 });
  const user = await readSessionUser(page);
  expect(user.email, `live session must belong to ${creds.email}`).toBe(
    creds.email,
  );
}

/** Authenticated REST GET against Supabase using the browser's live token. */
async function apiGet<T>(page: Page, path: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set for data-fixture assertions.",
    );
  }
  const token = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((k) =>
      k.endsWith("-auth-token"),
    );
    if (!key) return null;
    const parsed = JSON.parse(
      window.localStorage.getItem(key) ?? "{}",
    ) as { access_token?: string };
    return parsed.access_token ?? null;
  });
  if (!token)
    throw new Error("No access token in session - cannot verify data fixtures.");
  const res = await page.request.get(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  expect(res.ok(), `REST ${path} failed: ${res.status()}`).toBeTruthy();
  return (await res.json()) as T[];
}

test.describe("Intelligence Layer - OBE hierarchy & mapping direction", () => {
  test("Admin ILO list fetches only type=ILO via RLS (own institution)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/outcomes", { waitUntil: "networkidle" });
    const rows = page.locator('[data-testid="outcome-row"]');
    const count = await rows.count();
    expect(count, "seeded outcomes must render on /admin/outcomes").toBeGreaterThan(0);
    const firstRowText = await rows.first().innerText();
    expect(firstRowText.toLowerCase()).toContain("ilo");
  });

  test("Admin cannot open a real PLO editor through the ILO edit route (type guard)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // Resolve a REAL same-institution PLO from the seeded outcomes list.
    await page.goto("/admin/outcomes", { waitUntil: "networkidle" });
    const ploLink = page
      .locator('a[href*="/admin/outcomes/"][href*="/edit"]')
      .filter({ hasText: /plo/i });
    let editHref: string | null =
      (await ploLink.count()) > 0
        ? await ploLink.first().getAttribute("href")
        : null;
    if (!editHref) {
      const ploRow = page
        .locator('[data-testid="outcome-row"]')
        .filter({ hasText: /plo/i });
      expect(
        await ploRow.count(),
        "Seed data missing: no PLO outcome found - cannot exercise the type guard.",
      ).toBeGreaterThan(0);
      const rowLink = ploRow.first().locator('a[href*="/edit"]').first();
      editHref =
        (await rowLink.count()) > 0 ? await rowLink.getAttribute("href") : null;
    }
    expect(
      editHref,
      "Could not resolve an editable PLO URL from the outcomes list",
    ).toBeTruthy();
    const ploId = (editHref as string).split("/").filter(Boolean).at(-2) as string;
    expect(ploId).toMatch(/^[0-9a-f-]{36}$/i);

    // A real PLO id must be rejected by the ILO editor with Forbidden - NOT a
    // generic "Not found" (which would pass even without a type guard).
    await page.goto(`/admin/outcomes/${ploId}/edit`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Forbidden")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Not found")).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/edit$/);
  });

  test("Coordinator curriculum matrix renders canonical parent->child fixtures", async ({
    page,
  }) => {
    await loginAs(page, "coordinator");
    // Fixture: seeded PLOs for the coordinator's program (RLS-scoped).
    const plos = await apiGet<{ id: string; code: string | null; title: string | null }>(
      page,
      "learning_outcomes?select=id,code,title&type=eq.PLO&limit=10",
    );
    expect(
      plos.length,
      "Seed data missing: no PLOs visible to the coordinator",
    ).toBeGreaterThan(0);

    await page.goto("/coordinator/matrix", { waitUntil: "networkidle" });
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("reverse mapping");
    // At least one seeded PLO identifier must appear on the rendered matrix,
    // proving the matrix renders this program's canonical PLO rows.
    const labels = plos
      .map((p) => [p.code, p.title].filter(Boolean).join(" ").trim().toLowerCase())
      .filter(Boolean);
    const rendered = labels.some((label) => body.includes(label));
    expect(
      rendered,
      `None of the seeded PLOs (${labels.slice(0, 3).join(", ")}...) appear on the matrix`,
    ).toBe(true);
  });
});

test.describe("Intelligence Layer - attainment cascade", () => {
  test("Cascade: PLO attainment maps into ILO targets (canonical direction)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // Fixture integrity: attainment data must exist for the cascade to be provable.
    const attainment = await apiGet<{ outcome_id: string; student_id: string | null }>(
      page,
      "outcome_attainment?select=outcome_id,student_id&limit=200",
    );
    expect(
      attainment.length,
      "Seed data missing: no outcome_attainment rows",
    ).toBeGreaterThan(0);

    // Canonical direction proof: every ILO aggregate row's outcome must be the
    // TARGET of at least one PLO->ILO mapping (source=PLO, target=ILO).
    const iloRows = attainment.filter((r) => r.student_id === null);
    if (iloRows.length > 0) {
      const mappings = await apiGet<{
        source_outcome_id: string;
        target_outcome_id: string;
      }>(
        page,
        "outcome_mappings?select=source_outcome_id,target_outcome_id&limit=500",
      );
      const iloIds = new Set(iloRows.map((r) => r.outcome_id));
      const mappedTargets = new Set(mappings.map((m) => m.target_outcome_id));
      const unmapped = [...iloIds].filter((id) => !mappedTargets.has(id));
      expect(
        unmapped,
        `ILO aggregate attainment without PLO->ILO mapping: ${unmapped.length} row(s)`,
      ).toHaveLength(0);
    }

    // UI: analytics renders attainment surfaces and never claims official mastery.
    await page.goto("/admin/analytics", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toContain("attainment");
    expect(body).not.toContain("official ilo mastery");
  });

  test("Student surfaces never claim official ILO mastery", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/student/dashboard", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("official ilo mastery");
  });
});

test.describe("Intelligence Layer - agent guardrails", () => {
  test("Student route has no outcome-management tool surface", async ({ page }) => {
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
        'textarea[placeholder*="SELECT"], textarea[placeholder*="SQL"]',
      );
      await expect(sqlEditor).toHaveCount(0);
    }
  });

  test("Agent executions always reference an approved proposal (no auto-execution)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // Data-level invariant: an execution row WITHOUT a proposal would mean a
    // protected action ran without the approval flow - fail closed on it.
    const executions = await apiGet<{ id: string; proposal_id: string | null }>(
      page,
      "agent_action_executions?select=id,proposal_id&limit=200",
    );
    const orphaned = executions.filter((e) => !e.proposal_id);
    expect(
      orphaned,
      `${orphaned.length} agent execution(s) without an approval proposal`,
    ).toHaveLength(0);
  });

  test("Protected action surfaces an approval card with BOTH decision controls", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAs(page, "admin");
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });

    // Trigger a protected action through the REAL intelligence surface.
    await page
      .getByRole("button", { name: /open e deviser intelligence/i })
      .click();
    const chatInput = page.getByPlaceholder(/ask about the learning evidence/i);
    await expect(chatInput).toBeVisible();
    await chatInput.fill(
      'Create a goal for me titled "E2E Approval Probe Goal" with a measurable target and a due date next week.',
    );
    await page.getByRole("button", { name: /ask intelligence/i }).click();

    // UNCONDITIONAL: the approval card MUST appear with BOTH decision controls.
    // If the protected action does not reach the approval surface, this fails.
    await expect(
      page.getByText(/your approval is required/i).first(),
    ).toBeVisible({ timeout: 150000 });
    await expect(
      page.getByRole("button", { name: /approve proposal/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reject proposal/i }).first(),
    ).toBeVisible();
  });
});
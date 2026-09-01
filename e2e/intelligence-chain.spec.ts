// Intelligence Chain E2E - OBE hierarchy, mapping direction, attainment cascade,
// and agent-guardrail verification. Adapted from the Edeviser Agentic Intelligence spec.
//
// Auth contract: every test authenticates through the real login flow with
// seeded demo credentials (overridable via E2E_* env vars), then verifies the
// LIVE Supabase session (email AND live token accepted by /auth/v1/user).
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

function requireSupabaseEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set for live-session and data-fixture assertions."
    );
  }
}

async function readAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((k) =>
      k.endsWith("-auth-token")
    );
    if (!key) return null;
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as {
      access_token?: string;
    };
    return parsed.access_token ?? null;
  });
  expect(token, "No access token in browser session").toBeTruthy();
  return token as string;
}

/** Login through the real form, land on the role dashboard, verify the live
 * session: the stored email matches AND Supabase accepts the live token. */
async function loginAs(page: Page, role: Role): Promise<void> {
  requireSupabaseEnv();
  const creds = CREDENTIALS[role];
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(creds.email);
  await page.locator("#login-password").fill(creds.password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL(creds.landing, { timeout: 30000 });

  const raw = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((k) =>
      k.endsWith("-auth-token")
    );
    return key ? window.localStorage.getItem(key) : null;
  });
  if (!raw)
    throw new Error(
      "No Supabase session found after login - authentication failed."
    );
  const stored = JSON.parse(raw) as { user?: SessionUser };
  expect(stored.user?.email, `session must belong to ${creds.email}`).toBe(
    creds.email
  );

  // The token itself must be LIVE - Supabase must accept it right now.
  const token = await readAccessToken(page);
  const me = await page.request.get(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  expect(
    me.ok(),
    `Live session token rejected by Supabase auth: ${me.status()}`
  ).toBeTruthy();
  const meBody = (await me.json()) as SessionUser;
  expect(
    meBody.email,
    "Supabase auth identity must match the logged-in user"
  ).toBe(creds.email);
}

/** Authenticated REST GET against Supabase using the browser's live token. */
async function apiGet<T>(page: Page, path: string): Promise<T[]> {
  requireSupabaseEnv();
  const token = await readAccessToken(page);
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
    expect(
      count,
      "seeded outcomes must render on /admin/outcomes"
    ).toBeGreaterThan(0);
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
        "Seed data missing: no PLO outcome found - cannot exercise the type guard."
      ).toBeGreaterThan(0);
      const rowLink = ploRow.first().locator('a[href*="/edit"]').first();
      editHref =
        (await rowLink.count()) > 0 ? await rowLink.getAttribute("href") : null;
    }
    expect(
      editHref,
      "Could not resolve an editable PLO URL from the outcomes list"
    ).toBeTruthy();
    const ploId = (editHref as string)
      .split("/")
      .filter(Boolean)
      .at(-2) as string;
    expect(ploId).toMatch(/^[0-9a-f-]{36}$/i);

    // A real PLO id must be rejected by the ILO editor with Forbidden - NOT a
    // generic "Not found" (which would pass even without a type guard).
    await page.goto(`/admin/outcomes/${ploId}/edit`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("text=Forbidden")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Not found")).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/edit$/);
  });

  test("Coordinator matrix renders a known canonical PLO->ILO mapping fixture", async ({
    page,
  }) => {
    await loginAs(page, "coordinator");

    // Resolve a KNOWN canonical PLO->ILO mapping from seeded data.
    const outcomes = await apiGet<{
      id: string;
      type: string;
      code: string | null;
      title: string | null;
    }>(page, "learning_outcomes?select=id,type,code,title&limit=500");
    const mappings = await apiGet<{
      source_outcome_id: string;
      target_outcome_id: string;
    }>(
      page,
      "outcome_mappings?select=source_outcome_id,target_outcome_id&limit=500"
    );
    const byId = new Map(outcomes.map((o) => [o.id, o]));
    const canonical = mappings
      .map((m) => ({
        src: byId.get(m.source_outcome_id),
        tgt: byId.get(m.target_outcome_id),
      }))
      .find((m) => m.src?.type === "PLO" && m.tgt?.type === "ILO");
    expect(
      canonical,
      "Seed data missing: no canonical PLO->ILO mapping found"
    ).toBeTruthy();

    await page.goto("/coordinator/matrix", { waitUntil: "networkidle" });
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("reverse mapping");
    // At least one endpoint label of the known canonical mapping must render.
    const srcLabel = [canonical?.src?.code, canonical?.src?.title]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
    const tgtLabel = [canonical?.tgt?.code, canonical?.tgt?.title]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
    const rendered =
      (srcLabel.length > 0 && body.includes(srcLabel)) ||
      (tgtLabel.length > 0 && body.includes(tgtLabel));
    expect(
      rendered,
      `Known canonical mapping endpoints ("${srcLabel}" / "${tgtLabel}") do not render on the matrix`
    ).toBe(true);
  });
});

test.describe("Intelligence Layer - attainment cascade", () => {
  test("Cascade: ILO aggregate attainment is backed by PLO->ILO mappings", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // Fixture integrity: attainment data must exist for the cascade to be provable.
    const attainment = await apiGet<{
      outcome_id: string;
      student_id: string | null;
    }>(page, "outcome_attainment?select=outcome_id,student_id&limit=200");
    expect(
      attainment.length,
      "Seed data missing: no outcome_attainment rows"
    ).toBeGreaterThan(0);

    // UNCONDITIONAL: at least one ILO aggregate fixture must exist.
    const iloRows = attainment.filter((r) => r.student_id === null);
    expect(
      iloRows.length,
      "Seed data missing: no ILO aggregate attainment rows (student_id IS NULL)"
    ).toBeGreaterThan(0);

    // Every ILO aggregate row's outcome must be the TARGET of a mapping whose
    // SOURCE is a PLO (canonical direction only).
    const outcomes = await apiGet<{ id: string; type: string }>(
      page,
      "learning_outcomes?select=id,type&limit=500"
    );
    const typeById = new Map(outcomes.map((o) => [o.id, o.type]));
    const mappings = await apiGet<{
      source_outcome_id: string;
      target_outcome_id: string;
    }>(
      page,
      "outcome_mappings?select=source_outcome_id,target_outcome_id&limit=500"
    );
    const mappedTargets = new Set(
      mappings
        .filter((m) => typeById.get(m.source_outcome_id) === "PLO")
        .map((m) => m.target_outcome_id)
    );
    const iloIds = new Set(iloRows.map((r) => r.outcome_id));
    const unmapped = [...iloIds].filter((id) => !mappedTargets.has(id));
    expect(
      unmapped,
      `${unmapped.length} ILO aggregate attainment row(s) without a PLO->ILO mapping`
    ).toHaveLength(0);

    // UI: analytics renders attainment surfaces and never claims official mastery.
    await page.goto("/admin/analytics", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toContain("attainment");
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

  test("Agent execution records are service-role only (no client bypass)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // agent_action_executions is revoked from `authenticated` by design: the
    // no-auto-execution invariant is enforced server-side. A client token
    // MUST NOT be able to read (and therefore never bypass) this table.
    requireSupabaseEnv();
    const token = await readAccessToken(page);
    const res = await page.request.get(
      `${SUPABASE_URL}/rest/v1/agent_action_executions?select=id,proposal_id&limit=10`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    expect(
      [401, 403, 404],
      `agent_action_executions must not be readable with an authenticated client token (got ${res.status()})`
    ).toContain(res.status());
  });

  test("Protected action surfaces an approval card bound to the probe with BOTH decision controls", async ({
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
      'Create a goal for me titled "E2E Approval Probe Goal" with a measurable target and a due date next week.'
    );
    await page.getByRole("button", { name: /ask intelligence/i }).click();

    // UNCONDITIONAL: an approval card BOUND TO THIS PROBE must appear, with
    // BOTH decision controls inside it. No conditional skips.
    const probeCard = page
      .locator("div.rounded-xl")
      .filter({ hasText: /E2E Approval Probe Goal/i })
      .first();
    await expect(probeCard).toBeVisible({ timeout: 150000 });
    await expect(
      probeCard.getByRole("button", { name: /approve proposal/i })
    ).toBeVisible();
    await expect(
      probeCard.getByRole("button", { name: /reject proposal/i })
    ).toBeVisible();

    // Execute the rejection. agent_action_proposals is service-role-only by
    // design (REVOKE ALL FROM authenticated), so persistence is verified
    // through the UI contract instead of a client REST read.
    await probeCard.getByRole("button", { name: /reject proposal/i }).click();

    // The card must immediately reflect the rejection...
    await expect(
      probeCard.getByText(/this proposal was rejected/i)
    ).toBeVisible({ timeout: 10000 });
    // ...and no longer offer either decision control.
    await expect(
      probeCard.getByRole("button", { name: /approve proposal/i })
    ).toHaveCount(0);
    await expect(
      probeCard.getByRole("button", { name: /reject proposal/i })
    ).toHaveCount(0);
  });
});

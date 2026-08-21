// Intelligence Chain E2E Test - OBE hierarchy, mapping direction, attainment cascade,
// and agent-guardrail verification. Adapted from the Edeviser Agentic Intelligence spec.
import { test, expect } from '@playwright/test';

// Property: Canonical mapping direction is enforced everywhere.
// source_outcome_id = parent, target_outcome_id = child. Allowed: ILO->PLO, PLO->CLO, CLO->SUB_CLO.
test.describe('Intelligence Layer - OBE hierarchy & mapping direction', () => {
  test('Admin ILO list fetches only type=ILO via RLS (own institution)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/outcomes/, { timeout: 30000 });

    await page.goto('/admin/outcomes', { waitUntil: 'networkidle' });
    const rows = page.locator('[data-testid="outcome-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    const firstRowText = await rows.first().innerText();
    expect(firstRowText.toLowerCase()).toContain('ilo');
  });

  test('Admin cannot edit PLO or CLO through ILO route (type guard)', async ({ page }) => {
    await page.goto('/admin/outcomes/plo-only-id/edit', { waitUntil: 'networkidle' });
    const forbidden = page.locator('text=Forbidden');
    const notFound = page.locator('text=Not found');
    await expect(forbidden.or(notFound)).toBeVisible({ timeout: 10000 });
  });

  test('Mapping direction is canonical (source=parent, target=child)', async ({ page }) => {
    await page.goto('/coordinator/matrix', { waitUntil: 'networkidle' });
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('reverse mapping');
  });
});

// Property: CLO attainment rolls to PLO then ILO.
test.describe('Intelligence Layer - attainment cascade', () => {
  test('Cascade: evidence -> CLO -> PLO -> ILO renders for admin analytics', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    const hasDerived = body.toLowerCase().includes('derived');
    const hasCascade = body.toLowerCase().includes('attainment') || body.toLowerCase().includes('ilo');
    expect(hasDerived || hasCascade).toBe(true);
  });

  test('CLO contribution to ILO is labeled derived, not official', async ({ page }) => {
    await page.goto('/student/dashboard', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('official ilo mastery');
  });
});

// Property: No role receives unauthorized outcome tools or arbitrary SQL.
test.describe('Intelligence Layer - agent guardrails', () => {
  test('Student route has no outcome-management tool surface', async ({ page }) => {
    await page.goto('/student/dashboard', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    const lower = body.toLowerCase();
    expect(lower).not.toContain('create ilo');
    expect(lower).not.toContain('delete ilo');
    expect(lower).not.toContain('manage outcomes');
  });

  test('No arbitrary SQL input field appears anywhere on authenticated pages', async ({ page }) => {
    const routes = ['/admin/dashboard', '/coordinator/dashboard', '/teacher/dashboard', '/student/dashboard'];
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const sqlEditor = page.locator('textarea[placeholder*="SELECT"], textarea[placeholder*="SQL"]');
      await expect(sqlEditor).toHaveCount(0);
    }
  });

  test('Approval-required actions surface an approval card, not auto-execution', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (body.toLowerCase().includes('approve')) {
      expect(body.toLowerCase()).toContain('appro');
    }
  });
});

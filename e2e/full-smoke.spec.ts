// =============================================================================
// Full Smoke E2E Test — Visits every public route, checks for JS errors,
// verifies the app renders without crashing after the latest push.
// =============================================================================
import { test, expect } from '@playwright/test';

// Public routes that don't require auth (will render or redirect to /login)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/reset-password',
  '/update-password',
  '/terms',
  '/privacy',
  '/portfolio/test-student-id',
];

// Auth-guarded routes — will redirect to /login but still exercise lazy imports
const GUARDED_ROUTES = [
  '/admin/dashboard',
  '/admin/users',
  '/admin/programs',
  '/admin/outcomes',
  '/admin/courses',
  '/admin/audit-log',
  '/admin/bonus-events',
  '/admin/semesters',
  '/admin/departments',
  '/admin/reports',
  '/admin/calendar',
  '/admin/timetable',
  '/admin/fees',
  '/admin/import',
  '/admin/surveys',
  '/admin/graduate-attributes',
  '/admin/competency-frameworks',
  '/admin/badges/spotlight',
  '/admin/settings/institution',
  '/coordinator/dashboard',
  '/coordinator/plos',
  '/coordinator/matrix',
  '/coordinator/cqi',
  '/coordinator/sankey',
  '/coordinator/gap-analysis',
  '/coordinator/coverage-heatmap',
  '/coordinator/trends',
  '/teacher/dashboard',
  '/teacher/clos',
  '/teacher/assignments',
  '/teacher/grading',
  '/teacher/announcements',
  '/teacher/attendance',
  '/teacher/gradebook',
  '/teacher/teams',
  '/teacher/challenges',
  '/student/dashboard',
  '/student/assignments',
  '/student/leaderboard',
  '/student/habits',
  '/student/xp-history',
  '/student/portfolio',
  '/student/challenges',
  '/student/team',
];

// ─── Test: Public routes render without JS errors ────────────────────────────

test.describe('Public route smoke tests', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} loads without JS errors`, async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));

      const response = await page.goto(route, { waitUntil: 'networkidle', timeout: 30000 });

      // Page should return a valid HTTP response (not 500)
      expect(response?.status()).toBeLessThan(500);

      // No uncaught JS errors
      expect(jsErrors).toEqual([]);

      // Page should have rendered something (not blank)
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(0);
    });
  }
});

// ─── Test: Guarded routes redirect to login without crashing ─────────────────

test.describe('Guarded route smoke tests (redirect to login)', () => {
  for (const route of GUARDED_ROUTES) {
    test(`${route} redirects without JS errors`, async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));

      await page.goto(route, { waitUntil: 'networkidle', timeout: 30000 });

      // Should redirect to login (unauthenticated)
      await expect(page).toHaveURL(/\/login/);

      // No uncaught JS errors during redirect
      expect(jsErrors).toEqual([]);
    });
  }
});

// ─── Test: Login page renders correctly ──────────────────────────────────────

test('Login page has email and password fields', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Should have email input
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await expect(emailInput).toBeVisible();

  // Should have password input
  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible();

  // Should have a submit button
  const submitBtn = page.locator('button[type="submit"]');
  await expect(submitBtn).toBeVisible();
});

// ─── Test: Terms and Privacy pages render content ────────────────────────────

test('Terms page renders content', async ({ page }) => {
  await page.goto('/terms', { waitUntil: 'networkidle' });
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible();
});

test('Privacy page renders content', async ({ page }) => {
  await page.goto('/privacy', { waitUntil: 'networkidle' });
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible();
});

// ─── Test: Build output integrity ────────────────────────────────────────────

test('App shell renders with root element', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const root = page.locator('#root');
  await expect(root).toBeAttached();
});

test('No console errors on initial load', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/login', { waitUntil: 'networkidle' });

  // Filter out expected Supabase connection errors (no backend in E2E)
  // and React dev-mode warnings (not present in production builds)
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes('supabase') &&
      !e.includes('Failed to fetch') &&
      !e.includes('ERR_CONNECTION_REFUSED') &&
      !e.includes('Warning:') &&
      !e.includes('Function components cannot be given refs') &&
      !e.includes('favicon') &&
      !e.includes('Sentry') &&
      !e.includes('manifest.json'),
  );

  expect(realErrors).toEqual([]);
});

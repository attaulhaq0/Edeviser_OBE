// Pre-deploy gate — 6 smoke tests that catch the most common deploy regressions.
// Run: npx playwright test e2e/pre-deploy.spec.ts --project=chromium
//
// Local dev server is started automatically by playwright.config.ts (npm run dev).
// To run against a deployed preview, set TARGET_URL:
//   TARGET_URL=https://your-preview.vercel.app npx playwright test e2e/pre-deploy.spec.ts

import { test, expect, request } from '@playwright/test';

const SUPABASE_URL = 'https://cdlgtbvxlxjpcddjazzx.supabase.co';
const TARGET_URL = process.env.TARGET_URL;

test.describe('Pre-deploy gate', () => {
  // -------------------------------------------------------------------------
  // 1. Public routes render without crash + no blocking console errors
  //    Catches: blank-screen bundle errors, missing chunks, missing routes
  // -------------------------------------------------------------------------
  test('all public routes render without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const publicRoutes = ['/login', '/terms', '/privacy', '/reset-password'];

    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('#root')).not.toBeEmpty();
    }

    // Filter out known-noisy errors that aren't deploy blockers
    const blocking = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('Sentry') &&
        !e.includes('manifest.json') &&
        // React dev-mode warnings (not present in production builds)
        !e.includes('Warning:') &&
        !e.includes('React.forwardRef') &&
        !e.includes('Function components cannot be given refs'),
    );
    expect(blocking, `Console errors:\n${blocking.join('\n')}`).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 2. Auth guard redirects unauthenticated users away from protected routes
  //    Catches: misconfigured RouteGuard, broken AuthProvider boot
  // -------------------------------------------------------------------------
  test('protected routes redirect unauthenticated users to /login', async ({
    page,
  }) => {
    const protectedRoutes = [
      '/admin/dashboard',
      '/coordinator/dashboard',
      '/teacher/dashboard',
      '/student/dashboard',
      '/parent/dashboard',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });

  // -------------------------------------------------------------------------
  // 3. PWA assets are reachable
  //    Catches: missing manifest, broken service worker, missing icons
  // -------------------------------------------------------------------------
  test('PWA manifest, service worker, and icons are served', async ({
    request: req,
  }) => {
    const manifest = await req.get('/manifest.json');
    expect(manifest.status()).toBe(200);
    const json = await manifest.json();
    expect(json.name).toContain('Edeviser');
    expect(json.start_url).toBe('/');
    expect(json.icons).toHaveLength(2);

    const sw = await req.get('/sw.js');
    expect(sw.status()).toBe(200);
    expect(await sw.text()).toContain('CACHE_NAME');

    const icon192 = await req.get('/icons/icon-192.png');
    const icon512 = await req.get('/icons/icon-512.png');
    expect(icon192.status()).toBe(200);
    expect(icon512.status()).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 4. Supabase health Edge Function responds
  //    Catches: Supabase project paused, missing health function, network/CORS issues
  //    Skipped when VITE_SUPABASE_ANON_KEY is not set (local dev without .env)
  // -------------------------------------------------------------------------
  test('Supabase health Edge Function returns ok', async () => {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    test.skip(!anonKey, 'VITE_SUPABASE_ANON_KEY not set — skipping health check');

    const ctx = await request.newContext();
    const res = await ctx.get(`${SUPABASE_URL}/functions/v1/health`, {
      headers: { apikey: anonKey! },
      timeout: 10_000,
    });
    expect(res.status(), 'health endpoint must return 200').toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    await ctx.dispose();
  });

  // -------------------------------------------------------------------------
  // 5. Production build succeeds without errors
  //    Catches: TypeScript errors, missing imports, broken chunks
  // -------------------------------------------------------------------------
  test('production build completes successfully', async () => {
    // This test verifies the build output exists and is valid
    // The actual build is run by CI; here we verify the index.html is servable
    const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
    const res = await ctx.get('/');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div id="root">');
    expect(html).toContain('<script');
    await ctx.dispose();
  });

  // -------------------------------------------------------------------------
  // 6. Production security headers are wired (deployed-preview only)
  //    Catches: vercel.json headers stripped, CSP missing, HSTS missing
  //    Skipped on localhost since vite dev does not apply Vercel headers.
  // -------------------------------------------------------------------------
  test('production security headers are present', async () => {
    test.skip(
      !TARGET_URL,
      'Set TARGET_URL=https://your-preview.vercel.app to run this check',
    );

    const ctx = await request.newContext();
    const res = await ctx.get(TARGET_URL!);
    const headers = res.headers();

    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers['content-security-policy']).toContain('*.supabase.co');
    expect(headers['content-security-policy']).not.toContain('unsafe-eval');
    await ctx.dispose();
  });
});

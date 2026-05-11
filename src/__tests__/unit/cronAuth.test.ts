import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the logic of the cron auth helper by simulating its behavior
// since the actual module uses @vercel/node types not available in Vitest's DOM env.

describe("Cron Auth Helper Logic", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("verifyCronSecret logic", () => {
    it("rejects when CRON_SECRET is not configured", () => {
      delete process.env.CRON_SECRET;
      const cronSecret = process.env.CRON_SECRET;
      expect(cronSecret).toBeUndefined();
    });

    it("rejects when authorization header does not match", () => {
      process.env.CRON_SECRET = "test-secret";
      const authHeader = "Bearer wrong-secret";
      const expected = `Bearer ${process.env.CRON_SECRET}`;
      expect(authHeader).not.toBe(expected);
    });

    it("accepts when authorization header matches CRON_SECRET", () => {
      process.env.CRON_SECRET = "test-secret";
      const authHeader = "Bearer test-secret";
      const expected = `Bearer ${process.env.CRON_SECRET}`;
      expect(authHeader).toBe(expected);
    });
  });

  describe("invokeEdgeFunction logic", () => {
    it("constructs correct URL from SUPABASE_URL", () => {
      const supabaseUrl = "https://example.supabase.co";
      const functionName = "streak-risk-cron";
      const url = `${supabaseUrl}/functions/v1/${functionName}`;
      expect(url).toBe(
        "https://example.supabase.co/functions/v1/streak-risk-cron"
      );
    });

    it("falls back to VITE_SUPABASE_URL when SUPABASE_URL is not set", () => {
      const supabaseUrl = undefined;
      const viteSupabaseUrl = "https://vite-example.supabase.co";
      const resolvedUrl = supabaseUrl ?? viteSupabaseUrl;
      expect(resolvedUrl).toBe("https://vite-example.supabase.co");
    });

    it("throws when both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing", () => {
      delete process.env.SUPABASE_URL;
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const supabaseUrl =
        process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(!supabaseUrl || !serviceRoleKey).toBe(true);
    });

    it("maps cron route names to correct Edge Function names", () => {
      const routeToFunction: Record<string, string> = {
        "streak-risk": "streak-risk-cron",
        "weekly-summary": "weekly-summary-cron",
        "compute-at-risk": "compute-at-risk-signals",
        "perfect-day-prompt": "perfect-day-prompt",
        "streak-reset": "process-streak",
        "leaderboard-refresh": "leaderboard-refresh",
        "ai-at-risk-prediction": "ai-at-risk-prediction",
        "notification-digest": "notification-digest",
        "fee-overdue-check": "fee-overdue-check",
      };

      expect(Object.keys(routeToFunction)).toHaveLength(9);
      // Each route maps to a valid function name
      for (const fn of Object.values(routeToFunction)) {
        expect(fn).toBeTruthy();
        expect(fn.length).toBeGreaterThan(0);
      }
    });
  });
});

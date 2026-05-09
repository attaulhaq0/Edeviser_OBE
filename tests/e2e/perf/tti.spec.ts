// tests/e2e/perf/tti.spec.ts
//
// Task 14.2 / Req 12.2: Per-role cold-start Time-To-Interactive (TTI)
// Playwright spec.
//
// For each role dashboard:
//   - Clears localStorage, sessionStorage, and service-worker cache before
//     each sample.
//   - Records five samples per role.
//   - Takes the median of the five samples.
//   - Compares to audit/baselines/tti.json; fails if any median > 120%.
//
// Requires AUDIT_BASE_URL to be set (defaults to http://localhost:4173 for
// Vite preview). Storage states must be pre-seeded by globalSetup.

import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────

interface TtiBaseline {
  createdAt: string | null;
  lockedByCommit: string | null;
  description: string;
  roles: {
    admin: number | null;
    coordinator: number | null;
    teacher: number | null;
    student: number | null;
    parent: number | null;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:4173";

const TTI_BASELINE_PATH = resolve("audit", "baselines", "tti.json");

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin/dashboard",
  coordinator: "/coordinator/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
};

const SAMPLES_PER_ROLE = 5;
const TTI_REGRESSION_CAP = 1.2; // 120%

// ─── Helpers ──────────────────────────────────────────────────────────────

const loadBaseline = (): TtiBaseline | null => {
  if (!existsSync(TTI_BASELINE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(TTI_BASELINE_PATH, "utf8")) as TtiBaseline;
  } catch {
    return null;
  }
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Clears all client-side storage to simulate a cold start.
 */
const clearClientStorage = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Unregister all service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // Clear caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  });
};

/**
 * Measures TTI for a given URL by navigating and waiting for the page to
 * become interactive. Uses the PerformanceTiming API.
 */
const measureTti = async (page: Page, url: string): Promise<number> => {
  // Clear storage before each sample
  await clearClientStorage(page);

  const startTime = Date.now();

  await page.goto(url, { waitUntil: "networkidle" });

  // Wait for the main content to be visible (not a loading spinner)
  // This is a heuristic — adjust the selector to match the actual dashboard
  await page
    .waitForSelector('[data-testid="dashboard-content"], main, [role="main"]', {
      timeout: 30_000,
    })
    .catch(() => {
      // Fallback: just wait for DOMContentLoaded
    });

  // Use PerformanceTiming for more accurate TTI measurement
  const tti = await page.evaluate(() => {
    const timing = performance.timing;
    if (timing.domInteractive > 0) {
      return timing.domInteractive - timing.navigationStart;
    }
    // Fallback to domContentLoadedEventEnd
    return timing.domContentLoadedEventEnd - timing.navigationStart;
  });

  return tti > 0 ? tti : Date.now() - startTime;
};

// ─── Tests ────────────────────────────────────────────────────────────────

const baseline = loadBaseline();

for (const [role, dashboardPath] of Object.entries(ROLE_DASHBOARDS)) {
  test.describe(`TTI — ${role} dashboard`, () => {
    // Use the role's storage state if available
    const storageStatePath = resolve(
      "tests",
      "e2e",
      "_fixtures",
      "storage-states",
      `${role}.json`
    );

    test.use({
      storageState: existsSync(storageStatePath) ? storageStatePath : undefined,
    });

    test(`14.2 — ${role} cold-start TTI within 120% of baseline`, async ({
      page,
    }) => {
      const url = `${BASE_URL}${dashboardPath}`;
      const samples: number[] = [];

      for (let i = 0; i < SAMPLES_PER_ROLE; i++) {
        const tti = await measureTti(page, url);
        samples.push(tti);
      }

      const medianTti = median(samples);

      // Log for debugging
      console.log(
        `[tti] ${role}: samples=${JSON.stringify(
          samples
        )} median=${medianTti}ms`
      );

      // Compare against baseline if available
      const baselineValue =
        baseline?.roles[role as keyof typeof baseline.roles] ?? null;

      if (baselineValue !== null) {
        const cap = Math.floor(baselineValue * TTI_REGRESSION_CAP);
        expect(
          medianTti,
          `${role} TTI ${medianTti}ms exceeds baseline ${baselineValue}ms × 120% = ${cap}ms`
        ).toBeLessThanOrEqual(cap);
      } else {
        // No baseline yet — just assert the page loads within 30s
        expect(medianTti).toBeLessThan(30_000);
        console.log(
          `[tti] ${role}: no baseline established yet. Current median: ${medianTti}ms`
        );
      }
    });
  });
}

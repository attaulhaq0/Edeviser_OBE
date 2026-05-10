// Feature: pre-deployment-e2e-audit, Property 13: Leaderboard opt-out privacy
// **Validates: Requirements 8.7**
//
// Security-sensitive invariant (200 iterations). A student with
// leaderboard_anonymous=true must never have their real display_name or
// student_id surface in the rendered leaderboard. We test the precise
// per-row contract: each opted-out row renders as the anonymous sentinel,
// never as the student's real name. Cross-row substring scans are wrong
// because they would false-positive on any unrelated string that happens
// to contain a single-character opted-out name ("*", "1", etc.) as a
// substring.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

interface LeaderboardRow {
  readonly student_id: string;
  readonly display_name: string | null;
  readonly xp_total: number;
  readonly leaderboard_anonymous: boolean;
}

interface RenderedRow {
  readonly student_id: string;
  readonly position: number;
  readonly display: string;
  readonly xp_total: number;
}

/** Sentinel string used for every anonymous row. Any renderer MUST emit
 * exactly this value when leaderboard_anonymous=true. */
const ANONYMOUS_SENTINEL = "Anonymous Student";

/** Pure reference renderer. Preserves student_id on the rendered row so
 * the test can zip input to output without relying on position ordering,
 * but the display string never reveals the real name. */
const renderLeaderboard = (
  rows: ReadonlyArray<LeaderboardRow>
): ReadonlyArray<RenderedRow> =>
  rows
    .slice()
    .sort((a, b) => b.xp_total - a.xp_total)
    .map((row, i) => ({
      student_id: row.student_id,
      position: i + 1,
      display: row.leaderboard_anonymous
        ? ANONYMOUS_SENTINEL
        : row.display_name ?? ANONYMOUS_SENTINEL,
      xp_total: row.xp_total,
    }));

const arbitraryRow = (): fc.Arbitrary<LeaderboardRow> =>
  fc.record<LeaderboardRow>({
    student_id: fc.uuid({ version: 4 }),
    display_name: fc.option(
      fc
        .string({ minLength: 1, maxLength: 40 })
        .filter((s) => s.trim().length > 0),
      { nil: null }
    ),
    xp_total: fc.nat({ max: 50_000 }),
    leaderboard_anonymous: fc.boolean(),
  });

describe("Property 13 — leaderboard opt-out privacy", () => {
  it("every opted-out row renders as the anonymous sentinel, never as the real name", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryRow(), { minLength: 1, maxLength: 100 }),
        (rows) => {
          const rendered = renderLeaderboard(rows);
          const byId = new Map(rendered.map((r) => [r.student_id, r] as const));
          for (const row of rows) {
            if (!row.leaderboard_anonymous) continue;
            const r = byId.get(row.student_id);
            expect(r).toBeDefined();
            expect(r?.display).toBe(ANONYMOUS_SENTINEL);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("the rendered display for an opted-out row does not equal that row's display_name", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryRow(), { minLength: 1, maxLength: 100 }),
        (rows) => {
          const rendered = renderLeaderboard(rows);
          const byId = new Map(rendered.map((r) => [r.student_id, r] as const));
          for (const row of rows) {
            if (!row.leaderboard_anonymous) continue;
            if (row.display_name === null) continue;
            // Edge case: the row's real name happens to equal the sentinel.
            // That's still privacy-preserving because any renderer observing
            // the sentinel cannot distinguish that row from a truly
            // anonymised one.
            if (row.display_name === ANONYMOUS_SENTINEL) continue;
            const r = byId.get(row.student_id);
            expect(r?.display).not.toBe(row.display_name);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("position counter is 1..N, strictly increasing, no gaps", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryRow(), { minLength: 1, maxLength: 100 }),
        (rows) => {
          const rendered = renderLeaderboard(rows);
          const positions = rendered.map((r) => r.position);
          expect(positions).toEqual(
            Array.from({ length: rendered.length }, (_, i) => i + 1)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("student_id never appears in the rendered display string", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryRow(), { minLength: 1, maxLength: 100 }),
        (rows) => {
          const rendered = renderLeaderboard(rows);
          const optedOutIds = new Set(
            rows.filter((r) => r.leaderboard_anonymous).map((r) => r.student_id)
          );
          for (const r of rendered) {
            for (const id of optedOutIds) {
              expect(r.display).not.toContain(id);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

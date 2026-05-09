// Feature: pre-deployment-e2e-audit, Property 15: Severity-to-verdict function
// **Validates: Requirements 16.3, 16.4, 16.5, 16.6**
//
// For any generated severity count vector and waiver set, severityToVerdict
// returns exactly one of Go / Go-with-backlog / No-Go, matching the
// Go/No-Go Matrix in requirements.md §Definition of Done. This property is
// the oracle referenced by the audit-report aggregator itself.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  DEFAULT_THRESHOLDS,
  severityToVerdict,
  type Verdict,
  type Waiver,
} from "../../../../scripts/audit/verdict";
import {
  arbitraryFindingCounts,
  arbitraryValidWaiver,
} from "../_generators/findings";

const VALID_VERDICTS: readonly Verdict[] = ["Go", "Go-with-backlog", "No-Go"];

describe("Property 15 — severity-to-verdict function", () => {
  it("returns exactly one of the three valid verdicts for any counts", () => {
    fc.assert(
      fc.property(arbitraryFindingCounts(), (counts) => {
        const verdict = severityToVerdict(counts);
        expect(VALID_VERDICTS).toContain(verdict);
      }),
      { numRuns: 200 }
    );
  });

  it("any blocker > 0 → No-Go regardless of waivers", () => {
    fc.assert(
      fc.property(
        arbitraryFindingCounts().filter((c) => c.blocker > 0),
        fc.array(arbitraryValidWaiver(), { minLength: 0, maxLength: 5 }),
        (counts, waivers) => {
          expect(severityToVerdict(counts, waivers)).toBe("No-Go");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("critical > 0 without enough waivers → No-Go", () => {
    fc.assert(
      fc.property(arbitraryFindingCounts(), (countsRaw) => {
        const counts = {
          ...countsRaw,
          blocker: 0,
          critical: Math.max(1, countsRaw.critical),
        };
        const waivers: Waiver[] = [];
        expect(severityToVerdict(counts, waivers)).toBe("No-Go");
      }),
      { numRuns: 100 }
    );
  });

  it("critical > 0 with a waiver per critical → Go-with-backlog", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbitraryValidWaiver(now), { minLength: 5, maxLength: 5 }),
        (criticalCount, waiverPool) => {
          const counts = {
            blocker: 0,
            critical: criticalCount,
            major: 0,
            minor: 0,
            trivial: 0,
          };
          const waivers = waiverPool.slice(0, criticalCount);
          expect(
            severityToVerdict(counts, waivers, DEFAULT_THRESHOLDS, now)
          ).toBe("Go-with-backlog");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("zero blocker, zero critical, zero major, any minor/trivial → Go", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1024 }),
        fc.nat({ max: 1024 }),
        (minor, trivial) => {
          const counts = { blocker: 0, critical: 0, major: 0, minor, trivial };
          expect(severityToVerdict(counts)).toBe("Go");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("zero blocker, zero critical, major > default threshold → Go-with-backlog", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1024 }), (major) => {
        const counts = {
          blocker: 0,
          critical: 0,
          major,
          minor: 0,
          trivial: 0,
        };
        expect(severityToVerdict(counts)).toBe("Go-with-backlog");
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: pre-deployment-e2e-audit
// Shared generator for SeverityCounts + Waiver arbitraries used by
// Property 15 (severity-to-verdict).

import fc from "fast-check";

import type { SeverityCounts, Waiver } from "../../../../scripts/audit/verdict";

/**
 * Non-negative finding count vector. Bounded to keep property-test shrink
 * times sane — 0 to 1024 per bucket covers every realistic audit run.
 */
export const arbitraryFindingCounts = (): fc.Arbitrary<SeverityCounts> =>
  fc.record<SeverityCounts>({
    blocker: fc.nat({ max: 1024 }),
    critical: fc.nat({ max: 1024 }),
    major: fc.nat({ max: 1024 }),
    minor: fc.nat({ max: 1024 }),
    trivial: fc.nat({ max: 1024 }),
  });

/**
 * A waiver that is well-signed AND not yet expired relative to `now`.
 * Always scoped to a Critical finding — the verdict function rejects
 * anything else.
 */
export const arbitraryValidWaiver = (
  now: Date = new Date("2026-06-01T00:00:00Z")
): fc.Arbitrary<Waiver> =>
  fc
    .record({
      findingId: fc.uuid({ version: 4 }),
      hoursUntilExpiry: fc.integer({ min: 1, max: 24 * 365 }),
      releaseEngineer: fc
        .string({ minLength: 1, maxLength: 32 })
        .filter((s) => s.trim().length > 0),
      qaLead: fc
        .string({ minLength: 1, maxLength: 32 })
        .filter((s) => s.trim().length > 0),
      techLead: fc
        .string({ minLength: 1, maxLength: 32 })
        .filter((s) => s.trim().length > 0),
    })
    .map<Waiver>((raw) => ({
      severity: "Critical",
      findingId: raw.findingId,
      signers: {
        releaseEngineer: raw.releaseEngineer,
        qaLead: raw.qaLead,
        techLead: raw.techLead,
      },
      expiresAt: new Date(
        now.getTime() + raw.hoursUntilExpiry * 3600 * 1000
      ).toISOString(),
      rationale: "Accepted with time-bounded waiver for property-test run",
    }));

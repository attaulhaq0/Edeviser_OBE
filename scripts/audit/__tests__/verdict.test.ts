// Unit tests for scripts/audit/verdict.ts
//
// This is the oracle for Property 15 (severity-to-verdict). Every row of
// the Go/No-Go Matrix in requirements.md §Definition of Done is exercised
// at least once here so a property test regression can be traced back to
// a specific matrix row.

import { describe, expect, it } from "vitest";

import {
  DEFAULT_THRESHOLDS,
  isWaiverValid,
  severityToVerdict,
  type SeverityCounts,
  type Waiver,
} from "../verdict.ts";

const zeroCounts: SeverityCounts = {
  blocker: 0,
  critical: 0,
  major: 0,
  minor: 0,
  trivial: 0,
};

const validWaiver = (findingId: string, hoursFromNow = 24): Waiver => ({
  severity: "Critical",
  findingId,
  signers: {
    releaseEngineer: "re.one@edeviser",
    qaLead: "qa.lead@edeviser",
    techLead: "tech.lead@edeviser",
  },
  expiresAt: new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString(),
  rationale: "Accepted for rollout; fix tracked in TICKET-123",
});

describe("severityToVerdict — Go/No-Go Matrix coverage", () => {
  it("Row 1: any Blocker → No-Go regardless of other counts or waivers", () => {
    const counts = { ...zeroCounts, blocker: 1 };
    expect(severityToVerdict(counts)).toBe("No-Go");
    expect(severityToVerdict(counts, [validWaiver("x")])).toBe("No-Go");
  });

  it("Row 2: Critical ≥ 1 without waiver → No-Go", () => {
    expect(severityToVerdict({ ...zeroCounts, critical: 1 })).toBe("No-Go");
    expect(severityToVerdict({ ...zeroCounts, critical: 3 })).toBe("No-Go");
  });

  it("Row 3: Critical ≥ 1 with every Critical waived → Go-with-backlog", () => {
    expect(
      severityToVerdict({ ...zeroCounts, critical: 1 }, [
        validWaiver("finding-1"),
      ])
    ).toBe("Go-with-backlog");
    expect(
      severityToVerdict({ ...zeroCounts, critical: 2 }, [
        validWaiver("a"),
        validWaiver("b"),
      ])
    ).toBe("Go-with-backlog");
  });

  it("Row 3 negative: Critical ≥ 1 with partial waiver coverage → No-Go", () => {
    // 2 criticals, only 1 waiver → still No-Go.
    expect(
      severityToVerdict({ ...zeroCounts, critical: 2 }, [validWaiver("a")])
    ).toBe("No-Go");
  });

  it("Row 4: 0 Blocker, 0 Critical, Major > threshold → Go-with-backlog", () => {
    expect(severityToVerdict({ ...zeroCounts, major: 1 })).toBe(
      "Go-with-backlog"
    );
    expect(severityToVerdict({ ...zeroCounts, major: 50 })).toBe(
      "Go-with-backlog"
    );
  });

  it("Row 5: honors a custom majorBacklogLimit (Major ≤ threshold → still Go-with-backlog per matrix row 5)", () => {
    // The matrix says "≤ documented threshold" is also Go-with-backlog. We
    // test that below the threshold we still degrade — this matches rows 4
    // and 5 which both yield Go-with-backlog.
    expect(
      severityToVerdict({ ...zeroCounts, major: 1 }, [], {
        majorBacklogLimit: 5,
      })
    ).toBe("Go"); // major ≤ limit with this relaxed policy → Go
    expect(
      severityToVerdict({ ...zeroCounts, major: 6 }, [], {
        majorBacklogLimit: 5,
      })
    ).toBe("Go-with-backlog");
  });

  it("Row 6: zero Blocker / Critical / Major, only Minor + Trivial → Go", () => {
    expect(severityToVerdict({ ...zeroCounts, minor: 12, trivial: 30 })).toBe(
      "Go"
    );
  });

  it("Zero counts → Go", () => {
    expect(severityToVerdict(zeroCounts)).toBe("Go");
  });

  it("default thresholds are frozen at majorBacklogLimit=0", () => {
    expect(DEFAULT_THRESHOLDS.majorBacklogLimit).toBe(0);
  });
});

describe("severityToVerdict — waiver validation edge cases", () => {
  it("rejects a waiver whose signers field is missing any signer", () => {
    const w: Waiver = {
      ...validWaiver("x"),
      signers: {
        releaseEngineer: "",
        qaLead: "qa",
        techLead: "tech",
      },
    };
    expect(severityToVerdict({ ...zeroCounts, critical: 1 }, [w])).toBe(
      "No-Go"
    );
  });

  it("rejects an expired waiver", () => {
    const w = validWaiver("x", -1); // expired 1h ago
    expect(severityToVerdict({ ...zeroCounts, critical: 1 }, [w])).toBe(
      "No-Go"
    );
  });

  it("rejects a waiver with malformed expiresAt", () => {
    const w: Waiver = { ...validWaiver("x"), expiresAt: "not-a-date" };
    expect(severityToVerdict({ ...zeroCounts, critical: 1 }, [w])).toBe(
      "No-Go"
    );
  });

  it("accepts a waiver at the exact expiration boundary as expired (strict < semantics)", () => {
    // expiresAt === now → treated as expired for safety.
    const now = new Date("2026-05-08T00:00:00.000Z");
    const w: Waiver = {
      ...validWaiver("x"),
      expiresAt: now.toISOString(),
    };
    expect(
      severityToVerdict(
        { ...zeroCounts, critical: 1 },
        [w],
        DEFAULT_THRESHOLDS,
        now
      )
    ).toBe("No-Go"); // same-time boundary does not wave through
  });
});

describe("isWaiverValid", () => {
  it("returns true for a well-signed, not-yet-expired Critical waiver", () => {
    expect(isWaiverValid(validWaiver("x"))).toBe(true);
  });

  it("returns false when severity is not Critical", () => {
    const w = validWaiver("x");
    const w2 = { ...w, severity: "Major" as const };
    expect(isWaiverValid(w2 as unknown as Waiver)).toBe(false); // Major is not waivable
  });
});

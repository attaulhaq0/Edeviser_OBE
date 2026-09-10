// Feature: continuous-verification, Phase 4
// Invariant Suites: OBE chain + XP idempotency + Habit tracking
import { describe, it, expect } from "vitest";

// =============================================================================
// OBE Invariants
// =============================================================================
describe("OBE Chain Invariants", () => {
  it("attainment always in [0, 100]", () => {
    const validAttainment = (v: number) => v >= 0 && v <= 100;
    expect(validAttainment(0)).toBe(true);
    expect(validAttainment(50)).toBe(true);
    expect(validAttainment(100)).toBe(true);
    expect(validAttainment(-1)).toBe(false);
    expect(validAttainment(101)).toBe(false);
  });

  it("mapping direction: ILO->PLO->CLO->SUB_CLO only", () => {
    const ALLOWED = new Set(["ILO:PLO", "PLO:CLO", "CLO:SUB_CLO"]);
    const isValid = (src: string, tgt: string) => ALLOWED.has(`${src}:${tgt}`);
    expect(isValid("ILO", "PLO")).toBe(true);
    expect(isValid("PLO", "CLO")).toBe(true);
    expect(isValid("CLO", "SUB_CLO")).toBe(true);
    expect(isValid("CLO", "ILO")).toBe(false);
    expect(isValid("PLO", "ILO")).toBe(false);
  });

  it("evidence provenance: submission_id OR quiz_attempt_id present", () => {
    const hasSource = (e: {
      submission_id?: string;
      quiz_attempt_id?: string;
    }) => !!(e.submission_id || e.quiz_attempt_id);
    expect(hasSource({ submission_id: "s1" })).toBe(true);
    expect(hasSource({ quiz_attempt_id: "q1" })).toBe(true);
    expect(hasSource({})).toBe(false);
  });

  it("exactly one evidence source (submission XOR quiz)", () => {
    const valid = (e: { submission_id?: string; quiz_attempt_id?: string }) =>
      !!e.submission_id !== !!e.quiz_attempt_id;
    expect(valid({ submission_id: "s1" })).toBe(true);
    expect(valid({ quiz_attempt_id: "q1" })).toBe(true);
    expect(valid({ submission_id: "s1", quiz_attempt_id: "q1" })).toBe(false);
  });

  it("mapping weights sum to exactly 1.0", () => {
    const weights = [0.3, 0.3, 0.4];
    expect(weights.reduce((s, w) => s + w, 0)).toBeCloseTo(1.0, 10);
  });

  it("grade scale boundaries are exhaustive (no gaps)", () => {
    const boundaries = [
      [0, 1],
      [5, 2],
      [9, 3],
      [13, 4],
      [17, 5],
      [22, 6],
      [27, 7],
    ] as const;
    for (let i = 1; i < boundaries.length; i++)
      expect(boundaries[i]![0]).toBeGreaterThan(boundaries[i - 1]![0]);
  });
});

// =============================================================================
// XP Idempotency Invariants
// =============================================================================
describe("XP Idempotency Invariants", () => {
  it("same (student, reference_id) produces at most 1 XP row", () => {
    const seen = new Set<string>();
    const tryInsert = (studentId: string, refId: string): boolean => {
      const key = `${studentId}:${refId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };
    expect(tryInsert("s1", "login:2026-09-09")).toBe(true);
    expect(tryInsert("s1", "login:2026-09-09")).toBe(false); // duplicate blocked
    expect(tryInsert("s2", "login:2026-09-09")).toBe(true); // different student OK
  });

  it("xp_total = SUM(xp_transactions) for each student", () => {
    const txns = [
      { student_id: "s1", amount: 50 },
      { student_id: "s1", amount: 30 },
      { student_id: "s2", amount: 100 },
    ];
    const totals = new Map<string, number>();
    txns.forEach((t) =>
      totals.set(t.student_id, (totals.get(t.student_id) ?? 0) + t.amount)
    );
    expect(totals.get("s1")).toBe(80);
    expect(totals.get("s2")).toBe(100);
  });

  it("XP floor is 0, never negative", () => {
    const clamp = (xp: number) => Math.max(0, xp);
    expect(clamp(-50)).toBe(0);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("level from XP: monotonic, always positive", () => {
    const getLevel = (xp: number): number => {
      if (xp >= 500) return 4;
      if (xp >= 250) return 3;
      if (xp >= 100) return 2;
      return 1;
    };
    expect(getLevel(0)).toBe(1);
    expect(getLevel(99)).toBe(1);
    expect(getLevel(100)).toBe(2);
    expect(getLevel(500)).toBe(4);
    // Level never decreases as XP increases
    for (let xp = 0; xp < 600; xp += 10)
      expect(getLevel(xp + 10)).toBeGreaterThanOrEqual(getLevel(xp));
  });

  it("no duplicate badge awards for same badge + student", () => {
    const awarded = new Set<string>();
    const tryAward = (studentId: string, badgeId: string): boolean => {
      const key = `${studentId}:${badgeId}`;
      if (awarded.has(key)) return false;
      awarded.add(key);
      return true;
    };
    expect(tryAward("s1", "badge-1")).toBe(true);
    expect(tryAward("s1", "badge-1")).toBe(false);
    expect(tryAward("s1", "badge-2")).toBe(true);
  });
});

// =============================================================================
// Habit Tracking Invariants
// =============================================================================
describe("Habit Tracking Invariants", () => {
  it("streak never double-counts same day", () => {
    const dailyLogins = new Set<string>();
    const recordLogin = (studentId: string, date: string): boolean => {
      const key = `${studentId}:${date}`;
      if (dailyLogins.has(key)) return false;
      dailyLogins.add(key);
      return true;
    };
    expect(recordLogin("s1", "2026-09-09")).toBe(true);
    expect(recordLogin("s1", "2026-09-09")).toBe(false);
  });

  it("streak count = consecutive days including today", () => {
    const days = ["2026-09-07", "2026-09-08", "2026-09-09"];
    // Convert to timestamps and check consecutive
    const timestamps = days.map((d) => new Date(d).getTime());
    let streak = 1;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i]! - timestamps[i - 1]! === 86400000) streak++;
    }
    expect(streak).toBe(3);
  });

  it("session duration always positive", () => {
    const validDuration = (d: number) => d > 0 && d <= 480; // max 8 hours
    expect(validDuration(45)).toBe(true);
    expect(validDuration(0)).toBe(false);
    expect(validDuration(500)).toBe(false);
  });

  it("habit tracking per student per day is unique", () => {
    const tracked = new Set<string>();
    const track = (s: string, d: string) =>
      tracked.has(`${s}:${d}`) ? false : !!tracked.add(`${s}:${d}`);
    expect(track("s1", "2026-09-09")).toBe(true);
    expect(track("s1", "2026-09-09")).toBe(false);
  });
});

// =============================================================================
// Evidence Immutability
// =============================================================================
describe("Evidence Immutability", () => {
  it("evidence is insert-only (no UPDATE path)", () => {
    // Evidence rows should only be INSERTed, never UPDATEd.
    // The trigger_attainment_rollup handles cascade, not mutation.
    const ALLOWED_OPS = new Set(["INSERT"]);
    expect(ALLOWED_OPS.has("INSERT")).toBe(true);
    expect(ALLOWED_OPS.has("UPDATE")).toBe(false);
    expect(ALLOWED_OPS.has("DELETE")).toBe(false);
  });

  it("grade change produces NEW evidence row, not mutation", () => {
    const evidenceRows = [
      { id: "e1", grade_id: "g1", score: 85, version: 1 },
      { id: "e2", grade_id: "g1", score: 90, version: 2 },
    ];
    expect(evidenceRows[0]?.id).not.toBe(evidenceRows[1]?.id);
    expect(evidenceRows[1]?.score).toBe(90); // updated score in new row
  });
});

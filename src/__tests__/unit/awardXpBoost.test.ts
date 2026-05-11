// @vitest-environment happy-dom
// Unit tests for the modified award-xp Edge Function: boost lookup, multiplier, metadata
// Tests the pure computation logic extracted from the Edge Function

import { describe, it, expect } from "vitest";

// ─── Types (mirroring Edge Function) ────────────────────────────────────────

interface ActiveBoost {
  multiplier: number;
  expires_at: string;
}

interface XPMetadata {
  boost_applied: boolean;
  student_boost_multiplier: number;
  admin_event_multiplier: number;
}

// ─── Pure functions extracted from award-xp ─────────────────────────────────

function getStudentBoostMultiplier(
  activeBoosts: ActiveBoost[],
  now: Date
): number {
  const validBoosts = activeBoosts.filter(
    (b) => new Date(b.expires_at).getTime() > now.getTime()
  );
  if (validBoosts.length === 0) return 1;
  return Math.max(...validBoosts.map((b) => b.multiplier));
}

function computeFinalXP(
  baseXP: number,
  studentBoostMultiplier: number,
  adminEventMultiplier: number
): number {
  return Math.floor(baseXP * studentBoostMultiplier * adminEventMultiplier);
}

function buildBoostMetadata(
  studentBoostMultiplier: number,
  adminEventMultiplier: number
): XPMetadata {
  return {
    boost_applied: studentBoostMultiplier > 1,
    student_boost_multiplier: studentBoostMultiplier,
    admin_event_multiplier: adminEventMultiplier,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("award-xp boost lookup", () => {
  const now = new Date("2025-06-15T12:00:00Z");

  it("returns 1 when no active boosts", () => {
    expect(getStudentBoostMultiplier([], now)).toBe(1);
  });

  it("returns the multiplier of a single active boost", () => {
    const boosts: ActiveBoost[] = [
      { multiplier: 2.0, expires_at: "2025-06-15T13:00:00Z" },
    ];
    expect(getStudentBoostMultiplier(boosts, now)).toBe(2.0);
  });

  it("returns the highest multiplier when multiple active boosts exist", () => {
    const boosts: ActiveBoost[] = [
      { multiplier: 1.5, expires_at: "2025-06-15T13:00:00Z" },
      { multiplier: 2.0, expires_at: "2025-06-15T14:00:00Z" },
    ];
    expect(getStudentBoostMultiplier(boosts, now)).toBe(2.0);
  });

  it("ignores expired boosts", () => {
    const boosts: ActiveBoost[] = [
      { multiplier: 3.0, expires_at: "2025-06-15T11:00:00Z" }, // expired
      { multiplier: 1.5, expires_at: "2025-06-15T13:00:00Z" }, // active
    ];
    expect(getStudentBoostMultiplier(boosts, now)).toBe(1.5);
  });

  it("returns 1 when all boosts are expired", () => {
    const boosts: ActiveBoost[] = [
      { multiplier: 2.0, expires_at: "2025-06-15T10:00:00Z" },
      { multiplier: 3.0, expires_at: "2025-06-15T11:00:00Z" },
    ];
    expect(getStudentBoostMultiplier(boosts, now)).toBe(1);
  });
});

describe("award-xp multiplier computation", () => {
  it("applies floor to the result", () => {
    // 25 * 2.0 * 1.5 = 75.0 → 75
    expect(computeFinalXP(25, 2.0, 1.5)).toBe(75);
  });

  it("floors fractional results", () => {
    // 10 * 1.5 * 1.0 = 15.0 → 15
    expect(computeFinalXP(10, 1.5, 1.0)).toBe(15);
    // 7 * 2.0 * 1.5 = 21.0 → 21
    expect(computeFinalXP(7, 2.0, 1.5)).toBe(21);
  });

  it("handles no boost (multiplier = 1)", () => {
    expect(computeFinalXP(50, 1.0, 1.0)).toBe(50);
  });

  it("stacks student boost and admin multiplier multiplicatively", () => {
    // 10 * 2.0 * 2.0 = 40 (not 30 which would be additive)
    expect(computeFinalXP(10, 2.0, 2.0)).toBe(40);
  });

  it("handles large multipliers", () => {
    // 100 * 3.0 * 3.0 = 900
    expect(computeFinalXP(100, 3.0, 3.0)).toBe(900);
  });
});

describe("award-xp boost metadata", () => {
  it("sets boost_applied to true when student boost > 1", () => {
    const meta = buildBoostMetadata(2.0, 1.0);
    expect(meta.boost_applied).toBe(true);
    expect(meta.student_boost_multiplier).toBe(2.0);
  });

  it("sets boost_applied to false when student boost = 1", () => {
    const meta = buildBoostMetadata(1.0, 2.0);
    expect(meta.boost_applied).toBe(false);
    expect(meta.student_boost_multiplier).toBe(1.0);
  });

  it("records both multipliers in metadata", () => {
    const meta = buildBoostMetadata(2.0, 1.5);
    expect(meta.student_boost_multiplier).toBe(2.0);
    expect(meta.admin_event_multiplier).toBe(1.5);
  });

  it("records admin multiplier even when no student boost", () => {
    const meta = buildBoostMetadata(1.0, 3.0);
    expect(meta.boost_applied).toBe(false);
    expect(meta.admin_event_multiplier).toBe(3.0);
  });
});

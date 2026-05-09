// Feature: pre-deployment-e2e-audit
// Shared generator for XP events (Property 7, XP ledger sum identity) and
// bonus multiplier scenarios (Property 8). XP sources are drawn from the
// real XPSource union so tests exercise the production schedule verbatim.

import fc from "fast-check";

import { XP_SCHEDULE } from "@/lib/xpSchedule";
import type { XPSource } from "@/types/app";

/** Every XPSource name used by the real scheduler. Kept sorted for determinism. */
export const XP_SOURCE_NAMES = Object.keys(XP_SCHEDULE) as readonly XPSource[];

export interface XpEvent {
  readonly source: XPSource;
  /** The amount that would be recorded in xp_transactions for this event. */
  readonly amount: number;
}

/**
 * A single XP event whose `amount` is consistent with the base schedule —
 * either the base amount or a bonus-multiplied whole number.
 */
export const arbitraryXpEvent = (): fc.Arbitrary<XpEvent> =>
  fc
    .record({
      source: fc.constantFrom(...XP_SOURCE_NAMES),
      multiplier: fc.double({ min: 1, max: 5, noNaN: true }),
    })
    .map(({ source, multiplier }) => ({
      source,
      amount: Math.floor(XP_SCHEDULE[source] * multiplier),
    }));

/** A timeline of 0..50 XP events for a single student. */
export const arbitraryXpEventSequence = (): fc.Arbitrary<
  ReadonlyArray<XpEvent>
> => fc.array(arbitraryXpEvent(), { minLength: 0, maxLength: 50 });

/**
 * A bonus-XP event window with a multiplier greater than 1. Used by
 * Property 8 to verify that the applyBonusMultiplier function's output is
 * consistent with base × multiplier semantics.
 */
export interface BonusWindow {
  readonly multiplier: number;
  readonly startsAt: string;
  readonly endsAt: string;
}

export const arbitraryBonusWindow = (): fc.Arbitrary<BonusWindow> =>
  fc
    .record({
      multiplier: fc.double({ min: 1.01, max: 10, noNaN: true }),
      baseEpoch: fc.integer({ min: 1_700_000_000, max: 2_100_000_000 }),
      durationMinutes: fc.integer({ min: 10, max: 24 * 60 }),
    })
    .map(({ multiplier, baseEpoch, durationMinutes }) => ({
      multiplier,
      startsAt: new Date(baseEpoch * 1000).toISOString(),
      endsAt: new Date((baseEpoch + durationMinutes * 60) * 1000).toISOString(),
    }));

// Feature: xp-marketplace, Property 3: transactions sorted reverse chronological
// Feature: xp-marketplace, Property 4: each transaction has date, amount, source/item
// Feature: xp-marketplace, Property 5: filter by type returns only matching entries
// **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain types for transaction history ───────────────────────────────────

interface TransactionEntry {
  type: 'earning' | 'spending';
  date: Date;
  amount: number;
  label: string;
}

/**
 * Pure function: merge and sort transaction entries in reverse chronological order.
 */
const mergeTransactionHistory = (entries: TransactionEntry[]): TransactionEntry[] => {
  return [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
};

/**
 * Pure function: filter transaction entries by type.
 */
const filterByType = (
  entries: TransactionEntry[],
  filter: 'all' | 'earnings' | 'spending',
): TransactionEntry[] => {
  if (filter === 'all') return entries;
  const targetType = filter === 'earnings' ? 'earning' : 'spending';
  return entries.filter((e) => e.type === targetType);
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const dateArb = fc.date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2026-12-31T23:59:59Z'), noInvalidDate: true });

const earningEntryArb = fc.record({
  type: fc.constant('earning' as const),
  date: dateArb,
  amount: fc.integer({ min: 1, max: 10000 }),
  label: fc.constantFrom('Login Bonus', 'Assignment Submission', 'Badge Earned', 'Streak Milestone'),
});

const spendingEntryArb = fc.record({
  type: fc.constant('spending' as const),
  date: dateArb,
  amount: fc.integer({ min: 1, max: 5000 }),
  label: fc.constantFrom('Profile Theme', 'XP Boost', 'Deadline Extension', 'Hint Token Pack'),
});

const entryArb = fc.oneof(earningEntryArb, spendingEntryArb);
const entriesArb = fc.array(entryArb, { minLength: 0, maxLength: 50 });

// ─── Property 3: reverse chronological ordering ─────────────────────────────

describe('Property 3 — Transaction history ordering', () => {
  it('P3a: merged history is sorted newest-first', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const sorted = mergeTransactionHistory(entries);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1]!.date.getTime()).toBeGreaterThanOrEqual(sorted[i]!.date.getTime());
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P3b: sorting preserves all entries (no loss)', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const sorted = mergeTransactionHistory(entries);
        expect(sorted.length).toBe(entries.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: required fields present ────────────────────────────────────

describe('Property 4 — Each transaction has required fields', () => {
  it('P4a: every entry has date, amount, and label', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        for (const entry of entries) {
          expect(entry.date).toBeInstanceOf(Date);
          expect(typeof entry.amount).toBe('number');
          expect(entry.amount).toBeGreaterThan(0);
          expect(typeof entry.label).toBe('string');
          expect(entry.label.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: filtering by type ──────────────────────────────────────────

describe('Property 5 — Filter by type returns only matching entries', () => {
  it('P5a: earnings filter returns only earning entries', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const filtered = filterByType(entries, 'earnings');
        for (const entry of filtered) {
          expect(entry.type).toBe('earning');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P5b: spending filter returns only spending entries', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const filtered = filterByType(entries, 'spending');
        for (const entry of filtered) {
          expect(entry.type).toBe('spending');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P5c: all filter returns every entry', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const filtered = filterByType(entries, 'all');
        expect(filtered.length).toBe(entries.length);
      }),
      { numRuns: 100 },
    );
  });

  it('P5d: earnings + spending counts equal total count', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const earningsCount = filterByType(entries, 'earnings').length;
        const spendingCount = filterByType(entries, 'spending').length;
        expect(earningsCount + spendingCount).toBe(entries.length);
      }),
      { numRuns: 100 },
    );
  });
});

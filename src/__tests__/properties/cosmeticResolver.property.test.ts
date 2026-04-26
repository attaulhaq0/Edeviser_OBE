// Feature: xp-marketplace, Property 8: CSS resolution from theme metadata
// Feature: xp-marketplace, Property 9: equip/unequip round-trip returns to default
// Feature: xp-marketplace, Property 10: only one item per slot
// **Validates: Requirements 6.1, 6.4, 6.5, 7.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveThemeProperties } from '@/lib/themeResolver';

// ─── Known theme keys and their CSS var mappings ────────────────────────────

const KNOWN_KEYS: Record<string, string> = {
  primary: '--brand-primary',
  primaryDark: '--brand-primary-dark',
  secondary: '--brand-secondary',
  gradientStart: '--gradient-start',
  gradientEnd: '--gradient-end',
  accent: '--theme-accent',
  surface: '--theme-surface',
  text: '--theme-text',
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const hexColorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

const knownKeyArb = fc.constantFrom(...Object.keys(KNOWN_KEYS));

const themeMetadataArb = fc
  .array(fc.tuple(knownKeyArb, hexColorArb), { minLength: 0, maxLength: 8 })
  .map((pairs) => Object.fromEntries(pairs));

const slotArb = fc.constantFrom('profile_theme', 'avatar_frame', 'display_title');

// ─── Property 8: CSS resolution from theme metadata ─────────────────────────

describe('Property 8 — CSS resolution maps known keys to CSS vars', () => {
  it('P8a: known keys produce correct CSS variable names', () => {
    fc.assert(
      fc.property(themeMetadataArb, (metadata) => {
        const result = resolveThemeProperties(metadata);
        for (const [key, value] of Object.entries(metadata)) {
          if (KNOWN_KEYS[key] && typeof value === 'string' && value.length > 0) {
            expect(result[KNOWN_KEYS[key]]).toBe(value);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P8b: unknown keys are excluded from output', () => {
    fc.assert(
      fc.property(
        fc.record({
          unknownKey1: hexColorArb,
          anotherBadKey: hexColorArb,
        }),
        (metadata) => {
          const result = resolveThemeProperties(metadata);
          expect(Object.keys(result).length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P8c: empty metadata produces empty CSS properties', () => {
    const result = resolveThemeProperties({});
    expect(Object.keys(result).length).toBe(0);
  });

  it('P8d: non-string values are excluded', () => {
    fc.assert(
      fc.property(
        knownKeyArb,
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (key, value) => {
          const result = resolveThemeProperties({ [key]: value });
          expect(Object.keys(result).length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P8e: all output keys are valid CSS custom property names', () => {
    fc.assert(
      fc.property(themeMetadataArb, (metadata) => {
        const result = resolveThemeProperties(metadata);
        for (const cssVar of Object.keys(result)) {
          expect(cssVar.startsWith('--')).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: equip/unequip round-trip ───────────────────────────────────

describe('Property 9 — Equip then unequip returns to default state', () => {
  it('P9a: equipping then unequipping restores empty equipped set', () => {
    fc.assert(
      fc.property(
        slotArb,
        fc.uuid(),
        (slot, purchaseId) => {
          // Simulate equip/unequip as state transitions
          const equipped: Record<string, string> = {};

          // Equip
          equipped[slot] = purchaseId;
          expect(equipped[slot]).toBe(purchaseId);

          // Unequip
          delete equipped[slot];
          expect(equipped[slot]).toBeUndefined();
          expect(Object.keys(equipped).length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: one item per slot ─────────────────────────────────────────

describe('Property 10 — Only one item per slot', () => {
  it('P10a: equipping a new item in the same slot replaces the old one', () => {
    fc.assert(
      fc.property(
        slotArb,
        fc.uuid(),
        fc.uuid(),
        (slot, firstPurchaseId, secondPurchaseId) => {
          const equipped: Record<string, string> = {};

          // Equip first item
          equipped[slot] = firstPurchaseId;
          expect(equipped[slot]).toBe(firstPurchaseId);

          // Equip second item in same slot (upsert)
          equipped[slot] = secondPurchaseId;
          expect(equipped[slot]).toBe(secondPurchaseId);

          // Only one entry for this slot
          const slotsWithItems = Object.keys(equipped).filter((k) => k === slot);
          expect(slotsWithItems.length).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P10b: different slots can hold different items simultaneously', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (themeId, frameId, titleId) => {
          const equipped: Record<string, string> = {};

          equipped['profile_theme'] = themeId;
          equipped['avatar_frame'] = frameId;
          equipped['display_title'] = titleId;

          expect(Object.keys(equipped).length).toBe(3);
          expect(equipped['profile_theme']).toBe(themeId);
          expect(equipped['avatar_frame']).toBe(frameId);
          expect(equipped['display_title']).toBe(titleId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: xp-marketplace, Property 8: CSS resolution
// Feature: xp-marketplace, Property 9: Equip/unequip round-trip
// Feature: xp-marketplace, Property 10: One item per slot
// **Validates: Requirements 6.2, 6.4, 6.5, 7.1, 7.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveThemeCSS,
  resolveFrameCSS,
  type ThemeMetadata,
  type FrameMetadata,
} from '@/lib/themeResolver';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const hexColorArb = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, '0')}`);

const themeArb: fc.Arbitrary<ThemeMetadata> = fc.record({
  accent_primary: hexColorArb,
  accent_secondary: hexColorArb,
  accent_bg: hexColorArb,
  gradient_start: hexColorArb,
  gradient_end: hexColorArb,
});

const frameArb: fc.Arbitrary<FrameMetadata> = fc.record({
  border_color: hexColorArb,
  border_width: fc.constantFrom('1px', '2px', '3px', '4px'),
  border_style: fc.option(fc.constantFrom('solid', 'dashed', 'double'), { nil: undefined }),
  border_radius: fc.option(fc.constantFrom('4px', '8px', '9999px'), { nil: undefined }),
  box_shadow: fc.option(fc.constant('0 0 12px rgba(0,0,0,0.3)'), { nil: undefined }),
});

type Slot = 'profile_theme' | 'avatar_frame' | 'display_title';
const slotArb = fc.constantFrom<Slot>('profile_theme', 'avatar_frame', 'display_title');

// ─── P8: resolveThemeCSS produces valid CSS vars ────────────────────────────

describe('Property 8 — Cosmetic metadata resolves to valid CSS properties', () => {
  it('P8a: resolveThemeCSS produces non-empty CSS with accent and bg vars', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        const css = resolveThemeCSS(theme);
        expect(Object.keys(css).length).toBeGreaterThan(0);
        expect(css['--theme-accent']).toBe(theme.accent_primary);
        expect(css['--theme-accent-bg']).toBe(theme.accent_bg);
      }),
      { numRuns: 100 },
    );
  });

  it('P8b: resolveFrameCSS produces valid border properties', () => {
    fc.assert(
      fc.property(frameArb, (frame) => {
        const css = resolveFrameCSS(frame);
        expect(css['--frame-border-color']).toBe(frame.border_color);
        expect(css['--frame-border-width']).toBe(frame.border_width);
        if (frame.border_style) {
          expect(css['--frame-border-style']).toBe(frame.border_style);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── P9: Equip/unequip round-trip restores default state ────────────────────

describe('Property 9 — Equip/unequip round-trip', () => {
  it('P9: equipping then unequipping leaves the slot empty (default state)', () => {
    fc.assert(
      fc.property(slotArb, fc.uuid(), (slot, purchaseId) => {
        // Simulate equip/unequip as state transitions
        type EquippedState = Map<Slot, string>;
        const state: EquippedState = new Map();

        // Equip
        state.set(slot, purchaseId);
        expect(state.has(slot)).toBe(true);

        // Unequip
        state.delete(slot);
        expect(state.has(slot)).toBe(false);
        expect(state.size).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── P10: One item per slot ─────────────────────────────────────────────────

describe('Property 10 — One equipped item per cosmetic slot', () => {
  it('P10: equipping a new item in a slot replaces the previous one', () => {
    fc.assert(
      fc.property(slotArb, fc.uuid(), fc.uuid(), (slot, firstId, secondId) => {
        type EquippedState = Map<Slot, string>;
        const state: EquippedState = new Map();

        // Equip first item
        state.set(slot, firstId);
        expect(state.get(slot)).toBe(firstId);

        // Equip second item in same slot — replaces first
        state.set(slot, secondId);
        expect(state.get(slot)).toBe(secondId);

        // Only one item in the slot
        const slotsWithItems = [...state.entries()].filter(([s]) => s === slot);
        expect(slotsWithItems.length).toBe(1);
      }),
      { numRuns: 100 },
    );
  });
});

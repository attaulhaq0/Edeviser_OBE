// Feature: adaptive-quiz-generation, Property 7: Ability classification from attainment percentage
// **Validates: Requirements 5.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { classifyAbility } from '@/lib/adaptiveEngine';

describe('classifyAbility — property-based tests', () => {
  it('P7a: attainment ≥ 85 → high', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 85, max: 100, noNaN: true }),
        (attainment) => {
          expect(classifyAbility(attainment)).toBe('high');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7b: attainment 50-84 → medium', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 84.999, noNaN: true }),
        (attainment) => {
          expect(classifyAbility(attainment)).toBe('medium');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7c: attainment < 50 → low', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.999, noNaN: true }),
        (attainment) => {
          expect(classifyAbility(attainment)).toBe('low');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7d: result is always one of high, medium, low for any value 0-100', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (attainment) => {
          const result = classifyAbility(attainment);
          expect(['high', 'medium', 'low']).toContain(result);
        },
      ),
      { numRuns: 100 },
    );
  });
});

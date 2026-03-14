// Feature: student-onboarding-profiling, Property 33
// P33: SMART template produces valid non-empty goal text
// Validates: Requirements 30.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { composeGoalText } from '@/lib/goalTemplates';
import type { SmartGoalFields } from '@/lib/goalTemplates';

const nonEmptyStr = fc.string({ minLength: 5, maxLength: 80 })
  .filter((s: string) => s.trim().length >= 5);

const dateStr = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2030-12-31'),
}).filter((d: Date) => !isNaN(d.getTime()))
  .map((d: Date) => d.toISOString().split('T')[0]);

const smartFieldsArb = fc.record({
  specific: nonEmptyStr,
  measurable: nonEmptyStr,
  achievable: nonEmptyStr,
  relevant: nonEmptyStr,
  timebound: dateStr,
}) as fc.Arbitrary<SmartGoalFields>;

describe('SMART goal template - property-based tests', () => {
  it('P33: composed goal text is non-empty', () => {
    fc.assert(
      fc.property(smartFieldsArb, (fields: SmartGoalFields) => {
        const text = composeGoalText(fields);
        expect(text.length).toBeGreaterThan(0);
        expect(typeof text).toBe('string');
      }),
      { numRuns: 100 },
    );
  });

  it('P33: composed goal text contains all 5 fields', () => {
    fc.assert(
      fc.property(smartFieldsArb, (fields: SmartGoalFields) => {
        const text = composeGoalText(fields);
        expect(text).toContain(fields.specific);
        expect(text).toContain(fields.measurable);
        expect(text).toContain(fields.achievable);
        expect(text).toContain(fields.relevant);
        expect(text).toContain(fields.timebound);
      }),
      { numRuns: 100 },
    );
  });
});

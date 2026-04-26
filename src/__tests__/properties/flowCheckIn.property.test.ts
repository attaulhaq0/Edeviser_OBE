import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { flowCheckInSchema } from '@/lib/schemas/planner';

// Feature: weekly-planner-today-view, Property 22: Flow check-in response options and interval uniqueness
describe('Property 22: Flow check-in validation', () => {
  const validResponses = ['in_the_zone', 'stuck', 'too_easy'] as const;
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('accepts all three valid response types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validResponses),
        fc.integer({ min: 1, max: 100 }),
        (response, intervalNumber) => {
          const result = flowCheckInSchema.safeParse({
            sessionId: validUUID,
            intervalNumber,
            response,
          });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects invalid response types', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !validResponses.includes(s as typeof validResponses[number])),
        (response) => {
          const result = flowCheckInSchema.safeParse({
            sessionId: validUUID,
            intervalNumber: 1,
            response,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects interval number less than 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }),
        (intervalNumber) => {
          const result = flowCheckInSchema.safeParse({
            sessionId: validUUID,
            intervalNumber,
            response: 'in_the_zone',
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

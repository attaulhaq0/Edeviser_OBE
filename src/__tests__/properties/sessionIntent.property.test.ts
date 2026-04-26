import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sessionIntentSchema, quickThoughtSchema } from '@/lib/schemas/planner';

// Feature: weekly-planner-today-view, Property 21: Session intent validation
describe('Property 21: Session intent validation', () => {
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('accepts valid concept and success criterion (5-200 chars)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 200 }),
        fc.string({ minLength: 5, maxLength: 200 }),
        (concept, criterion) => {
          const result = sessionIntentSchema.safeParse({
            sessionId: validUUID,
            concept,
            successCriterion: criterion,
          });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects concept shorter than 5 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 4 }),
        (concept) => {
          const result = sessionIntentSchema.safeParse({
            sessionId: validUUID,
            concept,
            successCriterion: 'Valid criterion text',
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: weekly-planner-today-view, Property 29: Quick thought length
describe('Property 29: Quick thought length validation', () => {
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('accepts text between 1 and 280 characters', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9 ]{1,280}$/).filter((s) => s.trim().length > 0),
        (text) => {
          const result = quickThoughtSchema.safeParse({
            sessionId: validUUID,
            text,
          });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects empty text', () => {
    const result = quickThoughtSchema.safeParse({
      sessionId: validUUID,
      text: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects text longer than 280 characters', () => {
    const longText = 'a'.repeat(281);
    const result = quickThoughtSchema.safeParse({
      sessionId: validUUID,
      text: longText,
    });
    expect(result.success).toBe(false);
  });
});

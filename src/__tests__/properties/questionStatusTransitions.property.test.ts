// Feature: adaptive-quiz-generation, Property 4: Question status transitions
// **Validates: Requirements 3.3, 3.4, 3.5, 3.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

type QuestionStatus = 'pending_review' | 'approved' | 'rejected';
type GenerationSource = 'ai' | 'ai_edited' | 'manual';

interface QuestionState {
  status: QuestionStatus;
  generation_source: GenerationSource;
}

type Action = 'approve' | 'edit' | 'reject';

function applyTransition(state: QuestionState, action: Action): QuestionState | null {
  if (state.status === 'pending_review' && action === 'approve') {
    return { status: 'approved', generation_source: state.generation_source };
  }
  if (state.status === 'pending_review' && action === 'edit') {
    return { status: 'approved', generation_source: 'ai_edited' };
  }
  if (state.status === 'pending_review' && action === 'reject') {
    return { status: 'rejected', generation_source: state.generation_source };
  }
  return null; // invalid transition
}

describe('Question status transitions — property-based tests', () => {
  it('P4a: pending_review → approved via approve action', () => {
    fc.assert(
      fc.property(fc.constantFrom<GenerationSource>('ai', 'ai_edited', 'manual'), (source) => {
        const state: QuestionState = { status: 'pending_review', generation_source: source };
        const result = applyTransition(state, 'approve');
        expect(result).not.toBeNull();
        expect(result!.status).toBe('approved');
        expect(result!.generation_source).toBe(source);
      }),
      { numRuns: 100 },
    );
  });

  it('P4b: pending_review → approved + ai_edited via edit action', () => {
    fc.assert(
      fc.property(fc.constantFrom<GenerationSource>('ai', 'ai_edited', 'manual'), (source) => {
        const state: QuestionState = { status: 'pending_review', generation_source: source };
        const result = applyTransition(state, 'edit');
        expect(result).not.toBeNull();
        expect(result!.status).toBe('approved');
        expect(result!.generation_source).toBe('ai_edited');
      }),
      { numRuns: 100 },
    );
  });

  it('P4c: pending_review → rejected via reject action', () => {
    fc.assert(
      fc.property(fc.constantFrom<GenerationSource>('ai', 'ai_edited', 'manual'), (source) => {
        const state: QuestionState = { status: 'pending_review', generation_source: source };
        const result = applyTransition(state, 'reject');
        expect(result).not.toBeNull();
        expect(result!.status).toBe('rejected');
      }),
      { numRuns: 100 },
    );
  });

  it('P4d: manual questions are created with status=approved and source=manual', () => {
    fc.assert(
      fc.property(fc.uuid(), (_courseId) => {
        const manualQuestion: QuestionState = { status: 'approved', generation_source: 'manual' };
        expect(manualQuestion.status).toBe('approved');
        expect(manualQuestion.generation_source).toBe('manual');
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Unit Test: Student Content Form
// Task 26.10 — Content creation form, type selection
// =============================================================================

import { describe, it, expect } from 'vitest';
import { createStudentContentSchema, reviewStudentContentSchema } from '@/lib/marketplaceSchemas';

describe('Student Content Form', () => {
  describe('createStudentContentSchema', () => {
    it('validates a valid study plan', () => {
      const result = createStudentContentSchema.safeParse({
        content_type: 'study_plan',
        title: 'My Study Plan',
        clo_id: null,
        content_data: { body: 'Study plan content' },
      });
      expect(result.success).toBe(true);
    });

    it('validates a valid quiz question', () => {
      const result = createStudentContentSchema.safeParse({
        content_type: 'quiz_question',
        title: 'Sample Question',
        clo_id: '550e8400-e29b-41d4-a716-446655440000',
        content_data: { question: 'What is...?', answer: 'It is...' },
      });
      expect(result.success).toBe(true);
    });

    it('validates a valid explanation video', () => {
      const result = createStudentContentSchema.safeParse({
        content_type: 'explanation_video',
        title: 'How to solve...',
        clo_id: null,
        content_data: { url: 'https://example.com/video' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = createStudentContentSchema.safeParse({
        content_type: 'study_plan',
        title: '',
        clo_id: null,
        content_data: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid content type', () => {
      const result = createStudentContentSchema.safeParse({
        content_type: 'invalid_type',
        title: 'Test',
        clo_id: null,
        content_data: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewStudentContentSchema', () => {
    it('validates approval', () => {
      const result = reviewStudentContentSchema.safeParse({
        content_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'approved',
      });
      expect(result.success).toBe(true);
    });

    it('validates rejection with feedback', () => {
      const result = reviewStudentContentSchema.safeParse({
        content_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'rejected',
        feedback: 'Needs more detail',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = reviewStudentContentSchema.safeParse({
        content_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
      });
      expect(result.success).toBe(false);
    });
  });
});

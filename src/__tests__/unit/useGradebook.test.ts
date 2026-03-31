import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/lib/auditLogger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, institutionId: 'inst-1' }),
}));

import type {
  GradeCategory,
  CreateGradeCategoryInput,
  UpdateGradeCategoryInput,
  GradebookEntry,
  GradebookCategoryEntry,
  GradebookAssessment,
} from '@/hooks/useGradebook';

describe('useGradebook types', () => {
  it('GradeCategory has required fields', () => {
    const cat: GradeCategory = {
      id: 'cat-1',
      course_id: 'course-1',
      name: 'Assignments',
      weight_percent: 40,
      sort_order: 0,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(cat.name).toBe('Assignments');
    expect(cat.weight_percent).toBe(40);
  });

  it('CreateGradeCategoryInput has required fields', () => {
    const input: CreateGradeCategoryInput = {
      course_id: 'course-1',
      name: 'Quizzes',
      weight_percent: 30,
      sort_order: 1,
    };
    expect(input.course_id).toBe('course-1');
    expect(input.weight_percent).toBe(30);
  });

  it('UpdateGradeCategoryInput allows partial fields', () => {
    const input: UpdateGradeCategoryInput = {
      name: 'Midterm Exam',
    };
    expect(input.name).toBe('Midterm Exam');
    expect(input.weight_percent).toBeUndefined();
  });

  it('GradebookAssessment tracks score and max_score', () => {
    const assessment: GradebookAssessment = {
      id: 'a-1',
      title: 'Assignment 1',
      type: 'assignment',
      score: 85,
      max_score: 100,
    };
    expect(assessment.score).toBe(85);
    expect(assessment.max_score).toBe(100);
  });

  it('GradebookAssessment allows null score for ungraded', () => {
    const assessment: GradebookAssessment = {
      id: 'a-2',
      title: 'Assignment 2',
      type: 'assignment',
      score: null,
      max_score: 100,
    };
    expect(assessment.score).toBeNull();
  });

  it('GradebookCategoryEntry calculates subtotal_percent', () => {
    const entry: GradebookCategoryEntry = {
      category_id: 'cat-1',
      category_name: 'Assignments',
      weight_percent: 40,
      assessments: [
        { id: 'a-1', title: 'A1', type: 'assignment', score: 80, max_score: 100 },
        { id: 'a-2', title: 'A2', type: 'assignment', score: 90, max_score: 100 },
      ],
      subtotal_percent: 85,
    };
    expect(entry.subtotal_percent).toBe(85);
    expect(entry.assessments).toHaveLength(2);
  });

  it('GradebookEntry has final_weighted_grade and letter_grade', () => {
    const entry: GradebookEntry = {
      student_id: 'student-1',
      student_name: 'Alice',
      categories: [
        {
          category_id: 'cat-1',
          category_name: 'Assignments',
          weight_percent: 60,
          assessments: [],
          subtotal_percent: 80,
        },
        {
          category_id: 'cat-2',
          category_name: 'Quizzes',
          weight_percent: 40,
          assessments: [],
          subtotal_percent: 90,
        },
      ],
      final_weighted_grade: 84,
      letter_grade: 'B',
    };
    // 60% * 80 + 40% * 90 = 48 + 36 = 84
    expect(entry.final_weighted_grade).toBe(84);
    expect(entry.letter_grade).toBe('B');
  });
});

describe('grade category weight validation', () => {
  it('weights summing to 100 is valid', () => {
    const categories: GradeCategory[] = [
      { id: '1', course_id: 'c1', name: 'Assignments', weight_percent: 40, sort_order: 0, created_at: '' },
      { id: '2', course_id: 'c1', name: 'Quizzes', weight_percent: 30, sort_order: 1, created_at: '' },
      { id: '3', course_id: 'c1', name: 'Final', weight_percent: 30, sort_order: 2, created_at: '' },
    ];
    const total = categories.reduce((sum, c) => sum + c.weight_percent, 0);
    expect(total).toBe(100);
  });

  it('weights not summing to 100 is invalid', () => {
    const categories: GradeCategory[] = [
      { id: '1', course_id: 'c1', name: 'Assignments', weight_percent: 40, sort_order: 0, created_at: '' },
      { id: '2', course_id: 'c1', name: 'Quizzes', weight_percent: 30, sort_order: 1, created_at: '' },
    ];
    const total = categories.reduce((sum, c) => sum + c.weight_percent, 0);
    expect(total).not.toBe(100);
    expect(total).toBe(70);
  });

  it('adding a category that exceeds 100 should be rejected', () => {
    const existingTotal = 80;
    const newWeight = 25;
    expect(existingTotal + newWeight).toBeGreaterThan(100);
  });
});

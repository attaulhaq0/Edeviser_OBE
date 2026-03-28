// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

// Mock supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

const chainable = () => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainable()),
  },
}));

vi.mock('@/lib/auditLogger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, institutionId: 'inst-1' }),
}));

import type {
  CourseSection,
  CourseSectionWithTeacher,
  CreateCourseSectionInput,
  UpdateCourseSectionInput,
} from '@/hooks/useCourseSections';

describe('useCourseSections types', () => {
  it('CourseSection has required fields', () => {
    const section: CourseSection = {
      id: 'sec-1',
      course_id: 'course-1',
      section_code: 'A',
      teacher_id: 'teacher-1',
      capacity: 40,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(section.id).toBe('sec-1');
    expect(section.section_code).toBe('A');
    expect(section.capacity).toBe(40);
    expect(section.is_active).toBe(true);
  });

  it('CourseSectionWithTeacher includes teacher profile', () => {
    const section: CourseSectionWithTeacher = {
      id: 'sec-1',
      course_id: 'course-1',
      section_code: 'B',
      teacher_id: 'teacher-2',
      capacity: 35,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      profiles: { id: 'teacher-2', full_name: 'Dr. Smith', email: 'smith@uni.edu' },
    };
    expect(section.profiles?.full_name).toBe('Dr. Smith');
  });

  it('CourseSectionWithTeacher allows null profiles', () => {
    const section: CourseSectionWithTeacher = {
      id: 'sec-2',
      course_id: 'course-1',
      section_code: 'C',
      teacher_id: 'teacher-3',
      capacity: 30,
      is_active: false,
      created_at: '2025-01-01T00:00:00Z',
      profiles: null,
    };
    expect(section.profiles).toBeNull();
  });

  it('CreateCourseSectionInput has required fields', () => {
    const input: CreateCourseSectionInput = {
      course_id: 'course-1',
      section_code: 'A',
      teacher_id: 'teacher-1',
      capacity: 40,
    };
    expect(input.course_id).toBe('course-1');
    expect(input.section_code).toBe('A');
    expect(input.is_active).toBeUndefined();
  });

  it('CreateCourseSectionInput allows optional is_active', () => {
    const input: CreateCourseSectionInput = {
      course_id: 'course-1',
      section_code: 'B',
      teacher_id: 'teacher-2',
      capacity: 35,
      is_active: false,
    };
    expect(input.is_active).toBe(false);
  });

  it('UpdateCourseSectionInput allows partial fields', () => {
    const input: UpdateCourseSectionInput = {
      capacity: 50,
    };
    expect(input.capacity).toBe(50);
    expect(input.section_code).toBeUndefined();
  });

  it('UpdateCourseSectionInput allows is_active toggle', () => {
    const input: UpdateCourseSectionInput = {
      is_active: false,
    };
    expect(input.is_active).toBe(false);
  });
});

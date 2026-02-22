import { describe, it, expect } from 'vitest';
import { escapeCsvField, buildMatrixCsv } from '@/lib/exportCurriculumMatrixCsv';
import type { CurriculumMatrixData } from '@/hooks/useCurriculumMatrix';
import type { LearningOutcome, Course } from '@/types/app';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makePlo = (overrides: Partial<LearningOutcome> = {}): LearningOutcome => ({
  id: 'plo-1',
  type: 'PLO',
  title: 'Critical Thinking',
  description: null,
  institution_id: 'inst-1',
  program_id: 'prog-1',
  course_id: null,
  blooms_level: null,
  sort_order: 1,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1',
  name: 'Data Structures',
  code: 'CS201',
  program_id: 'prog-1',
  semester_id: 'sem-1',
  teacher_id: 'teacher-1',
  institution_id: 'inst-1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// ─── escapeCsvField ─────────────────────────────────────────────────────────

describe('escapeCsvField', () => {
  it('returns plain text unchanged', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('wraps fields containing commas in double-quotes', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  });

  it('escapes double-quotes by doubling them', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps fields containing newlines', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

// ─── buildMatrixCsv ─────────────────────────────────────────────────────────

describe('buildMatrixCsv', () => {
  it('generates correct CSV for a simple 2×2 matrix', () => {
    const plos = [
      makePlo({ id: 'plo-1', title: 'Critical Thinking' }),
      makePlo({ id: 'plo-2', title: 'Communication', sort_order: 2 }),
    ];
    const courses = [
      makeCourse({ id: 'c1', code: 'CS201' }),
      makeCourse({ id: 'c2', code: 'CS301' }),
    ];
    const data: CurriculumMatrixData = {
      plos,
      courses,
      matrix: {
        'plo-1': {
          c1: { cloCount: 3, coveragePercent: 100, status: 'green' },
          c2: { cloCount: 0, coveragePercent: 0, status: 'gray' },
        },
        'plo-2': {
          c1: { cloCount: 1, coveragePercent: 100, status: 'green' },
          c2: { cloCount: 2, coveragePercent: 100, status: 'green' },
        },
      },
    };

    const csv = buildMatrixCsv(data);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('PLO,CS201,CS301');
    expect(lines[1]).toBe('Critical Thinking,3,0');
    expect(lines[2]).toBe('Communication,1,2');
  });

  it('handles PLO titles with commas by escaping them', () => {
    const data: CurriculumMatrixData = {
      plos: [makePlo({ id: 'plo-1', title: 'Analyze, Evaluate, Create' })],
      courses: [makeCourse({ id: 'c1', code: 'CS101' })],
      matrix: {
        'plo-1': {
          c1: { cloCount: 2, coveragePercent: 100, status: 'green' },
        },
      },
    };

    const csv = buildMatrixCsv(data);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('"Analyze, Evaluate, Create",2');
  });

  it('defaults to 0 when a matrix cell is missing', () => {
    const data: CurriculumMatrixData = {
      plos: [makePlo({ id: 'plo-1', title: 'PLO A' })],
      courses: [makeCourse({ id: 'c1', code: 'CS101' })],
      matrix: {}, // empty matrix
    };

    const csv = buildMatrixCsv(data);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('PLO A,0');
  });

  it('produces header-only CSV when there are no PLOs', () => {
    const data: CurriculumMatrixData = {
      plos: [],
      courses: [makeCourse({ id: 'c1', code: 'CS101' })],
      matrix: {},
    };

    const csv = buildMatrixCsv(data);
    expect(csv).toBe('PLO,CS101');
  });
});

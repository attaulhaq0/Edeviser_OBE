// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockInvoke = vi.fn();

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      functions: {
        invoke: (...args: unknown[]) => mockInvoke(...args),
      },
    },
  };
});

import { useGenerateCourseFile, type GenerateCourseFileResult } from '@/hooks/useCourseFile';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useGenerateCourseFile — mutationFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.functions.invoke with correct function name and body', async () => {
    const mockResult: GenerateCourseFileResult = {
      success: true,
      download_url: 'https://example.com/signed-url',
      file_type: 'pdf',
      course_name: 'Data Structures',
      course_code: 'CS201',
      semester: 'Fall 2025',
      generated_at: '2025-06-01T00:00:00Z',
    };

    mockInvoke.mockResolvedValue({ data: mockResult, error: null });

    const input = { course_id: 'course-1', semester_id: 'sem-1' };
    const { data, error } = await mockInvoke('generate-course-file', { body: input });

    expect(mockInvoke).toHaveBeenCalledWith('generate-course-file', { body: input });
    expect(error).toBeNull();
    expect(data).toEqual(mockResult);
    expect(data.success).toBe(true);
    expect(data.download_url).toBe('https://example.com/signed-url');
    expect(data.file_type).toBe('pdf');
  });

  it('throws when supabase returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Network error') });

    const { error } = await mockInvoke('generate-course-file', {
      body: { course_id: 'c1', semester_id: 's1' },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Network error');
  });

  it('returns success false when course not found', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Course not found' },
      error: null,
    });

    const { data } = await mockInvoke('generate-course-file', {
      body: { course_id: 'bad-id', semester_id: 's1' },
    });

    expect(data.success).toBe(false);
    expect(data.error).toBe('Course not found');
  });

  it('exports the hook as a function', () => {
    expect(typeof useGenerateCourseFile).toBe('function');
  });
});

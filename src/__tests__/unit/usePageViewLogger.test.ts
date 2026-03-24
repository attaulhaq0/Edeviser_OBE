import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockLogActivity = vi.fn();
vi.mock('@/lib/activityLogger', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

let mockPathname = '/student/dashboard';
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

let mockProfile: { id: string; role: string } | null = null;
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

// We need renderHook from testing-library
import { renderHook } from '@testing-library/react';
import { usePageViewLogger } from '@/hooks/usePageViewLogger';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('usePageViewLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/student/dashboard';
    mockProfile = null;
  });

  it('logs page_view when student navigates', () => {
    mockProfile = { id: 'student-1', role: 'student' };
    renderHook(() => usePageViewLogger());

    expect(mockLogActivity).toHaveBeenCalledWith({
      student_id: 'student-1',
      event_type: 'page_view',
      metadata: { path: '/student/dashboard' },
    });
  });

  it('does not log when profile is null', () => {
    mockProfile = null;
    renderHook(() => usePageViewLogger());

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('does not log for non-student roles', () => {
    mockProfile = { id: 'teacher-1', role: 'teacher' };
    renderHook(() => usePageViewLogger());

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('does not log duplicate for same pathname', () => {
    mockProfile = { id: 'student-1', role: 'student' };
    const { rerender } = renderHook(() => usePageViewLogger());

    expect(mockLogActivity).toHaveBeenCalledTimes(1);

    // Re-render with same pathname
    rerender();
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });
});

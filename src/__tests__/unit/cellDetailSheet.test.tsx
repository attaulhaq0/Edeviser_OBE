import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock useCellDetail hook
// ---------------------------------------------------------------------------
const mockUseCellDetail = vi.fn();

vi.mock('@/hooks/useCurriculumMatrix', () => ({
  useCellDetail: (...args: unknown[]) => mockUseCellDetail(...args),
}));

import CellDetailSheet from '@/components/shared/CellDetailSheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const basePlo = {
  id: 'plo-1',
  type: 'PLO' as const,
  title: 'PLO: Critical Thinking',
  description: null,
  institution_id: 'inst-1',
  program_id: 'prog-1',
  course_id: null,
  blooms_level: null,
  sort_order: 1,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const baseCourse = {
  id: 'course-1',
  name: 'Data Structures',
  code: 'CS201',
  program_id: 'prog-1',
  teacher_id: 'teacher-1',
  institution_id: 'inst-1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const makeClo = (overrides: Record<string, unknown> = {}) => ({
  id: 'clo-1',
  type: 'CLO' as const,
  title: 'Implement sorting algorithms',
  description: null,
  institution_id: 'inst-1',
  program_id: null,
  course_id: 'course-1',
  blooms_level: 'Applying' as const,
  sort_order: 1,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CellDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing visible when closed', () => {
    mockUseCellDetail.mockReturnValue({ data: undefined, isLoading: false });

    const { container } = render(
      <CellDetailSheet ploId="plo-1" courseId="course-1" open={false} onOpenChange={() => {}} />,
    );

    expect(container.querySelector('[data-slot="sheet-content"]')).toBeNull();
  });

  it('shows shimmer placeholders while loading', () => {
    mockUseCellDetail.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <CellDetailSheet ploId="plo-1" courseId="course-1" open={true} onOpenChange={() => {}} />,
    );

    // Shimmer elements should be present (they render as divs with animate-pulse)
    const shimmers = document.querySelectorAll('.animate-pulse');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it('displays PLO title and course code when data is loaded', () => {
    mockUseCellDetail.mockReturnValue({
      data: { plo: basePlo, course: baseCourse, clos: [makeClo()] },
      isLoading: false,
    });

    render(
      <CellDetailSheet ploId="plo-1" courseId="course-1" open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByText('PLO: Critical Thinking')).toBeInTheDocument();
    expect(screen.getByText(/CS201/)).toBeInTheDocument();
  });

  it('renders CLO list with Bloom\'s level badge', () => {
    const clos = [
      makeClo({ id: 'clo-1', title: 'Implement sorting algorithms', blooms_level: 'Applying' }),
      makeClo({ id: 'clo-2', title: 'Analyze time complexity', blooms_level: 'Analyzing', sort_order: 2 }),
    ];

    mockUseCellDetail.mockReturnValue({
      data: { plo: basePlo, course: baseCourse, clos },
      isLoading: false,
    });

    render(
      <CellDetailSheet ploId="plo-1" courseId="course-1" open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByText('Implement sorting algorithms')).toBeInTheDocument();
    expect(screen.getByText('Analyze time complexity')).toBeInTheDocument();
    expect(screen.getByText('Applying')).toBeInTheDocument();
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
    expect(screen.getByText('Mapped CLOs (2)')).toBeInTheDocument();
  });

  it('shows empty state when no CLOs are mapped', () => {
    mockUseCellDetail.mockReturnValue({
      data: { plo: basePlo, course: baseCourse, clos: [] },
      isLoading: false,
    });

    render(
      <CellDetailSheet ploId="plo-1" courseId="course-1" open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByText('No CLOs mapped to this PLO in this course.')).toBeInTheDocument();
  });

  it('disables query when sheet is closed by passing undefined ids', () => {
    mockUseCellDetail.mockReturnValue({ data: undefined, isLoading: false });

    render(
      <CellDetailSheet ploId="plo-1" courseId="course-1" open={false} onOpenChange={() => {}} />,
    );

    // When open=false, the hook should receive undefined for both ids
    expect(mockUseCellDetail).toHaveBeenCalledWith(undefined, undefined);
  });
});

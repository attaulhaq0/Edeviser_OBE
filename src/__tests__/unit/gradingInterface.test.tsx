import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseSubmission = vi.fn();
vi.mock('@/hooks/useSubmissions', () => ({
  useSubmission: (...args: unknown[]) => mockUseSubmission(...args),
}));

const mockUseRubric = vi.fn();
vi.mock('@/hooks/useRubrics', () => ({
  useRubric: (...args: unknown[]) => mockUseRubric(...args),
}));

const mockUseGrade = vi.fn();
const mockMutate = vi.fn();
vi.mock('@/hooks/useGrades', () => ({
  useGrade: (...args: unknown[]) => mockUseGrade(...args),
  useCreateGrade: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, profile: null, role: 'teacher' }),
}));

// Mock the internal useQuery for useAssignmentForRubric
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return { ...actual, useQuery: (...args: unknown[]) => mockUseQuery(...args) };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    assignments: {
      detail: (id: string) => ['assignments', 'detail', id],
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseSubmission = {
  id: 'sub-1',
  assignment_id: 'assign-1',
  student_id: 'student-1',
  file_url: 'https://storage.example.com/file.pdf',
  is_late: false,
  created_at: '2024-06-15T10:30:00Z',
  institution_id: 'inst-1',
  profiles: { id: 'student-1', full_name: 'Alice Johnson', email: 'alice@example.com' },
  assignments: { id: 'assign-1', title: 'Essay Assignment', total_marks: 100, course_id: 'course-1' },
  grades: null,
};

const baseAssignment = {
  id: 'assign-1',
  title: 'Essay Assignment',
  total_marks: 100,
  rubric_id: 'rubric-1',
};

const baseRubric = {
  id: 'rubric-1',
  title: 'Essay Rubric',
  clo_id: 'clo-1',
  is_template: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  criteria: [
    {
      id: 'c1',
      rubric_id: 'rubric-1',
      criterion_name: 'Clarity',
      sort_order: 0,
      levels: [
        { label: 'Developing', description: 'Needs improvement', points: 10 },
        { label: 'Proficient', description: 'Meets expectations', points: 30 },
        { label: 'Exemplary', description: 'Exceeds expectations', points: 50 },
      ],
      max_points: 50,
    },
    {
      id: 'c2',
      rubric_id: 'rubric-1',
      criterion_name: 'Grammar',
      sort_order: 1,
      levels: [
        { label: 'Developing', description: 'Many errors', points: 10 },
        { label: 'Proficient', description: 'Few errors', points: 30 },
        { label: 'Exemplary', description: 'No errors', points: 50 },
      ],
      max_points: 50,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper to render with router context
// ---------------------------------------------------------------------------

const renderGradingInterface = async () => {
  const GradingInterface = (await import('@/pages/teacher/grading/GradingInterface')).default;
  return render(
    <MemoryRouter initialEntries={['/teacher/grading/sub-1']}>
      <Routes>
        <Route path="/teacher/grading/:submissionId" element={<GradingInterface />} />
      </Routes>
    </MemoryRouter>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradingInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: useQuery returns the assignment (useAssignmentForRubric)
    mockUseQuery.mockReturnValue({
      data: baseAssignment,
      isLoading: false,
    });

    mockUseSubmission.mockReturnValue({
      data: baseSubmission,
      isLoading: false,
    });

    mockUseRubric.mockReturnValue({
      data: baseRubric,
      isLoading: false,
    });

    mockUseGrade.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it('renders the page title for ungraded submission', async () => {
    await renderGradingInterface();
    expect(screen.getByText('Grade Submission')).toBeInTheDocument();
  });

  it('displays student name and email', async () => {
    await renderGradingInterface();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('displays assignment title and total marks', async () => {
    await renderGradingInterface();
    expect(screen.getByText('Essay Assignment')).toBeInTheDocument();
    expect(screen.getByText('Total Marks: 100')).toBeInTheDocument();
  });

  it('displays rubric criteria names', async () => {
    await renderGradingInterface();
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Grammar')).toBeInTheDocument();
  });

  it('displays rubric level headers', async () => {
    await renderGradingInterface();
    // Level labels appear in the header row
    const developingHeaders = screen.getAllByText('Developing');
    expect(developingHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('displays level descriptions in cells', async () => {
    await renderGradingInterface();
    expect(screen.getByText('Needs improvement')).toBeInTheDocument();
    expect(screen.getByText('Meets expectations')).toBeInTheDocument();
    expect(screen.getByText('No errors')).toBeInTheDocument();
  });

  it('displays points badges in cells', async () => {
    await renderGradingInterface();
    const ptsBadges = screen.getAllByText('10 pts');
    expect(ptsBadges.length).toBe(2); // 2 criteria × Developing level
  });

  it('shows late badge when submission is late', async () => {
    mockUseSubmission.mockReturnValue({
      data: { ...baseSubmission, is_late: true },
      isLoading: false,
    });
    await renderGradingInterface();
    expect(screen.getByText('Late Submission')).toBeInTheDocument();
  });

  it('shows file link when file_url is present', async () => {
    await renderGradingInterface();
    expect(screen.getByText('View Submission File')).toBeInTheDocument();
  });

  it('selects a rubric cell on click and shows checkmark', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();

    // Click the "Exceeds expectations" cell for Clarity (50 pts)
    const cell = screen.getByRole('button', {
      name: /Clarity: Exemplary — 50 points/,
    });
    await user.click(cell);

    // The cell should now be pressed
    expect(cell).toHaveAttribute('aria-pressed', 'true');
  });

  it('allows only one selection per criterion', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();

    // Select Developing for Clarity
    const developing = screen.getByRole('button', {
      name: /Clarity: Developing — 10 points/,
    });
    await user.click(developing);
    expect(developing).toHaveAttribute('aria-pressed', 'true');

    // Now select Exemplary for Clarity — should deselect Developing
    const exemplary = screen.getByRole('button', {
      name: /Clarity: Exemplary — 50 points/,
    });
    await user.click(exemplary);
    expect(exemplary).toHaveAttribute('aria-pressed', 'true');
    expect(developing).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles off a cell when clicking the same cell again', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();

    const cell = screen.getByRole('button', {
      name: /Clarity: Proficient — 30 points/,
    });
    await user.click(cell);
    expect(cell).toHaveAttribute('aria-pressed', 'true');

    await user.click(cell);
    expect(cell).toHaveAttribute('aria-pressed', 'false');
  });

  it('auto-calculates total score from selected cells', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();

    // Select Exemplary (50) for Clarity
    await user.click(
      screen.getByRole('button', { name: /Clarity: Exemplary — 50 points/ }),
    );
    // Select Proficient (30) for Grammar
    await user.click(
      screen.getByRole('button', { name: /Grammar: Proficient — 30 points/ }),
    );

    // Total should be 80 / 100
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows "not found" when submission does not exist', async () => {
    mockUseSubmission.mockReturnValue({ data: null, isLoading: false });
    await renderGradingInterface();
    expect(screen.getByText('Submission not found.')).toBeInTheDocument();
  });

  it('shows shimmer loading state', async () => {
    mockUseSubmission.mockReturnValue({ data: null, isLoading: true });
    const { container } = await renderGradingInterface();
    // Shimmer components should be rendered
    const shimmers = container.querySelectorAll('[class*="animate"]');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it('shows read-only mode when grade already exists', async () => {
    mockUseGrade.mockReturnValue({
      data: {
        id: 'grade-1',
        submission_id: 'sub-1',
        rubric_selections: [
          { criterion_id: 'c1', level_index: 2, points: 50 },
          { criterion_id: 'c2', level_index: 1, points: 30 },
        ],
        total_score: 80,
        score_percent: 80,
        overall_feedback: 'Great work!',
        graded_by: 'teacher-1',
        created_at: '2024-06-16T00:00:00Z',
        institution_id: 'inst-1',
      },
      isLoading: false,
    });

    await renderGradingInterface();

    expect(screen.getByText('Grade Review')).toBeInTheDocument();
    expect(screen.getByText('Graded')).toBeInTheDocument();
    expect(screen.getByText('Great work!')).toBeInTheDocument();
    // Submit button should not be present
    expect(screen.queryByText('Submit Grade')).not.toBeInTheDocument();
  });

  it('shows "no rubric" message when rubric is not linked', async () => {
    mockUseRubric.mockReturnValue({ data: null, isLoading: false });
    await renderGradingInterface();
    expect(screen.getByText('No rubric linked to this assignment.')).toBeInTheDocument();
  });

  it('navigates back to queue on Back button click', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();

    const backBtn = screen.getByRole('button', { name: /Back to Queue/ });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/grading');
  });

  it('shows attainment level badge based on score', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();

    // Select both Exemplary (50 + 50 = 100/100 = 100%)
    await user.click(
      screen.getByRole('button', { name: /Clarity: Exemplary — 50 points/ }),
    );
    await user.click(
      screen.getByRole('button', { name: /Grammar: Exemplary — 50 points/ }),
    );

    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });
});

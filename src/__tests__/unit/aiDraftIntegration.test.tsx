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
const mockGradeMutate = vi.fn();
vi.mock('@/hooks/useGrades', () => ({
  useGrade: (...args: unknown[]) => mockUseGrade(...args),
  useCreateGrade: () => ({ mutate: mockGradeMutate, isPending: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, profile: null, role: 'teacher' }),
}));

const mockGenerateMutate = vi.fn();
const mockLogMutate = vi.fn();
vi.mock('@/hooks/useAIFeedbackDraft', () => ({
  useGenerateFeedbackDraft: () => ({
    mutate: mockGenerateMutate,
    isPending: false,
  }),
  useLogDraftAction: () => ({
    mutate: mockLogMutate,
  }),
}));

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
    assignments: { detail: (id: string) => ['assignments', 'detail', id] },
  },
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/predictionValidator', () => ({
  validateAtRiskPredictions: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseSubmission = {
  id: 'sub-1',
  assignment_id: 'assign-1',
  student_id: 'student-1',
  submitted_at: '2024-06-15T10:30:00Z',
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
  clo_weights: [{ clo_id: 'clo-1', weight: 100 }],
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

const mockDraftResponse = {
  criterion_drafts: [
    { criterion_id: 'c1', criterion_title: 'Clarity', draft_comment: 'Excellent work on Clarity.' },
    { criterion_id: 'c2', criterion_title: 'Grammar', draft_comment: 'Grammar needs improvement.' },
  ],
  overall_draft: 'Overall, good submission with areas for improvement.',
};

// ---------------------------------------------------------------------------
// Helper
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

const selectRubricCells = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Clarity: Exemplary — 50 points/ }));
  await user.click(screen.getByRole('button', { name: /Grammar: Proficient — 30 points/ }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AI Draft Integration in GradingInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

  it('does not show Generate AI Draft button when no rubric cells are selected', async () => {
    await renderGradingInterface();
    expect(screen.queryByText('Generate AI Draft')).not.toBeInTheDocument();
  });

  it('shows Generate AI Draft button after selecting rubric cells', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();
    await selectRubricCells(user);
    expect(screen.getByText('Generate AI Draft')).toBeInTheDocument();
  });

  it('does not show Generate AI Draft button in read-only mode', async () => {
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
    expect(screen.queryByText('Generate AI Draft')).not.toBeInTheDocument();
  });

  it('calls generateDraft mutation when Generate AI Draft is clicked', async () => {
    const user = userEvent.setup();
    await renderGradingInterface();
    await selectRubricCells(user);

    await user.click(screen.getByText('Generate AI Draft'));

    expect(mockGenerateMutate).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateMutate.mock.calls[0]!;
    expect(callArgs[0]).toEqual({
      submission_id: 'sub-1',
      rubric_id: 'rubric-1',
      rubric_selections: expect.arrayContaining([
        { criterion_id: 'c1', level_index: 2 },
        { criterion_id: 'c2', level_index: 1 },
      ]),
      student_id: 'student-1',
      clo_id: 'clo-1',
    });
  });

  it('displays AI draft panel after successful generation', async () => {
    const user = userEvent.setup();
    // Make generateDraft call onSuccess immediately
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    // Check the AI Draft panel is visible
    expect(screen.getByText('AI Feedback Drafts')).toBeInTheDocument();
    expect(screen.getByText('Excellent work on Clarity.')).toBeInTheDocument();
    expect(screen.getByText('Grammar needs improvement.')).toBeInTheDocument();
    expect(screen.getByText('Overall, good submission with areas for improvement.')).toBeInTheDocument();
  });

  it('shows AI Draft badges on each criterion draft', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    const draftBadges = screen.getAllByText('AI Draft');
    // At least 2 criterion drafts + 1 overall = 3 AI Draft badges
    expect(draftBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('shows accept/edit/reject controls for pending drafts', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    expect(screen.getByLabelText('Accept draft for Clarity')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit draft for Clarity')).toBeInTheDocument();
    expect(screen.getByLabelText('Reject draft for Clarity')).toBeInTheDocument();
    expect(screen.getByLabelText('Accept draft for Grammar')).toBeInTheDocument();
  });

  it('accepts a draft and populates feedback', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    // Accept the Clarity draft
    await user.click(screen.getByLabelText('Accept draft for Clarity'));

    // Should show Accepted badge
    expect(screen.getByText('Accepted')).toBeInTheDocument();

    // Should log the action
    expect(mockLogMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'student-1',
        suggestion_type: 'feedback_draft',
        validated_outcome: 'accepted',
        feedback: 'thumbs_up',
      }),
    );

    // Feedback textarea should contain the accepted draft
    const textarea = screen.getByPlaceholderText('Provide overall feedback for the student...');
    expect((textarea as HTMLTextAreaElement).value).toContain('[Clarity]: Excellent work on Clarity.');
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    // Click edit on Grammar draft
    await user.click(screen.getByLabelText('Edit draft for Grammar'));

    // Should show a textarea for editing and a Confirm Edit button
    expect(screen.getByText('Confirm Edit')).toBeInTheDocument();
  });

  it('confirms an edited draft and logs as edited', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    // Edit the Grammar draft
    await user.click(screen.getByLabelText('Edit draft for Grammar'));

    // Find the textarea within the editing draft (the one with "Confirm Edit" nearby)
    const confirmBtn = screen.getByText('Confirm Edit');
    const editContainer = confirmBtn.closest('.space-y-2');
    const editTextarea = editContainer?.querySelector('textarea');
    expect(editTextarea).toBeTruthy();

    // Clear and type new text
    await user.clear(editTextarea!);
    await user.type(editTextarea!, 'Revised grammar feedback.');

    // Confirm the edit
    await user.click(confirmBtn);

    // Should log as edited
    expect(mockLogMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestion_type: 'feedback_draft',
        validated_outcome: 'edited',
        feedback: 'thumbs_up',
      }),
    );
  });

  it('rejects a draft and logs as rejected', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    // Reject the Grammar draft
    await user.click(screen.getByLabelText('Reject draft for Grammar'));

    // Should show Rejected badge
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    // Should log as rejected with thumbs_down
    expect(mockLogMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestion_type: 'feedback_draft',
        validated_outcome: 'rejected',
        feedback: 'thumbs_down',
      }),
    );
  });

  it('applies overall draft to feedback textarea when Use button is clicked', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    // Click the "Use" button for overall draft
    await user.click(screen.getByLabelText('Use overall draft as feedback'));

    const textarea = screen.getByPlaceholderText('Provide overall feedback for the student...');
    expect(textarea).toHaveValue('Overall, good submission with areas for improvement.');
    expect(mockToast.success).toHaveBeenCalledWith('Overall draft applied to feedback');
  });

  it('shows error toast when draft generation fails', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onError: (err: Error) => void }) => {
      opts.onError(new Error('Network error'));
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    expect(mockToast.error).toHaveBeenCalledWith('Draft generation failed: Network error');
  });

  it('shows success toast when drafts are generated', async () => {
    const user = userEvent.setup();
    mockGenerateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (data: typeof mockDraftResponse) => void }) => {
      opts.onSuccess(mockDraftResponse);
    });

    await renderGradingInterface();
    await selectRubricCells(user);
    await user.click(screen.getByText('Generate AI Draft'));

    expect(mockToast.success).toHaveBeenCalledWith('AI feedback drafts generated');
  });
});

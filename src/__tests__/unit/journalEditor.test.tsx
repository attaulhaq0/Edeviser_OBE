// =============================================================================
// JournalEditor — Unit tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockCourses = [
  { id: 'c1', name: 'Math 101' },
  { id: 'c2', name: 'Physics 201' },
];

const mockCLOs = [
  {
    id: 'clo-1',
    type: 'CLO' as const,
    title: 'Understand derivatives',
    blooms_level: 'understanding' as const,
    course_id: 'c1',
    description: null,
    institution_id: 'inst-1',
    program_id: null,
    sort_order: 0,
    created_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { role: 'student', institution_id: 'inst-1' },
    role: 'student',
    institutionId: 'inst-1',
  }),
}));

vi.mock('@/hooks/useJournal', () => ({
  useJournalEntry: () => ({ data: null, isLoading: false }),
  useCreateJournalEntry: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateJournalEntry: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useCLOs', () => ({
  useCLOs: (courseId?: string) => ({
    data: courseId === 'c1' ? { data: mockCLOs, count: 1, page: 1, pageSize: 20 } : { data: [], count: 0, page: 1, pageSize: 20 },
    isLoading: false,
  }),
}));

vi.mock('@/pages/student/leaderboard/useStudentCourseProgram', () => ({
  useStudentCourseProgram: () => ({
    courses: mockCourses,
    programs: [],
    isLoading: false,
  }),
}));

vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}));

vi.mock('@/lib/journalPromptGenerator', () => ({
  generateJournalPrompt: () => ({
    promptText: 'Reflect on your understanding of derivatives.',
    questions: [
      { stage: 'Reflective Observation', question: 'What did you find easy?' },
      { stage: 'Abstract Conceptualization', question: 'What principle connects?' },
    ],
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import JournalEditor from '@/pages/student/journal/JournalEditor';

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderEditor = (entryId = 'new') =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[`/student/journal/${entryId}`]}>
        <Routes>
          <Route path="/student/journal/:id" element={<JournalEditor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JournalEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title for new entry', () => {
    renderEditor();
    expect(screen.getByText('New Journal Entry')).toBeInTheDocument();
  });

  it('renders course selector', () => {
    renderEditor();
    expect(screen.getByText('Course')).toBeInTheDocument();
    expect(screen.getByText('Select a course')).toBeInTheDocument();
  });

  it('renders the content textarea', () => {
    renderEditor();
    expect(screen.getByPlaceholderText('Write your reflection here…')).toBeInTheDocument();
  });

  it('renders share toggle', () => {
    renderEditor();
    expect(screen.getByText('Share with teacher')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders save button', () => {
    renderEditor();
    expect(screen.getByText('Save Entry')).toBeInTheDocument();
  });

  it('shows live word count as user types', async () => {
    const user = userEvent.setup();
    renderEditor();
    const textarea = screen.getByPlaceholderText('Write your reflection here…');
    await user.type(textarea, 'Hello world this is a test');
    expect(screen.getByTestId('word-count')).toHaveTextContent('6 words');
  });

  it('shows live character count as user types', async () => {
    const user = userEvent.setup();
    renderEditor();
    const textarea = screen.getByPlaceholderText('Write your reflection here…');
    await user.type(textarea, 'Hello');
    expect(screen.getByText('5 characters')).toBeInTheDocument();
  });

  it('renders back button that navigates to journal list', async () => {
    const user = userEvent.setup();
    renderEditor();
    const backBtn = screen.getByRole('button', { name: '' });
    // The first ghost button is the back button
    const buttons = screen.getAllByRole('button');
    const backButton = buttons[0];
    await user.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/student/journal');
  });

  it('shows contextual prompt when CLO is selected', async () => {
    renderEditor();

    // Select a course first — use fireEvent for Radix Select
    const courseTrigger = screen.getByText('Select a course').closest('button');
    fireEvent.click(courseTrigger!);
    // Radix renders both <option> and <span> — target the select item role
    const mathOptions = screen.getAllByText('Math 101');
    const mathItem = mathOptions.find((el) => el.closest('[data-slot="select-item"]'));
    fireEvent.click(mathItem ?? mathOptions[0]);

    // Now CLO selector should appear
    expect(screen.getByText('Learning Outcome (optional)')).toBeInTheDocument();

    // Select a CLO
    const cloTrigger = screen.getByText('Select a CLO for guided prompts').closest('button');
    fireEvent.click(cloTrigger!);
    const cloOptions = screen.getAllByText('Understand derivatives');
    const cloItem = cloOptions.find((el) => el.closest('[data-slot="select-item"]'));
    fireEvent.click(cloItem ?? cloOptions[0]);

    // Prompt should appear
    expect(screen.getByText('Reflection Prompt')).toBeInTheDocument();
    expect(screen.getByText('Reflect on your understanding of derivatives.')).toBeInTheDocument();
    expect(screen.getByText('Reflective Observation')).toBeInTheDocument();
    expect(screen.getByText('Abstract Conceptualization')).toBeInTheDocument();
  });

  it('dismisses prompt when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    // Select course and CLO to trigger prompt
    const courseTrigger = screen.getByText('Select a course').closest('button');
    fireEvent.click(courseTrigger!);
    const mathOptions = screen.getAllByText('Math 101');
    const mathItem = mathOptions.find((el) => el.closest('[data-slot="select-item"]'));
    fireEvent.click(mathItem ?? mathOptions[0]);

    const cloTrigger = screen.getByText('Select a CLO for guided prompts').closest('button');
    fireEvent.click(cloTrigger!);
    const cloOptions = screen.getAllByText('Understand derivatives');
    const cloItem = cloOptions.find((el) => el.closest('[data-slot="select-item"]'));
    fireEvent.click(cloItem ?? cloOptions[0]);

    // Prompt should be visible
    expect(screen.getByText('Reflection Prompt')).toBeInTheDocument();

    // Dismiss it
    await user.click(screen.getByLabelText('Dismiss prompt'));

    // Prompt should be gone
    expect(screen.queryByText('Reflection Prompt')).not.toBeInTheDocument();
  });
});

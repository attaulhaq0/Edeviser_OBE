import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionCompletionForm from '@/components/shared/SessionCompletionForm';
import type { StudySession } from '@/types/planner';

const mockSession: StudySession = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  studentId: 'student-1',
  courseId: 'course-1',
  courseName: 'Data Structures',
  title: 'Review Binary Trees',
  description: null,
  plannedDate: '2025-06-20',
  plannedStartTime: '10:00',
  plannedDurationMinutes: 60,
  actualStartAt: '2025-06-20T10:00:00Z',
  actualEndAt: null,
  actualDurationMinutes: null,
  timerMode: 'pomodoro',
  status: 'in_progress',
  satisfactionRating: null,
  cloIds: null,
  createdAt: '2025-06-20T09:00:00Z',
};

describe('SessionCompletionForm', () => {
  const defaultProps = {
    session: mockSession,
    actualDurationMinutes: 45,
    onSubmit: vi.fn(),
    onSkip: vi.fn(),
    isSubmitting: false,
  };

  it('renders the session summary with title, course, and duration', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    expect(screen.getByText('Review Binary Trees')).toBeInTheDocument();
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('renders the "Session Complete" header', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    expect(screen.getByText('Session Complete')).toBeInTheDocument();
  });

  it('renders session notes textarea', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(
        'What did you work on? Any key takeaways?',
      ),
    ).toBeInTheDocument();
  });

  it('renders evidence uploader', async () => {
    render(<SessionCompletionForm {...defaultProps} />);

    // Evidence uploader is hidden behind "Attach Files…" button
    const attachButton = screen.getByRole('button', { name: /attach files/i });
    await userEvent.click(attachButton);

    expect(
      screen.getByTestId('evidence-uploader'),
    ).toBeInTheDocument();
  });

  it('renders 5 star rating buttons', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(5);
  });

  it('renders session reflection input', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    expect(
      screen.getByTestId('session-reflection-input'),
    ).toBeInTheDocument();
  });

  it('renders Submit and Skip buttons', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /submit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip/i }),
    ).toBeInTheDocument();
  });

  it('calls onSkip when Skip button is clicked', async () => {
    const onSkip = vi.fn();
    render(<SessionCompletionForm {...defaultProps} onSkip={onSkip} />);

    await userEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('calls onSubmit with form data when Submit is clicked', async () => {
    const onSubmit = vi.fn();
    render(<SessionCompletionForm {...defaultProps} onSubmit={onSubmit} />);

    // Type notes
    const notesInput = screen.getByPlaceholderText(
      'What did you work on? Any key takeaways?',
    );
    await userEvent.type(notesInput, 'Covered tree traversal algorithms');

    // Click 4th star
    const stars = screen.getAllByRole('radio');
    await userEvent.click(stars[3]!);

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith({
        notes: 'Covered tree traversal algorithms',
        satisfactionRating: 4,
        reflectionContent: null,
        evidenceFiles: [],
        quickThought: null,
      });
    });
  });

  it('submits with null notes when notes field is empty', async () => {
    const onSubmit = vi.fn();
    render(<SessionCompletionForm {...defaultProps} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      );
    });
  });

  it('toggles star rating off when clicking the same star twice', async () => {
    const onSubmit = vi.fn();
    render(<SessionCompletionForm {...defaultProps} onSubmit={onSubmit} />);

    const stars = screen.getAllByRole('radio');
    // Click 3rd star to select
    await userEvent.click(stars[2]!);
    // Click 3rd star again to deselect
    await userEvent.click(stars[2]!);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ satisfactionRating: null }),
      );
    });
  });

  it('disables buttons when isSubmitting is true', () => {
    render(<SessionCompletionForm {...defaultProps} isSubmitting />);

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /skip/i })).toBeDisabled();
  });

  it('includes reflection content when provided', async () => {
    const onSubmit = vi.fn();
    render(<SessionCompletionForm {...defaultProps} onSubmit={onSubmit} />);

    const reflectionInput = screen.getByPlaceholderText(
      /reflect on your session/i,
    );
    await userEvent.type(
      reflectionInput,
      'I learned a lot about binary search trees and their traversal methods today during this session',
    );

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          reflectionContent: expect.stringContaining('binary search trees'),
        }),
      );
    });
  });

  it('renders without course name when not provided', () => {
    const sessionNoCourse = { ...mockSession, courseName: undefined };
    render(
      <SessionCompletionForm
        {...defaultProps}
        session={sessionNoCourse}
      />,
    );

    expect(screen.getByText('Review Binary Trees')).toBeInTheDocument();
    expect(screen.queryByText('Data Structures')).not.toBeInTheDocument();
  });

  it('star rating has proper aria attributes', () => {
    render(<SessionCompletionForm {...defaultProps} />);

    const radioGroup = screen.getByRole('radiogroup', {
      name: /satisfaction rating/i,
    });
    expect(radioGroup).toBeInTheDocument();

    const stars = screen.getAllByRole('radio');
    expect(stars[0]).toHaveAttribute('aria-label', '1 star');
    expect(stars[1]).toHaveAttribute('aria-label', '2 stars');
  });
});

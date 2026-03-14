// @vitest-environment happy-dom
// =============================================================================
// GoalSuggestionPanel — Unit tests
// Goal suggestion rendering, difficulty badges, accept/edit/dismiss actions
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalSuggestionPanel, {
  type GoalSuggestion,
  type GoalSuggestionPanelProps,
} from '@/components/shared/GoalSuggestionPanel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSuggestion = (
  overrides: Partial<GoalSuggestion> = {},
): GoalSuggestion => ({
  id: crypto.randomUUID(),
  goal_text: 'Complete 3 practice problems this week',
  difficulty: 'moderate',
  cohort_completion_rate: 65,
  status: 'suggested',
  ...overrides,
});

const threeSuggestions: GoalSuggestion[] = [
  makeSuggestion({
    id: 'goal-1',
    goal_text: 'Review lecture notes for Chapter 5',
    difficulty: 'easy',
    cohort_completion_rate: 90,
  }),
  makeSuggestion({
    id: 'goal-2',
    goal_text: 'Complete 3 practice problems this week',
    difficulty: 'moderate',
    cohort_completion_rate: 65,
  }),
  makeSuggestion({
    id: 'goal-3',
    goal_text: 'Write a draft essay on topic X',
    difficulty: 'ambitious',
    cohort_completion_rate: 30,
  }),
];

const defaultProps: GoalSuggestionPanelProps = {
  suggestions: threeSuggestions,
  onAccept: vi.fn(),
  onEdit: vi.fn(),
  onDismiss: vi.fn(),
};

const renderPanel = (overrides: Partial<GoalSuggestionPanelProps> = {}) =>
  render(<GoalSuggestionPanel {...defaultProps} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GoalSuggestionPanel', () => {
  // ── Rendering 3 goal suggestions ───────────────────────────────────────

  describe('goal suggestion rendering', () => {
    it('renders the "Suggested Goals" heading', () => {
      renderPanel();
      expect(screen.getByText('Suggested Goals')).toBeTruthy();
    });

    it('renders all 3 goal texts', () => {
      renderPanel();
      expect(screen.getByText('Review lecture notes for Chapter 5')).toBeTruthy();
      expect(screen.getByText('Complete 3 practice problems this week')).toBeTruthy();
      expect(screen.getByText('Write a draft essay on topic X')).toBeTruthy();
    });

    it('renders cohort completion rate for each goal', () => {
      renderPanel();
      expect(screen.getByText('90% of similar students completed this type of goal')).toBeTruthy();
      expect(screen.getByText('65% of similar students completed this type of goal')).toBeTruthy();
      expect(screen.getByText('30% of similar students completed this type of goal')).toBeTruthy();
    });

    it('renders the AI description text', () => {
      renderPanel();
      expect(
        screen.getByText('AI-suggested goals based on your courses and progress. Accept, edit, or dismiss.'),
      ).toBeTruthy();
    });
  });

  // ── Difficulty badges ──────────────────────────────────────────────────

  describe('difficulty badges', () => {
    it('renders Easy badge for easy difficulty', () => {
      renderPanel();
      expect(screen.getByText('Easy')).toBeTruthy();
    });

    it('renders Moderate badge for moderate difficulty', () => {
      renderPanel();
      expect(screen.getByText('Moderate')).toBeTruthy();
    });

    it('renders Ambitious badge for ambitious difficulty', () => {
      renderPanel();
      expect(screen.getByText('Ambitious')).toBeTruthy();
    });
  });

  // ── Accept action ─────────────────────────────────────────────────────

  describe('accept action', () => {
    it('renders Accept buttons for each suggestion', () => {
      renderPanel();
      const acceptButtons = screen.getAllByText('Accept');
      expect(acceptButtons).toHaveLength(3);
    });

    it('calls onAccept with the correct goal id', async () => {
      const onAccept = vi.fn();
      renderPanel({ onAccept });
      const acceptButtons = screen.getAllByText('Accept');
      await userEvent.click(acceptButtons[0]);
      expect(onAccept).toHaveBeenCalledWith('goal-1');
    });

    it('calls onAccept with second goal id', async () => {
      const onAccept = vi.fn();
      renderPanel({ onAccept });
      const acceptButtons = screen.getAllByText('Accept');
      await userEvent.click(acceptButtons[1]);
      expect(onAccept).toHaveBeenCalledWith('goal-2');
    });
  });

  // ── Edit action ────────────────────────────────────────────────────────

  describe('edit action', () => {
    it('renders Edit buttons for each suggestion', () => {
      renderPanel();
      const editButtons = screen.getAllByText('Edit');
      expect(editButtons).toHaveLength(3);
    });

    it('calls onEdit with the correct goal id', async () => {
      const onEdit = vi.fn();
      renderPanel({ onEdit });
      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[2]);
      expect(onEdit).toHaveBeenCalledWith('goal-3');
    });
  });

  // ── Dismiss action ────────────────────────────────────────────────────

  describe('dismiss action', () => {
    it('renders Dismiss buttons for each suggestion', () => {
      renderPanel();
      const dismissButtons = screen.getAllByText('Dismiss');
      expect(dismissButtons).toHaveLength(3);
    });

    it('calls onDismiss with the correct goal id', async () => {
      const onDismiss = vi.fn();
      renderPanel({ onDismiss });
      const dismissButtons = screen.getAllByText('Dismiss');
      await userEvent.click(dismissButtons[1]);
      expect(onDismiss).toHaveBeenCalledWith('goal-2');
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders nothing when suggestions array is empty', () => {
      const { container } = renderPanel({ suggestions: [] });
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when all suggestions are dismissed', () => {
      const dismissed = threeSuggestions.map((s) => ({
        ...s,
        status: 'dismissed' as const,
      }));
      const { container } = renderPanel({ suggestions: dismissed });
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when all suggestions are accepted', () => {
      const accepted = threeSuggestions.map((s) => ({
        ...s,
        status: 'accepted' as const,
      }));
      const { container } = renderPanel({ suggestions: accepted });
      expect(container.innerHTML).toBe('');
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders loading text when isLoading is true', () => {
      renderPanel({ isLoading: true });
      expect(screen.getByText('Generating goal suggestions...')).toBeTruthy();
    });

    it('renders shimmer placeholders when loading', () => {
      const { container } = renderPanel({ isLoading: true });
      const shimmers = container.querySelectorAll('.animate-shimmer');
      expect(shimmers.length).toBe(3);
    });

    it('does not render goal texts when loading', () => {
      renderPanel({ isLoading: true });
      expect(screen.queryByText('Review lecture notes for Chapter 5')).toBeNull();
    });
  });

  // ── Filters only active suggestions ───────────────────────────────────

  describe('filters non-suggested goals', () => {
    it('only renders goals with status "suggested"', () => {
      const mixed: GoalSuggestion[] = [
        makeSuggestion({ id: 'g1', goal_text: 'Active goal', status: 'suggested' }),
        makeSuggestion({ id: 'g2', goal_text: 'Accepted goal', status: 'accepted' }),
        makeSuggestion({ id: 'g3', goal_text: 'Dismissed goal', status: 'dismissed' }),
      ];
      renderPanel({ suggestions: mixed });
      expect(screen.getByText('Active goal')).toBeTruthy();
      expect(screen.queryByText('Accepted goal')).toBeNull();
      expect(screen.queryByText('Dismissed goal')).toBeNull();
    });

    it('renders correct number of action button sets for filtered suggestions', () => {
      const mixed: GoalSuggestion[] = [
        makeSuggestion({ id: 'g1', status: 'suggested' }),
        makeSuggestion({ id: 'g2', status: 'accepted' }),
      ];
      renderPanel({ suggestions: mixed });
      expect(screen.getAllByText('Accept')).toHaveLength(1);
      expect(screen.getAllByText('Edit')).toHaveLength(1);
      expect(screen.getAllByText('Dismiss')).toHaveLength(1);
    });
  });

  // ── Cohort rate null handling ──────────────────────────────────────────

  describe('null cohort completion rate', () => {
    it('does not render cohort text when rate is null', () => {
      const suggestions = [
        makeSuggestion({ id: 'g1', cohort_completion_rate: null }),
      ];
      renderPanel({ suggestions });
      expect(screen.queryByText(/of similar students/)).toBeNull();
    });
  });
});

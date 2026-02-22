import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RubricPreview from '@/components/shared/RubricPreview';
import type { RubricWithCriteria } from '@/hooks/useRubrics';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeRubric = (overrides?: Partial<RubricWithCriteria>): RubricWithCriteria => ({
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
        { label: 'Developing', description: 'Needs improvement', points: 1 },
        { label: 'Proficient', description: 'Meets expectations', points: 3 },
        { label: 'Exemplary', description: 'Exceeds expectations', points: 5 },
      ],
      max_points: 5,
    },
    {
      id: 'c2',
      rubric_id: 'rubric-1',
      criterion_name: 'Grammar',
      sort_order: 1,
      levels: [
        { label: 'Developing', description: 'Many errors', points: 1 },
        { label: 'Proficient', description: 'Few errors', points: 3 },
        { label: 'Exemplary', description: 'No errors', points: 5 },
      ],
      max_points: 5,
    },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RubricPreview', () => {
  it('renders the rubric title', () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText('Essay Rubric')).toBeInTheDocument();
  });

  it('renders criterion names', () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Grammar')).toBeInTheDocument();
  });

  it('renders level labels in the header', () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText('Developing')).toBeInTheDocument();
    expect(screen.getByText('Proficient')).toBeInTheDocument();
    expect(screen.getByText('Exemplary')).toBeInTheDocument();
  });

  it('renders level descriptions', () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText('Needs improvement')).toBeInTheDocument();
    expect(screen.getByText('Meets expectations')).toBeInTheDocument();
    expect(screen.getByText('No errors')).toBeInTheDocument();
  });

  it('renders points badges for each cell', () => {
    render(<RubricPreview rubric={makeRubric()} />);
    // 6 cells total: 2 criteria × 3 levels. 1pt cells = 2, 3pt cells = 2, 5pt cells = 2
    const onePtBadges = screen.getAllByText('1 pt');
    expect(onePtBadges).toHaveLength(2);
    const fivePtBadges = screen.getAllByText('5 pts');
    expect(fivePtBadges).toHaveLength(2);
  });

  it('renders total max score in footer', () => {
    render(<RubricPreview rubric={makeRubric()} />);
    // Total = 5 + 5 = 10
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows empty state when criteria array is empty', () => {
    render(<RubricPreview rubric={makeRubric({ criteria: [] })} />);
    expect(screen.getByText('No criteria defined for this rubric.')).toBeInTheDocument();
  });

  it('shows empty state when levels array is empty', () => {
    const rubric = makeRubric({
      criteria: [
        {
          id: 'c1',
          rubric_id: 'rubric-1',
          criterion_name: 'Test',
          sort_order: 0,
          levels: [],
          max_points: 0,
        },
      ],
    });
    render(<RubricPreview rubric={rubric} />);
    expect(screen.getByText('No performance levels defined.')).toBeInTheDocument();
  });

  it('highlights selected cells when selectedCells is provided', () => {
    const { container } = render(
      <RubricPreview
        rubric={makeRubric()}
        selectedCells={{ c1: 2 }} // Exemplary for Clarity
      />,
    );

    // The selected cell should have the blue highlight classes
    const selectedCell = container.querySelector('.bg-blue-100.border-blue-500');
    expect(selectedCell).toBeInTheDocument();
  });

  it('makes cells clickable when onCellClick is provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <RubricPreview
        rubric={makeRubric()}
        onCellClick={handleClick}
      />,
    );

    // Click on the "Needs improvement" cell (criterion c1, level 0)
    await user.click(screen.getByText('Needs improvement'));
    expect(handleClick).toHaveBeenCalledWith('c1', 0);
  });

  it('does not make cells clickable when onCellClick is not provided', () => {
    const { container } = render(<RubricPreview rubric={makeRubric()} />);
    const clickableCells = container.querySelectorAll('[role="button"]');
    expect(clickableCells).toHaveLength(0);
  });

  it('supports keyboard activation on interactive cells', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <RubricPreview
        rubric={makeRubric()}
        onCellClick={handleClick}
      />,
    );

    const cell = screen.getByText('Meets expectations').closest('td')!;
    cell.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledWith('c1', 1);
  });

  it('sorts criteria by sort_order', () => {
    const rubric = makeRubric({
      criteria: [
        {
          id: 'c2',
          rubric_id: 'rubric-1',
          criterion_name: 'Second',
          sort_order: 1,
          levels: [{ label: 'L1', description: 'Desc', points: 1 }],
          max_points: 1,
        },
        {
          id: 'c1',
          rubric_id: 'rubric-1',
          criterion_name: 'First',
          sort_order: 0,
          levels: [{ label: 'L1', description: 'Desc', points: 1 }],
          max_points: 1,
        },
      ],
    });

    render(<RubricPreview rubric={rubric} />);
    const criterionCells = screen.getAllByText(/First|Second/);
    expect(criterionCells[0]).toHaveTextContent('First');
    expect(criterionCells[1]).toHaveTextContent('Second');
  });

  it('shows dash for empty descriptions', () => {
    const rubric = makeRubric({
      criteria: [
        {
          id: 'c1',
          rubric_id: 'rubric-1',
          criterion_name: 'Test',
          sort_order: 0,
          levels: [{ label: 'L1', description: '', points: 2 }],
          max_points: 2,
        },
      ],
    });

    render(<RubricPreview rubric={rubric} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

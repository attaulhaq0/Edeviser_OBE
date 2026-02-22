import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BLOOMS_VERBS, BLOOMS_COLORS } from '@/lib/bloomsVerbs';
import type { BloomsLevel } from '@/lib/schemas/clo';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial;
      void animate;
      void exit;
      void transition;
      return <div {...rest}>{children}</div>;
    },
  },
}));

import BloomsVerbGuide from '@/components/shared/BloomsVerbGuide';

// ---------------------------------------------------------------------------
// bloomsVerbs constants tests
// ---------------------------------------------------------------------------
describe('BLOOMS_VERBS', () => {
  const allLevels: BloomsLevel[] = [
    'remembering', 'understanding', 'applying',
    'analyzing', 'evaluating', 'creating',
  ];

  it('has entries for all six Bloom\'s levels', () => {
    for (const level of allLevels) {
      expect(BLOOMS_VERBS[level]).toBeDefined();
      expect(BLOOMS_VERBS[level].length).toBeGreaterThan(0);
    }
  });

  it('contains the required verbs per requirement 38', () => {
    expect(BLOOMS_VERBS.remembering).toEqual(['define', 'list', 'recall', 'identify', 'state', 'name']);
    expect(BLOOMS_VERBS.understanding).toEqual(['explain', 'describe', 'classify', 'summarize', 'paraphrase']);
    expect(BLOOMS_VERBS.applying).toEqual(['use', 'implement', 'execute', 'solve', 'demonstrate', 'construct']);
    expect(BLOOMS_VERBS.analyzing).toEqual(['compare', 'differentiate', 'examine', 'break down', 'infer']);
    expect(BLOOMS_VERBS.evaluating).toEqual(['judge', 'critique', 'defend', 'argue', 'assess', 'recommend']);
    expect(BLOOMS_VERBS.creating).toEqual(['design', 'develop', 'compose', 'build', 'formulate', 'produce']);
  });

  it('has color definitions for all six levels', () => {
    for (const level of allLevels) {
      expect(BLOOMS_COLORS[level]).toBeDefined();
      expect(BLOOMS_COLORS[level].bg).toBeTruthy();
      expect(BLOOMS_COLORS[level].text).toBeTruthy();
      expect(BLOOMS_COLORS[level].hover).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// BloomsVerbGuide component tests
// ---------------------------------------------------------------------------
describe('BloomsVerbGuide', () => {
  it('renders nothing when no level is selected', () => {
    const { container } = render(
      <BloomsVerbGuide selectedLevel={undefined} onVerbClick={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('displays verbs for the selected Bloom\'s level', () => {
    render(
      <BloomsVerbGuide selectedLevel="remembering" onVerbClick={vi.fn()} />,
    );

    expect(screen.getByText('Suggested Verbs')).toBeInTheDocument();
    for (const verb of BLOOMS_VERBS.remembering) {
      expect(screen.getByText(verb)).toBeInTheDocument();
    }
  });

  it('calls onVerbClick with the clicked verb', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <BloomsVerbGuide selectedLevel="applying" onVerbClick={handleClick} />,
    );

    await user.click(screen.getByText('solve'));
    expect(handleClick).toHaveBeenCalledWith('solve');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard activation on verb badges', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <BloomsVerbGuide selectedLevel="evaluating" onVerbClick={handleClick} />,
    );

    const badge = screen.getByText('judge');
    badge.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledWith('judge');
  });

  it('displays different verbs when level changes', () => {
    const handleClick = vi.fn();

    const { rerender } = render(
      <BloomsVerbGuide selectedLevel="creating" onVerbClick={handleClick} />,
    );

    expect(screen.getByText('design')).toBeInTheDocument();
    expect(screen.queryByText('define')).not.toBeInTheDocument();

    rerender(
      <BloomsVerbGuide selectedLevel="remembering" onVerbClick={handleClick} />,
    );

    expect(screen.getByText('define')).toBeInTheDocument();
    expect(screen.queryByText('design')).not.toBeInTheDocument();
  });
});

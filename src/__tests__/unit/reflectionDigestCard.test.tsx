import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReflectionDigestCard from '@/components/shared/ReflectionDigestCard';
import type { ReflectionDigest } from '@/types/planner';

const makeDigest = (overrides: Partial<ReflectionDigest> = {}): ReflectionDigest => ({
  id: 'd1',
  studentId: 's1',
  month: '2026-04-01',
  themes: [{ topic: 'Time Management', frequency: 5 }],
  growthPatterns: [{ area: 'Resilience', description: 'Engaging with challenges' }],
  emotionalTrends: [{ label: 'Positive outlook', sentiment: 'positive' }],
  suggestedFocus: [{ area: 'Depth', reason: 'Connect to CLOs' }],
  sharedWith: [],
  generatedAt: '2026-04-30T00:00:00Z',
  ...overrides,
});

describe('ReflectionDigestCard', () => {
  it('renders the month label', () => {
    render(
      <ReflectionDigestCard
        digest={makeDigest()}
        onShare={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
  });

  it('renders themes', () => {
    render(
      <ReflectionDigestCard
        digest={makeDigest()}
        onShare={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText('Time Management')).toBeInTheDocument();
  });

  it('renders growth patterns', () => {
    render(
      <ReflectionDigestCard
        digest={makeDigest()}
        onShare={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText(/Resilience/)).toBeInTheDocument();
  });

  it('renders share buttons', () => {
    render(
      <ReflectionDigestCard
        digest={makeDigest()}
        onShare={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Advisor')).toBeInTheDocument();
  });

  it('calls onShare when Parent button is clicked', () => {
    const onShare = vi.fn();
    render(
      <ReflectionDigestCard
        digest={makeDigest()}
        onShare={onShare}
        onRevoke={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Parent'));
    expect(onShare).toHaveBeenCalledWith('parent');
  });

  it('shows revoke button when already shared', () => {
    const digest = makeDigest({
      sharedWith: [{ role: 'parent', userId: 'p1', sharedAt: '2026-04-30T00:00:00Z' }],
    });
    render(
      <ReflectionDigestCard
        digest={digest}
        onShare={vi.fn()}
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText('Revoke Parent')).toBeInTheDocument();
  });
});

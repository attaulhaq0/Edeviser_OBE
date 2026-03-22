import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WellnessTipCard from '@/components/shared/WellnessTipCard';
import type { WellnessTip } from '@/types/habits';

const makeTip = (overrides: Partial<WellnessTip> = {}): WellnessTip => ({
  id: 'tip-1',
  habitType: 'meditation',
  text: 'Start with just 2 minutes of meditation.',
  isOnboarding: false,
  ...overrides,
});

describe('WellnessTipCard', () => {
  it('renders tip text', () => {
    const tip = makeTip({ text: 'Drink more water throughout the day.' });
    render(<WellnessTipCard tip={tip} isOnboarding={false} />);

    expect(screen.getByTestId('wellness-tip-text')).toHaveTextContent(
      'Drink more water throughout the day.',
    );
  });

  it('renders the card container', () => {
    render(<WellnessTipCard tip={makeTip()} isOnboarding={false} />);
    expect(screen.getByTestId('wellness-tip-card')).toBeInTheDocument();
  });

  it('does not show dismiss button for rotating tips', () => {
    render(<WellnessTipCard tip={makeTip()} isOnboarding={false} />);
    expect(screen.queryByTestId('wellness-tip-dismiss')).not.toBeInTheDocument();
  });

  it('shows dismiss button for onboarding tips', () => {
    render(
      <WellnessTipCard
        tip={makeTip({ isOnboarding: true })}
        isOnboarding={true}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByTestId('wellness-tip-dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <WellnessTipCard
        tip={makeTip({ isOnboarding: true })}
        isOnboarding={true}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTestId('wellness-tip-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders resource link when resourceUrl is provided', () => {
    const tip = makeTip({
      resourceUrl: 'https://example.com/tips',
      resourceLabel: 'Read more',
    });
    render(<WellnessTipCard tip={tip} isOnboarding={false} />);

    const link = screen.getByTestId('wellness-tip-resource');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com/tips');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('Read more');
  });

  it('does not render resource link when resourceUrl is absent', () => {
    render(<WellnessTipCard tip={makeTip()} isOnboarding={false} />);
    expect(screen.queryByTestId('wellness-tip-resource')).not.toBeInTheDocument();
  });

  it('uses default "Learn more" label when resourceLabel is not provided', () => {
    const tip = makeTip({ resourceUrl: 'https://example.com' });
    render(<WellnessTipCard tip={tip} isOnboarding={false} />);

    expect(screen.getByTestId('wellness-tip-resource')).toHaveTextContent('Learn more');
  });

  it('does not show dismiss button for onboarding tip without onDismiss handler', () => {
    render(
      <WellnessTipCard
        tip={makeTip({ isOnboarding: true })}
        isOnboarding={true}
      />,
    );
    expect(screen.queryByTestId('wellness-tip-dismiss')).not.toBeInTheDocument();
  });
});

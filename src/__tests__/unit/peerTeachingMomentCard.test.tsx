// Unit test: PeerTeachingMomentCard — renders title, text, media link, ratings, view count
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PeerTeachingMomentCard from '@/components/shared/PeerTeachingMomentCard';

const defaultProps = {
  title: 'Understanding Recursion',
  explanationText: 'Recursion is when a function calls itself. The key is to have a base case that stops the recursion.',
  authorName: 'Alice',
  createdAt: new Date().toISOString(),
};

describe('PeerTeachingMomentCard', () => {
  it('renders title', () => {
    render(<PeerTeachingMomentCard {...defaultProps} />);
    expect(screen.getByText('Understanding Recursion')).toBeDefined();
  });

  it('renders explanation text', () => {
    render(<PeerTeachingMomentCard {...defaultProps} />);
    expect(screen.getByText(defaultProps.explanationText)).toBeDefined();
  });

  it('renders author name', () => {
    render(<PeerTeachingMomentCard {...defaultProps} />);
    expect(screen.getByText(/Alice/)).toBeDefined();
  });

  it('renders media link when provided', () => {
    render(
      <PeerTeachingMomentCard
        {...defaultProps}
        mediaUrl="https://example.com/video"
      />,
    );
    const link = screen.getByText('View media');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('https://example.com/video');
  });

  it('does not render media link when not provided', () => {
    render(<PeerTeachingMomentCard {...defaultProps} />);
    expect(screen.queryByText('View media')).toBeNull();
  });

  it('renders average clarity rating', () => {
    render(
      <PeerTeachingMomentCard
        {...defaultProps}
        avgClarityRating={4.5}
      />,
    );
    expect(screen.getByText(/Clarity: 4.5/)).toBeDefined();
  });

  it('renders average helpfulness rating', () => {
    render(
      <PeerTeachingMomentCard
        {...defaultProps}
        avgHelpfulnessRating={3.8}
      />,
    );
    expect(screen.getByText(/Helpful: 3.8/)).toBeDefined();
  });

  it('renders view count', () => {
    render(
      <PeerTeachingMomentCard
        {...defaultProps}
        viewCount={42}
      />,
    );
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders total ratings count', () => {
    render(
      <PeerTeachingMomentCard
        {...defaultProps}
        totalRatings={5}
        avgClarityRating={4.0}
      />,
    );
    expect(screen.getByText('(5 ratings)')).toBeDefined();
  });

  it('renders CLO title badge when provided', () => {
    render(
      <PeerTeachingMomentCard
        {...defaultProps}
        cloTitle="CLO 1.1"
      />,
    );
    expect(screen.getByText('CLO 1.1')).toBeDefined();
  });
});

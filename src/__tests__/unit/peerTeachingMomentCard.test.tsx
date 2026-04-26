// =============================================================================
// PeerTeachingMomentCard — Unit tests (Task 12.2)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PeerTeachingMomentCard, {
  type TeachingMomentData,
} from '@/components/shared/PeerTeachingMomentCard';

const baseMoment: TeachingMomentData = {
  id: 'tm-1',
  author_name: 'Alice',
  author_id: 'u1',
  clo_title: 'CLO 1.1',
  title: 'Understanding Recursion',
  explanation_text: 'Recursion is when a function calls itself to solve smaller subproblems.',
  media_url: null,
  view_count: 42,
  avg_clarity_rating: 4.2,
  avg_helpfulness_rating: 3.8,
  created_at: new Date().toISOString(),
};

describe('PeerTeachingMomentCard', () => {
  it('renders the title', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    expect(screen.getByText('Understanding Recursion')).toBeInTheDocument();
  });

  it('renders the explanation text', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    expect(
      screen.getByText(/Recursion is when a function calls itself/),
    ).toBeInTheDocument();
  });

  it('renders the author name', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders media link when provided', () => {
    const withMedia: TeachingMomentData = {
      ...baseMoment,
      media_url: 'https://example.com/video.mp4',
    };
    render(<PeerTeachingMomentCard moment={withMedia} />);
    const link = screen.getByText('View attached media');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/video.mp4');
  });

  it('does not render media link when media_url is null', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    expect(screen.queryByText('View attached media')).not.toBeInTheDocument();
  });

  it('renders average clarity rating', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    const clarityRating = screen.getByTestId('rating-clarity');
    expect(clarityRating).toBeInTheDocument();
    expect(clarityRating).toHaveTextContent('4.2');
  });

  it('renders average helpfulness rating', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    const helpfulRating = screen.getByTestId('rating-helpful');
    expect(helpfulRating).toBeInTheDocument();
    expect(helpfulRating).toHaveTextContent('3.8');
  });

  it('does not render ratings when they are null', () => {
    const noRatings: TeachingMomentData = {
      ...baseMoment,
      avg_clarity_rating: null,
      avg_helpfulness_rating: null,
    };
    render(<PeerTeachingMomentCard moment={noRatings} />);
    expect(screen.queryByTestId('rating-clarity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rating-helpful')).not.toBeInTheDocument();
  });

  it('renders view count', () => {
    render(<PeerTeachingMomentCard moment={baseMoment} />);
    expect(screen.getByText('42 views')).toBeInTheDocument();
  });
});

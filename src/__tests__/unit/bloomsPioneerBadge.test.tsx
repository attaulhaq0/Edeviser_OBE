import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BloomsPioneerBadge } from '@/components/shared/BloomsPioneerBadge';

describe('BloomsPioneerBadge', () => {
  it('renders Explorer badge with correct label', () => {
    render(<BloomsPioneerBadge type="explorer" awarded />);
    const badge = screen.getByTestId('blooms-pioneer-badge-explorer');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Bloom's Explorer");
    expect(badge).toHaveTextContent('Analyzing');
  });

  it('renders Challenger badge with correct label', () => {
    render(<BloomsPioneerBadge type="challenger" awarded />);
    const badge = screen.getByTestId('blooms-pioneer-badge-challenger');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Bloom's Challenger");
    expect(badge).toHaveTextContent('Evaluating');
  });

  it('renders Pioneer badge with correct label', () => {
    render(<BloomsPioneerBadge type="pioneer" awarded />);
    const badge = screen.getByTestId('blooms-pioneer-badge-pioneer');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Bloom's Pioneer");
    expect(badge).toHaveTextContent('Creating');
  });

  it('applies dimmed styles when not awarded', () => {
    render(<BloomsPioneerBadge type="explorer" awarded={false} />);
    const badge = screen.getByTestId('blooms-pioneer-badge-explorer');
    expect(badge.className).toMatch(/opacity-40/);
    expect(badge.className).toMatch(/grayscale/);
  });

  it('applies awarded styles when awarded', () => {
    render(<BloomsPioneerBadge type="explorer" awarded />);
    const badge = screen.getByTestId('blooms-pioneer-badge-explorer');
    expect(badge.className).toMatch(/bg-yellow-500/);
    expect(badge.className).not.toMatch(/opacity-40/);
    expect(badge.className).not.toMatch(/grayscale/);
  });

  it('applies animate-badge-pop when animate is true and awarded', () => {
    render(<BloomsPioneerBadge type="pioneer" awarded animate />);
    const badge = screen.getByTestId('blooms-pioneer-badge-pioneer');
    expect(badge.className).toMatch(/animate-badge-pop/);
  });

  it('does not apply animate-badge-pop when not awarded even if animate is true', () => {
    render(<BloomsPioneerBadge type="pioneer" awarded={false} animate />);
    const badge = screen.getByTestId('blooms-pioneer-badge-pioneer');
    expect(badge.className).not.toMatch(/animate-badge-pop/);
  });

  it('renders correct aria-label for awarded badge', () => {
    render(<BloomsPioneerBadge type="challenger" awarded />);
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', "Bloom's Challenger badge — awarded");
  });

  it('renders correct aria-label for unawarded badge', () => {
    render(<BloomsPioneerBadge type="challenger" awarded={false} />);
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', "Bloom's Challenger badge — not yet earned");
  });

  it('respects size prop — sm', () => {
    render(<BloomsPioneerBadge type="explorer" awarded size="sm" />);
    const badge = screen.getByTestId('blooms-pioneer-badge-explorer');
    expect(badge.className).toMatch(/p-2/);
  });

  it('respects size prop — lg', () => {
    render(<BloomsPioneerBadge type="explorer" awarded size="lg" />);
    const badge = screen.getByTestId('blooms-pioneer-badge-explorer');
    expect(badge.className).toMatch(/p-4/);
  });

  it('defaults to md size', () => {
    render(<BloomsPioneerBadge type="explorer" awarded />);
    const badge = screen.getByTestId('blooms-pioneer-badge-explorer');
    expect(badge.className).toMatch(/p-3/);
  });

  it('uses correct color for each badge type when awarded', () => {
    const { rerender } = render(<BloomsPioneerBadge type="explorer" awarded />);
    expect(screen.getByTestId('blooms-pioneer-badge-explorer').className).toMatch(/bg-yellow-500/);

    rerender(<BloomsPioneerBadge type="challenger" awarded />);
    expect(screen.getByTestId('blooms-pioneer-badge-challenger').className).toMatch(/bg-orange-500/);

    rerender(<BloomsPioneerBadge type="pioneer" awarded />);
    expect(screen.getByTestId('blooms-pioneer-badge-pioneer').className).toMatch(/bg-red-500/);
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RealtimeStatusBanner from '@/components/shared/RealtimeStatusBanner';

describe('RealtimeStatusBanner', () => {
  it('renders nothing when isLive is true', () => {
    const { container } = render(<RealtimeStatusBanner isLive={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the paused banner when isLive is false', () => {
    render(<RealtimeStatusBanner isLive={false} />);
    expect(screen.getByText(/live updates paused/i)).toBeInTheDocument();
  });

  it('includes polling interval info in the banner text', () => {
    render(<RealtimeStatusBanner isLive={false} />);
    expect(screen.getByText(/polling every 30s/i)).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<RealtimeStatusBanner isLive={false} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlowCheckInDialog from '@/components/shared/FlowCheckInDialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  sessionId: 'session-1',
  intervalNumber: 2,
  cloId: null as string | null,
  onRespond: vi.fn(),
  onDismiss: vi.fn(),
};

describe('FlowCheckInDialog', () => {
  it('renders the dialog title', () => {
    render(<FlowCheckInDialog {...defaultProps} />);
    expect(screen.getByText("How's it going?")).toBeInTheDocument();
  });

  it('renders three response options', () => {
    render(<FlowCheckInDialog {...defaultProps} />);
    expect(screen.getByText(/in the zone/i)).toBeInTheDocument();
    expect(screen.getByText(/stuck/i)).toBeInTheDocument();
    expect(screen.getByText(/too easy/i)).toBeInTheDocument();
  });

  it('calls onRespond with in_the_zone when clicked', () => {
    const onRespond = vi.fn();
    render(<FlowCheckInDialog {...defaultProps} onRespond={onRespond} />);
    fireEvent.click(screen.getByText(/in the zone/i));
    expect(onRespond).toHaveBeenCalledWith('in_the_zone');
  });

  it('calls onRespond with stuck when clicked', () => {
    const onRespond = vi.fn();
    render(<FlowCheckInDialog {...defaultProps} onRespond={onRespond} />);
    fireEvent.click(screen.getByText(/stuck/i));
    expect(onRespond).toHaveBeenCalledWith('stuck');
  });

  it('calls onRespond with too_easy when clicked', () => {
    const onRespond = vi.fn();
    render(<FlowCheckInDialog {...defaultProps} onRespond={onRespond} />);
    fireEvent.click(screen.getByText(/too easy/i));
    expect(onRespond).toHaveBeenCalledWith('too_easy');
  });

  it('shows AI Tutor hint when cloId is provided', () => {
    render(<FlowCheckInDialog {...defaultProps} cloId="clo-1" />);
    expect(screen.getByText(/AI Tutor/i)).toBeInTheDocument();
  });

  it('does not show AI Tutor hint when cloId is null', () => {
    render(<FlowCheckInDialog {...defaultProps} cloId={null} />);
    expect(screen.queryByText(/AI Tutor/i)).not.toBeInTheDocument();
  });

  it('calls onDismiss when Dismiss is clicked', () => {
    const onDismiss = vi.fn();
    render(<FlowCheckInDialog {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

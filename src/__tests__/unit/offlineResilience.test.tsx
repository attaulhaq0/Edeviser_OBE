// @vitest-environment happy-dom
// =============================================================================
// Offline Resilience — Unit tests
// Feature: weekly-planner-today-view, Task 10.7
// Tests: useNetworkStatus hook, OfflineIndicator component, offline queue integration
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act as actHook } from '@testing-library/react';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('returns initial online state from navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('detects going offline when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    actHook(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('detects going back online and sets wasOffline flag', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    actHook(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('resets wasOffline flag when resetWasOffline is called', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    actHook(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.wasOffline).toBe(true);

    actHook(() => {
      result.current.resetWasOffline();
    });

    expect(result.current.wasOffline).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('OfflineIndicator', () => {
  it('renders the offline badge with wifi-off icon', () => {
    render(<OfflineIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows pending count when queueSize > 0', () => {
    render(<OfflineIndicator queueSize={3} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/3 pending/)).toBeInTheDocument();
  });

  it('does not show pending count when queueSize is 0', () => {
    render(<OfflineIndicator queueSize={0} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
  });

  it('has accessible aria-label describing offline state', () => {
    render(<OfflineIndicator queueSize={2} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute(
      'aria-label',
      expect.stringContaining('You are offline'),
    );
    expect(status).toHaveAttribute(
      'aria-label',
      expect.stringContaining('2 pending actions'),
    );
  });

  it('has aria-live polite for screen reader announcements', () => {
    render(<OfflineIndicator />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

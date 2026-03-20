import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'student-1' },
    profile: null,
    role: 'student',
    institutionId: 'inst-1',
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })),
}));

const mockUnreadCount = vi.fn();
vi.mock('@/hooks/useNotifications', () => ({
  useUnreadCount: (...args: unknown[]) => mockUnreadCount(...args),
  useNotifications: vi.fn(() => ({ data: [], isLoading: false })),
  useMarkAsRead: vi.fn(() => ({ mutate: vi.fn() })),
  useMarkAllAsRead: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteNotification: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/hooks/useNotificationRealtime', () => ({
  useNotificationRealtime: vi.fn(() => ({ isLive: true })),
}));

import NotificationBell from '@/components/shared/NotificationBell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell icon', () => {
    mockUnreadCount.mockReturnValue({ data: 0 });
    render(<NotificationBell />);

    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toBeInTheDocument();
  });

  it('shows unread badge when count > 0', () => {
    mockUnreadCount.mockReturnValue({ data: 5 });
    render(<NotificationBell />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show badge when count is 0', () => {
    mockUnreadCount.mockReturnValue({ data: 0 });
    render(<NotificationBell />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('caps display at 99+', () => {
    mockUnreadCount.mockReturnValue({ data: 150 });
    render(<NotificationBell />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('includes unread count in aria-label', () => {
    mockUnreadCount.mockReturnValue({ data: 3 });
    render(<NotificationBell />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Notifications, 3 unread');
  });
});

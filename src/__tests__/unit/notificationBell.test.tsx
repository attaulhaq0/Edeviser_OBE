import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import i18n from "@/lib/i18n";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "student-1" },
    profile: null,
    role: "student",
    institutionId: "inst-1",
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })),
}));

const mockUnreadCount = vi.fn();
vi.mock("@/hooks/useNotifications", () => ({
  useUnreadCount: (...args: unknown[]) => mockUnreadCount(...args),
  useNotifications: vi.fn(() => ({ data: [], isLoading: false })),
  useMarkAsRead: vi.fn(() => ({ mutate: vi.fn() })),
  useMarkAllAsRead: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteNotification: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/hooks/useNotificationRealtime", () => ({
  useNotificationRealtime: vi.fn(() => ({ isLive: true })),
}));

import NotificationBell from "@/components/shared/NotificationBell";

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders bell icon", () => {
    mockUnreadCount.mockReturnValue({ data: 0 });
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: /notifications/i });
    expect(button).toBeInTheDocument();
  });

  it("shows unread badge when count > 0", () => {
    mockUnreadCount.mockReturnValue({ data: 5 });
    render(<NotificationBell />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not show badge when count is 0", () => {
    mockUnreadCount.mockReturnValue({ data: 0 });
    render(<NotificationBell />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("caps display at 99+", () => {
    mockUnreadCount.mockReturnValue({ data: 150 });
    render(<NotificationBell />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("includes unread count in aria-label", () => {
    mockUnreadCount.mockReturnValue({ data: 3 });
    render(<NotificationBell />);

    const button = screen.getByRole("button");
    // aria-label includes the unread count
    expect(button.getAttribute("aria-label")).toMatch(/3 unread/);
  });
  it("uses paired unread paint, a 44px trigger and a hidden decorative bell", () => {
    mockUnreadCount.mockReturnValue({ data: 5 });
    render(<NotificationBell />);
    const button = screen.getByRole("button", {
      name: /5 unread notifications/i,
    });
    expect(button).toHaveClass("min-h-11", "min-w-11");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const badge = screen.getByText("5");
    expect(badge).toHaveClass(
      "bg-[var(--notification-unread-badge-bg)]",
      "text-[var(--notification-unread-badge-fg)]"
    );
  });

  it("keeps the uncapped translated count in Arabic while the visible badge caps at 99+", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    mockUnreadCount.mockReturnValue({ data: 150 });
    render(<NotificationBell />);
    expect(
      screen.getByRole("button", { name: /الإشعارات.*150.*إشعار غير مقروء/ })
    ).toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});

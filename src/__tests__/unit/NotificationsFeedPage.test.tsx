// NotificationsFeedPage — functional render tests (net-new screen).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Notification } from "@/hooks/useNotifications";
import NotificationsFeedPage from "@/features/shared/notifications/NotificationsFeedPage";

const hoisted = vi.hoisted(() => ({
  list: {
    data: undefined as Notification[] | undefined,
    isLoading: false,
    isError: false,
  },
  markAsRead: { mutate: vi.fn() },
  markAllAsRead: { mutate: vi.fn(), isPending: false },
  deleteNotification: { mutate: vi.fn() },
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => hoisted.list,
  useMarkAsRead: () => hoisted.markAsRead,
  useMarkAllAsRead: () => hoisted.markAllAsRead,
  useDeleteNotification: () => hoisted.deleteNotification,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, profile: null }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, def?: string) => def ?? _key }),
}));

const notifications: Notification[] = [
  {
    id: "n1",
    user_id: "u1",
    type: "grade_released",
    title: "Grade released",
    body: "CS301 · Database Design",
    is_read: false,
    metadata: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "n2",
    user_id: "u1",
    type: "badge_earned",
    title: "Badge earned",
    body: null,
    is_read: true,
    metadata: null,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

beforeEach(() => {
  hoisted.list.data = undefined;
  hoisted.list.isLoading = false;
  hoisted.list.isError = false;
  hoisted.markAsRead.mutate = vi.fn();
  hoisted.markAllAsRead.mutate = vi.fn();
  hoisted.deleteNotification.mutate = vi.fn();
});

describe("NotificationsFeedPage", () => {
  it("renders the title while loading", () => {
    hoisted.list.isLoading = true;
    render(<NotificationsFeedPage />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    hoisted.list.isError = true;
    render(<NotificationsFeedPage />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows an empty state (and no mark-all) when there are none", () => {
    hoisted.list.data = [];
    render(<NotificationsFeedPage />);
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("notif-mark-all")).toBeNull();
  });

  it("renders notifications with a mark-all action when unread exist", () => {
    hoisted.list.data = notifications;
    render(<NotificationsFeedPage />);
    expect(screen.getByText("Grade released")).toBeInTheDocument();
    expect(screen.getByText("Badge earned")).toBeInTheDocument();
    expect(screen.getByTestId("notif-mark-all")).toBeInTheDocument();
  });

  it("marks all as read for the current user", () => {
    hoisted.list.data = notifications;
    render(<NotificationsFeedPage />);
    fireEvent.click(screen.getByTestId("notif-mark-all"));
    expect(hoisted.markAllAsRead.mutate).toHaveBeenCalledWith("u1");
  });

  it("marks a single unread notification read on click", () => {
    hoisted.list.data = notifications;
    render(<NotificationsFeedPage />);
    fireEvent.click(screen.getByTestId("notif-n1"));
    expect(hoisted.markAsRead.mutate).toHaveBeenCalledWith("n1");
  });

  it("deletes a notification", () => {
    hoisted.list.data = notifications;
    render(<NotificationsFeedPage />);
    fireEvent.click(screen.getByTestId("notif-delete-n2"));
    expect(hoisted.deleteNotification.mutate).toHaveBeenCalledWith("n2");
  });
});

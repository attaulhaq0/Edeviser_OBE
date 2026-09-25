/**
 * StudentFriendsPage — smoke test for the newly-routed friends surface.
 *
 * The friends feature has migration and hook source, but this isolated render
 * does not prove live RPC/RLS state or socket presence. A dated 2026-09-05 audit
 * found it unrouted; current route declaration is checked separately by G01.
 * This case guards the page, a last-seen hint and classmate search only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { Friend } from "@/hooks/useFriends";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

const state = vi.hoisted(() => ({ friendList: [] as Friend[] }));
vi.mock("@/hooks/useFriends", () => ({
  useFriends: () => ({ data: state.friendList, isPending: false }),
  useFriendRequests: () => ({ data: [], isLoading: false }),
  useClassmateSearch: () => ({ data: [], isLoading: false }),
  useSendFriendRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useRespondFriendRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFriend: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import StudentFriendsPage from "@/features/student/friends/StudentFriendsPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <StudentFriendsPage />
    </MemoryRouter>
  );

afterEach(() => vi.useRealTimers());

describe("StudentFriendsPage", () => {
  const recent = (): Friend => ({
    student_id: "friend-1",
    full_name: "Lina Farah",
    avatar_url: null,
    last_seen_at: new Date().toISOString(),
    xp_total: 1200,
    level: 4,
    streak_current: 3,
    online: true,
  });
  beforeEach(() => {
    state.friendList = [recent()];
  });
  it("renders an accepted friend without asserting socket presence", () => {
    renderPage();
    expect(screen.getByText("Lina Farah")).toBeInTheDocument();
  });

  it("renders the add-friends search surface", () => {
    renderPage();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
  it("shows recent activity as text rather than a color-only Online now claim", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Recently Active/ })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Recent activity recorded").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Online now")).not.toBeInTheDocument();
  });

  it.each([
    null,
    new Date(Date.now() - 3600_000).toISOString(),
    new Date(Date.now() + 3600_000).toISOString(),
  ])(
    "treats unknown, stale or future last-seen data as unverified, even if the query-time bit is true",
    (lastSeenAt) => {
      state.friendList = [
        { ...recent(), last_seen_at: lastSeenAt, online: true },
      ];
      renderPage();
      expect(
        screen.queryByRole("heading", { name: /Recently Active/ })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Recent activity recorded")
      ).not.toBeInTheDocument();
      expect(screen.getByText("Lina Farah")).toBeInTheDocument();
    }
  );
  it("expires the last-seen activity hint on a local clock tick without querying a live socket", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"));
    state.friendList = [
      {
        ...recent(),
        last_seen_at: new Date(Date.now() - 4.5 * 60_000).toISOString(),
        online: true,
      },
    ];
    const { unmount } = renderPage();
    expect(
      screen.getByRole("heading", { name: /Recently Active/ })
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(
      screen.queryByRole("heading", { name: /Recently Active/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Lina Farah")).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

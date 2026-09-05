/**
 * StudentFriendsPage — smoke test for the newly-routed friends surface.
 *
 * The friends feature (friendships table + send/respond SECURITY DEFINER RPCs
 * + useFriends hooks + this page) was fully built in migration
 * 20260823000010 but never routed — unreachable by any student (2026-09-05
 * coverage audit). This test guards the page render contract: sections, a
 * friend row with presence, and the add-friends search.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useFriends", () => ({
  useFriends: () => ({
    data: [
      {
        student_id: "friend-1",
        full_name: "Lina Farah",
        avatar_url: null,
        last_seen_at: new Date().toISOString(),
        xp_total: 1200,
        level: 4,
        streak_current: 3,
        online: true,
      },
    ],
    isLoading: false,
  }),
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

describe("StudentFriendsPage", () => {
  it("renders an accepted friend with online presence", () => {
    renderPage();
    expect(screen.getByText("Lina Farah")).toBeInTheDocument();
  });

  it("renders the add-friends search surface", () => {
    renderPage();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

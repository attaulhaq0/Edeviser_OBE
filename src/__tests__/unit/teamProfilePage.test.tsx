// Unit test: TeamProfilePage — renders team name, members, XP, streak, cooperation score, badges
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("react-router-dom", () => ({
  useParams: () => ({ teamId: "team-1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, institutionId: "inst-1" }),
}));

const mockProfile = {
  team: {
    id: "team-1",
    name: "Alpha Squad",
    captain_id: "user-1",
    xp_total: 1500,
    streak_count: 7,
    cooperation_score: 85,
    created_at: "2025-01-01T00:00:00Z",
  },
  members: [
    {
      id: "m1",
      student_id: "user-1",
      role: "captain",
      contribution_status: "active",
    },
    {
      id: "m2",
      student_id: "user-2",
      role: "member",
      contribution_status: "warning",
    },
  ],
  badges: [
    { id: "b1", badge_key: "streak_squad", earned_at: "2025-01-08T00:00:00Z" },
  ],
  activeChallenges: [
    {
      id: "c1",
      title: "Weekly Sprint",
      challenge_type: "academic",
      goal_target: 10,
      current_progress: 5,
      completed_at: null,
    },
  ],
  teachingMoments: [],
};

vi.mock("@/hooks/useTeamProfile", () => ({
  useTeamProfile: () => ({ data: mockProfile, isLoading: false }),
}));

vi.mock("@/hooks/useReplacementVotes", () => ({
  useReplacementVotes: () => ({ data: [] }),
  useInitiateVote: () => ({ mutate: vi.fn(), isPending: false }),
  useCastVote: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/shared/Shimmer", () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="shimmer" className={className} />
  ),
}));

vi.mock("@/components/shared/CooperationScoreDisplay", () => ({
  default: ({ score }: { score: number }) => (
    <div data-testid="cooperation-score">{score}</div>
  ),
}));

vi.mock("@/components/shared/TeamMemberList", () => ({
  default: ({ members }: { members: unknown[] }) => (
    <div data-testid="team-member-list">{members.length} members</div>
  ),
}));

vi.mock("@/components/shared/TeamBadgeCollection", () => ({
  default: ({ badges }: { badges: unknown[] }) => (
    <div data-testid="team-badge-collection">{badges.length} badges</div>
  ),
}));

vi.mock("@/components/shared/ChallengeProgressBar", () => ({
  default: ({ current, goal }: { current: number; goal: number }) => (
    <div
      data-testid="challenge-progress"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemax={goal}
    />
  ),
}));

vi.mock("@/components/shared/PeerTeachingMomentCard", () => ({
  default: () => <div data-testid="teaching-moment-card" />,
}));

vi.mock("@/components/shared/ReplacementVoteCard", () => ({
  default: () => <div data-testid="replacement-vote-card" />,
}));

import TeamProfilePage from "@/pages/student/teams/TeamProfilePage";

describe("TeamProfilePage", () => {
  it("renders team name", () => {
    render(<TeamProfilePage />);
    expect(screen.getByText("Alpha Squad")).toBeDefined();
  });

  it("renders team XP", () => {
    render(<TeamProfilePage />);
    expect(screen.getByText("1,500")).toBeDefined();
  });

  it("renders streak count", () => {
    render(<TeamProfilePage />);
    expect(screen.getByText("7")).toBeDefined();
  });

  it("renders member count", () => {
    render(<TeamProfilePage />);
    expect(screen.getByText("2")).toBeDefined();
  });

  it("renders cooperation score", () => {
    render(<TeamProfilePage />);
    expect(screen.getByTestId("cooperation-score")).toBeDefined();
    expect(screen.getByTestId("cooperation-score").textContent).toBe("85");
  });

  it("renders team member list", () => {
    render(<TeamProfilePage />);
    expect(screen.getByTestId("team-member-list")).toBeDefined();
  });

  it("renders badges section", () => {
    render(<TeamProfilePage />);
    expect(screen.getByTestId("team-badge-collection")).toBeDefined();
  });

  it("renders active challenges", () => {
    render(<TeamProfilePage />);
    expect(screen.getByText("Weekly Sprint")).toBeDefined();
  });
});

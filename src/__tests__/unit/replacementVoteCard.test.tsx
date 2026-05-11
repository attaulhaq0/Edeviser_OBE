// Unit test: ReplacementVoteCard — vote initiation, casting, expiry, teacher override
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReplacementVoteCard from "@/components/shared/ReplacementVoteCard";

const baseVote = {
  id: "vote-1",
  targetMemberName: "Jane Doe",
  targetMemberId: "user-2",
  status: "open" as const,
  votesFor: 1,
  votesAgainst: 0,
  createdAt: new Date().toISOString(),
  resolvedAt: null,
  teacherOverride: false,
};

describe("ReplacementVoteCard", () => {
  describe("vote initiation", () => {
    it("shows initiation UI for captain with inactive members", () => {
      render(
        <ReplacementVoteCard
          vote={null}
          isCaptain
          isTeacher={false}
          totalMembers={4}
          inactiveMembers={[{ id: "user-2", name: "Jane Doe" }]}
          onInitiateVote={vi.fn()}
        />
      );
      expect(screen.getByText("Replacement Vote")).toBeDefined();
      expect(screen.getByLabelText("Select inactive member")).toBeDefined();
    });

    it("hides initiation UI for non-captain", () => {
      const { container } = render(
        <ReplacementVoteCard
          vote={null}
          isCaptain={false}
          isTeacher={false}
          totalMembers={4}
          inactiveMembers={[{ id: "user-2", name: "Jane Doe" }]}
        />
      );
      expect(container.innerHTML).toBe("");
    });

    it("hides initiation UI when no inactive members", () => {
      const { container } = render(
        <ReplacementVoteCard
          vote={null}
          isCaptain
          isTeacher={false}
          totalMembers={4}
          inactiveMembers={[]}
        />
      );
      expect(container.innerHTML).toBe("");
    });
  });

  describe("vote casting", () => {
    it("shows approve and reject buttons for members", () => {
      render(
        <ReplacementVoteCard
          vote={baseVote}
          isCaptain={false}
          isTeacher={false}
          totalMembers={4}
          onCastVote={vi.fn()}
        />
      );
      expect(screen.getByText("Approve")).toBeDefined();
      expect(screen.getByText("Reject")).toBeDefined();
    });

    it("calls onCastVote with true for approve", () => {
      const onCastVote = vi.fn();
      render(
        <ReplacementVoteCard
          vote={baseVote}
          isCaptain={false}
          isTeacher={false}
          totalMembers={4}
          onCastVote={onCastVote}
        />
      );
      fireEvent.click(screen.getByText("Approve"));
      expect(onCastVote).toHaveBeenCalledWith("vote-1", true);
    });

    it('shows "already voted" message when hasVoted', () => {
      render(
        <ReplacementVoteCard
          vote={baseVote}
          isCaptain={false}
          isTeacher={false}
          hasVoted
          totalMembers={4}
        />
      );
      expect(screen.getByText("You have already voted")).toBeDefined();
    });
  });

  describe("teacher override", () => {
    it("shows override buttons for teacher", () => {
      render(
        <ReplacementVoteCard
          vote={baseVote}
          isCaptain={false}
          isTeacher
          totalMembers={4}
          onTeacherOverride={vi.fn()}
        />
      );
      expect(screen.getByText("Override: Approve")).toBeDefined();
      expect(screen.getByText("Override: Reject")).toBeDefined();
    });

    it("shows teacher override badge when applied", () => {
      render(
        <ReplacementVoteCard
          vote={{ ...baseVote, teacherOverride: true, status: "approved" }}
          isCaptain={false}
          isTeacher={false}
          totalMembers={4}
        />
      );
      expect(screen.getByText("Teacher override applied")).toBeDefined();
    });
  });

  describe("vote display", () => {
    it("shows target member name", () => {
      render(
        <ReplacementVoteCard
          vote={baseVote}
          isCaptain={false}
          isTeacher={false}
          totalMembers={4}
        />
      );
      expect(screen.getByText("Jane Doe")).toBeDefined();
    });

    it("shows vote counts", () => {
      render(
        <ReplacementVoteCard
          vote={{ ...baseVote, votesFor: 2, votesAgainst: 1 }}
          isCaptain={false}
          isTeacher={false}
          totalMembers={4}
        />
      );
      expect(screen.getByText("2")).toBeDefined();
      expect(screen.getByText("1")).toBeDefined();
    });
  });
});

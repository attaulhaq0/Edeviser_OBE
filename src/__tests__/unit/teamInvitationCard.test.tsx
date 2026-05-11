// Unit test: TeamInvitationCard — accept/decline buttons, keyboard operability
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamInvitationCard from "@/components/shared/TeamInvitationCard";

const defaultProps = {
  teamName: "Alpha Squad",
  invitedBy: "John Doe",
  createdAt: new Date().toISOString(),
  onAccept: vi.fn(),
  onDecline: vi.fn(),
};

describe("TeamInvitationCard", () => {
  it("renders team name", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    expect(screen.getByText("Alpha Squad")).toBeDefined();
  });

  it("renders invited by name", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    expect(screen.getByText(/Invited by John Doe/)).toBeDefined();
  });

  it("renders accept button", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    expect(screen.getByText("Accept")).toBeDefined();
  });

  it("renders decline button", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    expect(screen.getByText("Decline")).toBeDefined();
  });

  it("calls onAccept when accept button is clicked", () => {
    const onAccept = vi.fn();
    render(<TeamInvitationCard {...defaultProps} onAccept={onAccept} />);
    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("calls onDecline when decline button is clicked", () => {
    const onDecline = vi.fn();
    render(<TeamInvitationCard {...defaultProps} onDecline={onDecline} />);
    fireEvent.click(screen.getByText("Decline"));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("accept button has accessible aria-label", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    const btn = screen.getByLabelText("Accept invitation to Alpha Squad");
    expect(btn).toBeDefined();
  });

  it("decline button has accessible aria-label", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    const btn = screen.getByLabelText("Decline invitation to Alpha Squad");
    expect(btn).toBeDefined();
  });

  it("buttons are keyboard accessible (not disabled by default)", () => {
    render(<TeamInvitationCard {...defaultProps} />);
    const acceptBtn = screen.getByText("Accept").closest("button");
    const declineBtn = screen.getByText("Decline").closest("button");
    expect(acceptBtn?.disabled).toBe(false);
    expect(declineBtn?.disabled).toBe(false);
  });

  it("disables buttons when accepting", () => {
    render(<TeamInvitationCard {...defaultProps} isAccepting />);
    const acceptBtn = screen.getByLabelText("Accept invitation to Alpha Squad");
    const declineBtn = screen.getByLabelText(
      "Decline invitation to Alpha Squad"
    );
    expect(acceptBtn.hasAttribute("disabled")).toBe(true);
    expect(declineBtn.hasAttribute("disabled")).toBe(true);
  });
});

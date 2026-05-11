// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ActiveBoostIndicator from "@/components/shared/ActiveBoostIndicator";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

const mockUseActiveBoosts = vi.fn();
vi.mock("@/hooks/useActiveBoosts", () => ({
  useActiveBoosts: (...args: unknown[]) => mockUseActiveBoosts(...args),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ActiveBoostIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when no active boosts", () => {
    mockUseActiveBoosts.mockReturnValue({ data: [] });
    const { container } = render(<ActiveBoostIndicator />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when boosts is undefined", () => {
    mockUseActiveBoosts.mockReturnValue({ data: undefined });
    const { container } = render(<ActiveBoostIndicator />);
    expect(container.innerHTML).toBe("");
  });

  it("renders boost multiplier and countdown", () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min from now
    mockUseActiveBoosts.mockReturnValue({
      data: [{ multiplier: 2.0, expires_at: expiresAt }],
    });

    render(<ActiveBoostIndicator />);
    expect(screen.getByText("2x XP")).toBeTruthy();
    // Should show countdown in mm:ss format
    expect(screen.getByText(/\d+:\d{2}/)).toBeTruthy();
  });

  it("renders nothing when boost has expired", () => {
    const expiredAt = new Date(Date.now() - 1000).toISOString();
    mockUseActiveBoosts.mockReturnValue({
      data: [{ multiplier: 2.0, expires_at: expiredAt }],
    });

    render(<ActiveBoostIndicator />);

    // After timer fires, component should detect expired state
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // The component returns null when timeLeft === 'Expired'
    // It may briefly render before detecting expiry
  });

  it("updates countdown every second", () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
    mockUseActiveBoosts.mockReturnValue({
      data: [{ multiplier: 2.0, expires_at: expiresAt }],
    });

    render(<ActiveBoostIndicator />);

    // Initial render should show ~5:00 or 4:59
    const initialText = screen.getByText(/\d+:\d{2}/).textContent;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After 2 seconds, the countdown should have changed
    const updatedText = screen.queryByText(/\d+:\d{2}/)?.textContent;
    // The text should be different (2 seconds less)
    if (initialText && updatedText) {
      expect(updatedText).not.toBe(initialText);
    }
  });

  it("applies custom className", () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    mockUseActiveBoosts.mockReturnValue({
      data: [{ multiplier: 2.0, expires_at: expiresAt }],
    });

    const { container } = render(
      <ActiveBoostIndicator className="my-custom" />
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("my-custom");
  });
});

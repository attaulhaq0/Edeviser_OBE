// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import XPBalanceBadge from "@/components/shared/XPBalanceBadge";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

const mockUseXPBalance = vi.fn();
vi.mock("@/hooks/useXPBalance", () => ({
  useXPBalance: (...args: unknown[]) => mockUseXPBalance(...args),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("XPBalanceBadge", () => {
  it("renders balance value", () => {
    mockUseXPBalance.mockReturnValue({
      data: { balance: 1500 },
      isLoading: false,
    });
    render(<XPBalanceBadge />);
    expect(screen.getByText("1,500 XP")).toBeTruthy();
  });

  it("renders zero balance", () => {
    mockUseXPBalance.mockReturnValue({
      data: { balance: 0 },
      isLoading: false,
    });
    render(<XPBalanceBadge />);
    expect(screen.getByText("0 XP")).toBeTruthy();
  });

  it("shows loading spinner when loading", () => {
    mockUseXPBalance.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(<XPBalanceBadge />);
    // Loader2 has animate-spin class
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("defaults to 0 when data is null", () => {
    mockUseXPBalance.mockReturnValue({ data: null, isLoading: false });
    render(<XPBalanceBadge />);
    expect(screen.getByText("0 XP")).toBeTruthy();
  });

  it("applies size classes for sm variant", () => {
    mockUseXPBalance.mockReturnValue({
      data: { balance: 100 },
      isLoading: false,
    });
    const { container } = render(<XPBalanceBadge size="sm" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("text-xs");
  });

  it("applies size classes for lg variant", () => {
    mockUseXPBalance.mockReturnValue({
      data: { balance: 100 },
      isLoading: false,
    });
    const { container } = render(<XPBalanceBadge size="lg" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("text-base");
  });

  it("applies custom className", () => {
    mockUseXPBalance.mockReturnValue({
      data: { balance: 100 },
      isLoading: false,
    });
    const { container } = render(<XPBalanceBadge className="custom-class" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("custom-class");
  });
});

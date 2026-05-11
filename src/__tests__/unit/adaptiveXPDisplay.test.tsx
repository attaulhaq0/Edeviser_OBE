import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdaptiveXPDisplay from "@/components/shared/AdaptiveXPDisplay";

// Mock the hooks
const mockMultiplierData = { level: 3, multiplier: 1.2 };
const mockDiminishingData = {
  repeat_count: 0,
  next_multiplier: 1.0,
  is_diminished: false,
};

vi.mock("@/hooks/useAdaptiveXP", () => ({
  useStudentXPMultiplier: vi.fn(() => ({ data: mockMultiplierData })),
  useDiminishingReturnsStatus: vi.fn(() => ({ data: mockDiminishingData })),
}));

import {
  useStudentXPMultiplier,
  useDiminishingReturnsStatus,
} from "@/hooks/useAdaptiveXP";

describe("AdaptiveXPDisplay", () => {
  beforeEach(() => {
    vi.mocked(useStudentXPMultiplier).mockReturnValue({
      data: mockMultiplierData,
    } as ReturnType<typeof useStudentXPMultiplier>);
    vi.mocked(useDiminishingReturnsStatus).mockReturnValue({
      data: mockDiminishingData,
    } as ReturnType<typeof useDiminishingReturnsStatus>);
  });

  it("renders level and multiplier badges", () => {
    render(<AdaptiveXPDisplay studentId="s1" />);
    expect(screen.getByText("Level 3")).toBeInTheDocument();
    expect(screen.getByText("1.2x XP Multiplier")).toBeInTheDocument();
  });

  it("does not show diminishing returns when not diminished", () => {
    render(<AdaptiveXPDisplay studentId="s1" />);
    expect(screen.queryByText(/Diminishing Returns/)).not.toBeInTheDocument();
  });

  it("shows diminishing returns warning when diminished", () => {
    vi.mocked(useDiminishingReturnsStatus).mockReturnValue({
      data: { repeat_count: 2, next_multiplier: 0.6, is_diminished: true },
    } as ReturnType<typeof useDiminishingReturnsStatus>);

    render(<AdaptiveXPDisplay studentId="s1" actionType="submission" />);
    expect(screen.getByText(/Diminishing Returns/)).toBeInTheDocument();
    expect(screen.getByText(/0.6x XP/)).toBeInTheDocument();
  });

  it("renders nothing when multiplier data is null", () => {
    vi.mocked(useStudentXPMultiplier).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useStudentXPMultiplier>);

    const { container } = render(<AdaptiveXPDisplay studentId="s1" />);
    expect(container.firstChild).toBeNull();
  });

  it("passes actionType to diminishing returns hook", () => {
    render(<AdaptiveXPDisplay studentId="s1" actionType="quiz_completion" />);
    expect(useDiminishingReturnsStatus).toHaveBeenCalledWith(
      "s1",
      "quiz_completion"
    );
  });

  it("defaults actionType to submission", () => {
    render(<AdaptiveXPDisplay studentId="s1" />);
    expect(useDiminishingReturnsStatus).toHaveBeenCalledWith(
      "s1",
      "submission"
    );
  });
});

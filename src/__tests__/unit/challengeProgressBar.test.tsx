// Unit test: ChallengeProgressBar — ARIA progressbar role, aria-valuenow/min/max
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChallengeProgressBar from "@/components/shared/ChallengeProgressBar";

describe("ChallengeProgressBar", () => {
  it('renders with role="progressbar"', () => {
    render(<ChallengeProgressBar current={50} goal={100} />);
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("sets aria-valuenow to current progress", () => {
    render(<ChallengeProgressBar current={30} goal={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
  });

  it("sets aria-valuemin to 0", () => {
    render(<ChallengeProgressBar current={50} goal={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
  });

  it("sets aria-valuemax to goal", () => {
    render(<ChallengeProgressBar current={50} goal={200} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemax")).toBe("200");
  });

  it("clamps current to not exceed goal", () => {
    render(<ChallengeProgressBar current={150} goal={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("displays percentage when showPercentage is true", () => {
    render(<ChallengeProgressBar current={75} goal={100} showPercentage />);
    expect(screen.getByText("75%")).toBeDefined();
  });

  it("displays values when showValues is true", () => {
    render(<ChallengeProgressBar current={5} goal={10} showValues />);
    expect(screen.getByText("5 / 10")).toBeDefined();
  });

  it("sets aria-label", () => {
    render(
      <ChallengeProgressBar current={50} goal={100} label="Test progress" />
    );
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-label")).toBe("Test progress");
  });
});

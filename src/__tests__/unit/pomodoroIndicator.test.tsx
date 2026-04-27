// =============================================================================
// Unit Tests — PomodoroIndicator
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PomodoroIndicator from "@/components/shared/PomodoroIndicator";

describe("PomodoroIndicator", () => {
  it('renders "Pomodoro 1 of 4" for first work interval', () => {
    render(<PomodoroIndicator currentInterval={0} intervalType="work" />);
    expect(screen.getByText("Pomodoro 1 of 4")).toBeTruthy();
  });

  it('renders "Break" label during break interval', () => {
    render(<PomodoroIndicator currentInterval={1} intervalType="break" />);
    expect(screen.getByText("Break")).toBeTruthy();
  });

  it('renders "Long Break" label during long break interval', () => {
    render(<PomodoroIndicator currentInterval={7} intervalType="long_break" />);
    expect(screen.getByText("Long Break")).toBeTruthy();
  });

  it('renders "Pomodoro 2 of 4" for second work interval', () => {
    render(<PomodoroIndicator currentInterval={2} intervalType="work" />);
    expect(screen.getByText("Pomodoro 2 of 4")).toBeTruthy();
  });

  it('renders "Pomodoro 3 of 4" for third work interval', () => {
    render(<PomodoroIndicator currentInterval={4} intervalType="work" />);
    expect(screen.getByText("Pomodoro 3 of 4")).toBeTruthy();
  });

  it('renders "Pomodoro 4 of 4" for fourth work interval', () => {
    render(<PomodoroIndicator currentInterval={6} intervalType="work" />);
    expect(screen.getByText("Pomodoro 4 of 4")).toBeTruthy();
  });

  it("renders 4 progress dots", () => {
    const { container } = render(
      <PomodoroIndicator currentInterval={0} intervalType="work" />
    );
    const dots = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(dots.length).toBe(4);
  });

  it("has ARIA status role with descriptive label", () => {
    render(<PomodoroIndicator currentInterval={0} intervalType="work" />);
    const status = screen.getByRole("status");
    expect(status).toBeTruthy();
    expect(status.getAttribute("aria-label")).toBe("Pomodoro 1 of 4, Work");
  });

  it("shows correct ARIA label during break", () => {
    render(<PomodoroIndicator currentInterval={1} intervalType="break" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toBe("Pomodoro 1 of 4, Break");
  });

  it("applies custom className", () => {
    const { container } = render(
      <PomodoroIndicator
        currentInterval={0}
        intervalType="work"
        className="mt-4"
      />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mt-4");
  });
});

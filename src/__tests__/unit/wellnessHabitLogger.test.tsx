import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WellnessHabitLogger from "@/components/shared/WellnessHabitLogger";
import type { WellnessHabitLog, WellnessHabitType } from "@/types/habits";

const makeLog = (
  type: WellnessHabitType,
  value: number | null = null
): WellnessHabitLog => ({
  id: `log-${type}`,
  studentId: "student-1",
  date: "2024-03-15",
  wellnessType: type,
  value,
  completedAt: "2024-03-15T10:00:00Z",
});

describe("WellnessHabitLogger", () => {
  it("renders enabled habits", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation", "exercise"]}
        todayLogs={[]}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByTestId("wellness-habit-meditation")).toBeInTheDocument();
    expect(screen.getByTestId("wellness-habit-exercise")).toBeInTheDocument();
    expect(
      screen.queryByTestId("wellness-habit-hydration")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("wellness-habit-sleep")
    ).not.toBeInTheDocument();
  });

  it("renders nothing when no habits are enabled", () => {
    render(
      <WellnessHabitLogger enabledHabits={[]} todayLogs={[]} onLog={vi.fn()} />
    );

    expect(
      screen.queryByTestId("wellness-habit-logger")
    ).not.toBeInTheDocument();
  });

  it("shows checkmark for already-logged habits", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation", "exercise"]}
        todayLogs={[makeLog("meditation")]}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByTestId("wellness-check-meditation")).toBeInTheDocument();
    expect(
      screen.queryByTestId("wellness-toggle-meditation")
    ).not.toBeInTheDocument();
  });

  it("disables toggle for already-logged habits", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation", "exercise"]}
        todayLogs={[makeLog("meditation")]}
        onLog={vi.fn()}
      />
    );

    // Meditation should show checkmark, not toggle
    expect(
      screen.queryByTestId("wellness-toggle-meditation")
    ).not.toBeInTheDocument();
    // Exercise should still show toggle
    expect(screen.getByTestId("wellness-toggle-exercise")).toBeInTheDocument();
  });

  it("calls onLog when toggle is clicked", () => {
    const onLog = vi.fn();
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation"]}
        todayLogs={[]}
        onLog={onLog}
      />
    );

    const toggle = screen.getByTestId("wellness-toggle-meditation");
    fireEvent.click(toggle);

    expect(onLog).toHaveBeenCalledWith("meditation", undefined);
  });

  it("calls onLog with value when value input is filled", () => {
    const onLog = vi.fn();
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation"]}
        todayLogs={[]}
        onLog={onLog}
      />
    );

    const valueInput = screen.getByTestId("wellness-value-meditation");
    fireEvent.change(valueInput, { target: { value: "15" } });

    const toggle = screen.getByTestId("wellness-toggle-meditation");
    fireEvent.click(toggle);

    expect(onLog).toHaveBeenCalledWith("meditation", 15);
  });

  it("shows value input for each enabled habit", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation", "hydration", "exercise", "sleep"]}
        todayLogs={[]}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByTestId("wellness-value-meditation")).toBeInTheDocument();
    expect(screen.getByTestId("wellness-value-hydration")).toBeInTheDocument();
    expect(screen.getByTestId("wellness-value-exercise")).toBeInTheDocument();
    expect(screen.getByTestId("wellness-value-sleep")).toBeInTheDocument();
  });

  it("disables value input for already-logged habits", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation"]}
        todayLogs={[makeLog("meditation", 10)]}
        onLog={vi.fn()}
      />
    );

    const valueInput = screen.getByTestId("wellness-value-meditation");
    expect(valueInput).toBeDisabled();
  });

  it("renders the Wellness section label", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation"]}
        todayLogs={[]}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByText("Wellness")).toBeInTheDocument();
  });

  it("renders all 4 habits when all enabled", () => {
    render(
      <WellnessHabitLogger
        enabledHabits={["meditation", "hydration", "exercise", "sleep"]}
        todayLogs={[]}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByText("Meditation")).toBeInTheDocument();
    expect(screen.getByText("Hydration")).toBeInTheDocument();
    expect(screen.getByText("Exercise")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
  });
});

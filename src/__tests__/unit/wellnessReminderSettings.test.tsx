import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WellnessReminderSettings from "@/components/shared/WellnessReminderSettings";
import type { WellnessReminderConfig } from "@/types/habits";

const makeReminder = (
  overrides: Partial<WellnessReminderConfig> = {}
): WellnessReminderConfig => ({
  habitType: "meditation",
  reminderTime: "09:00",
  enabled: true,
  ...overrides,
});

describe("WellnessReminderSettings", () => {
  const defaultProps = {
    reminders: [
      makeReminder({
        habitType: "meditation",
        reminderTime: "08:00",
        enabled: true,
      }),
      makeReminder({
        habitType: "hydration",
        reminderTime: null,
        enabled: false,
      }),
    ],
    onToggle: vi.fn(),
    onTimeChange: vi.fn(),
  };

  it("renders the reminders container", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    expect(
      screen.getByTestId("wellness-reminder-settings")
    ).toBeInTheDocument();
  });

  it("renders a row for each reminder", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    expect(screen.getByTestId("reminder-meditation")).toBeInTheDocument();
    expect(screen.getByTestId("reminder-hydration")).toBeInTheDocument();
  });

  it("renders nothing when reminders array is empty", () => {
    const { container } = render(
      <WellnessReminderSettings
        reminders={[]}
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows toggle in checked state for enabled reminders", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    const toggle = screen.getByTestId("reminder-toggle-meditation");
    expect(toggle).toHaveAttribute("data-state", "checked");
  });

  it("shows toggle in unchecked state for disabled reminders", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    const toggle = screen.getByTestId("reminder-toggle-hydration");
    expect(toggle).toHaveAttribute("data-state", "unchecked");
  });

  it("calls onToggle when toggle is clicked", () => {
    const onToggle = vi.fn();
    render(<WellnessReminderSettings {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId("reminder-toggle-hydration"));
    expect(onToggle).toHaveBeenCalledWith("hydration", true);
  });

  it("disables time input when reminder is disabled", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    const timeInput = screen.getByTestId("reminder-time-hydration");
    expect(timeInput).toBeDisabled();
  });

  it("enables time input when reminder is enabled", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    const timeInput = screen.getByTestId("reminder-time-meditation");
    expect(timeInput).not.toBeDisabled();
  });

  it("calls onTimeChange when time input changes", () => {
    const onTimeChange = vi.fn();
    render(
      <WellnessReminderSettings {...defaultProps} onTimeChange={onTimeChange} />
    );

    const timeInput = screen.getByTestId("reminder-time-meditation");
    fireEvent.change(timeInput, { target: { value: "10:30" } });
    expect(onTimeChange).toHaveBeenCalledWith("meditation", "10:30");
  });

  it("shows correct time value for enabled reminder", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    const timeInput = screen.getByTestId(
      "reminder-time-meditation"
    ) as HTMLInputElement;
    expect(timeInput.value).toBe("08:00");
  });

  it("renders the Reminders heading", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    expect(screen.getByText("Reminders")).toBeInTheDocument();
  });

  it("renders habit labels correctly", () => {
    render(<WellnessReminderSettings {...defaultProps} />);
    expect(screen.getByText("Meditation")).toBeInTheDocument();
    expect(screen.getByText("Hydration")).toBeInTheDocument();
  });
});

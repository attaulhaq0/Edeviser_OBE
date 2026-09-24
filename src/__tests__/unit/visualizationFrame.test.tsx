import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { VisualizationFrame } from "@/design-system/patterns";
import { Button } from "@/design-system/primitives";

afterEach(cleanup);

describe("VisualizationFrame composition", () => {
  it("uses one named figure and caller-provided description without inventing data", () => {
    render(<VisualizationFrame title="Supplied observations" summary="Two supplied records; no inference.">
      <p>Caller plot content</p>
    </VisualizationFrame>);
    const figure = screen.getByRole("figure", { name: "Supplied observations" });
    expect(figure).toHaveAccessibleDescription("Two supplied records; no inference.");
    expect(within(figure).getByRole("heading", { level: 2 })).toHaveTextContent("Supplied observations");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(figure.closest('[data-slot="card"]')?.querySelectorAll('[data-slot="card"]')).toHaveLength(0);
  });

  it("retains long unbroken mixed-script copy with explicit wrapping contracts", () => {
    const label = "عرضالبياناتStudyRecords学習記録".repeat(12);
    const summary = "سجلاتأسبوعيةWeeklyObservations週次データ".repeat(12);
    render(<VisualizationFrame title="Long-copy fixture" summary={summary} dataDisclosure={{ label, showLabel: label, hideLabel: "Close", content: <p>Supplied data</p> }}>
      <p>Plot content</p>
    </VisualizationFrame>);
    expect(screen.getByRole("figure")).toHaveAccessibleDescription(summary);
    expect(screen.getByText(summary)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveClass("min-h-11", "h-auto", "max-w-full", "whitespace-normal", "[overflow-wrap:anywhere]");
    fireEvent.click(button);
    expect(screen.getByRole("region", { name: label })).toBeInTheDocument();
  });

  it("provides stable, independent disclosure targets and preserves unrelated caller controls", () => {
    const disclosure = { label: "Data details", showLabel: "Show supplied data", hideLabel: "Hide supplied data", content: <p>Real caller alternative</p> };
    render(<>
      <VisualizationFrame title="First" summary="First summary" dataDisclosure={disclosure} controls={<Button type="button">Caller filter</Button>}><p>First plot</p></VisualizationFrame>
      <VisualizationFrame title="Second" summary="Second summary" dataDisclosure={disclosure}><p>Second plot</p></VisualizationFrame>
    </>);
    const first = within(screen.getByRole("figure", { name: "First" }));
    const second = within(screen.getByRole("figure", { name: "Second" }));
    const trigger = first.getByRole("button", { name: "Show supplied data" });
    const firstId = trigger.getAttribute("aria-controls");
    expect(firstId).toBeTruthy();
    expect(second.getByRole("button", { name: "Show supplied data" }).getAttribute("aria-controls")).not.toBe(firstId);
    expect(document.getElementById(firstId ?? "")).toHaveAttribute("hidden");
    fireEvent.click(trigger);
    expect(first.getByRole("button", { name: "Hide supplied data" })).toHaveAttribute("aria-expanded", "true");
    expect(first.getByRole("region", { name: "Data details" })).not.toHaveAttribute("hidden");
    expect(second.queryByRole("region")).not.toBeInTheDocument();
    expect(first.getByRole("button", { name: "Caller filter" })).toBeInTheDocument();
    fireEvent.click(first.getByRole("button", { name: "Hide supplied data" }));
    expect(first.getByRole("button", { name: "Show supplied data" })).toHaveAttribute("aria-controls", firstId);
  });
});

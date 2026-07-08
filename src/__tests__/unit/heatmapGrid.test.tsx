import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HeatmapGrid from "@/components/shared/HeatmapGrid";
import type { HeatmapDay, DateRange } from "@/types/habits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDay(date: string, totalCount: number): HeatmapDay {
  return {
    date,
    academicCount: Math.min(totalCount, 4),
    wellnessCount: Math.max(totalCount - 4, 0),
    totalCount,
    habits: [],
  };
}

function makeDateRange(start: string, end: string): DateRange {
  return { start, end };
}

/** Build a contiguous array of HeatmapDay objects between start and end. */
function buildDays(
  start: string,
  end: string,
  countFn: (date: string) => number = () => 0
): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const cursor = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (cursor <= endDate) {
    const dateStr =
      cursor.getFullYear() +
      "-" +
      String(cursor.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(cursor.getDate()).padStart(2, "0");
    days.push(makeDay(dateStr, countFn(dateStr)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Stub ResizeObserver for happy-dom
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe(_target: Element) {
    // Fire immediately with a mock entry
    this.callback(
      [{ contentRect: { width: 900 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

// Install mock before tests
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeatmapGrid", () => {
  const range14 = makeDateRange("2025-01-06", "2025-01-19"); // 14 days = 2 weeks

  it("renders correct number of cells for a date range", () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(14);
  });

  it("cells have correct ARIA labels", () => {
    const days = [makeDay("2025-01-06", 3)];
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    const cell = screen.getByTestId("heatmap-cell-2025-01-06");
    expect(cell).toHaveAttribute(
      "aria-label",
      "January 6, 2025: 3 habits completed"
    );
  });

  it('renders singular "habit" for count of 1', () => {
    const days = [makeDay("2025-01-06", 1)];
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    const cell = screen.getByTestId("heatmap-cell-2025-01-06");
    expect(cell).toHaveAttribute(
      "aria-label",
      "January 6, 2025: 1 habit completed"
    );
  });

  it("future dates are rendered as disabled", () => {
    // Use a date far in the future
    const futureRange = makeDateRange("2099-06-01", "2099-06-07");
    const days = buildDays("2099-06-01", "2099-06-07", () => 2);
    render(<HeatmapGrid data={days} semesterRange={futureRange} />);

    const cell = screen.getByTestId("heatmap-cell-2099-06-01");
    expect(cell).toHaveAttribute("aria-disabled", "true");
    expect(cell).toHaveAttribute("data-future", "true");
  });

  it("color intensity matches habit count (level 0-4)", () => {
    const days = [
      makeDay("2025-01-06", 0),
      makeDay("2025-01-07", 1),
      makeDay("2025-01-08", 2),
      makeDay("2025-01-09", 3),
      makeDay("2025-01-10", 5),
    ];
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    // Intensity is exposed as a stable data-level attribute (0-4). The visual
    // color is driven from --heatmap-level-* tokens (see index.css), decoupled
    // from the DOM contract so theming never breaks these tests.
    expect(screen.getByTestId("heatmap-cell-2025-01-06")).toHaveAttribute(
      "data-level",
      "0"
    );
    expect(screen.getByTestId("heatmap-cell-2025-01-07")).toHaveAttribute(
      "data-level",
      "1"
    );
    expect(screen.getByTestId("heatmap-cell-2025-01-08")).toHaveAttribute(
      "data-level",
      "2"
    );
    expect(screen.getByTestId("heatmap-cell-2025-01-09")).toHaveAttribute(
      "data-level",
      "3"
    );
    // 5 habits → capped at level 4
    expect(screen.getByTestId("heatmap-cell-2025-01-10")).toHaveAttribute(
      "data-level",
      "4"
    );
  });

  it("renders month labels", () => {
    // Range spanning Jan and Feb
    const range = makeDateRange("2025-01-01", "2025-02-15");
    const days = buildDays("2025-01-01", "2025-02-15");
    render(<HeatmapGrid data={days} semesterRange={range} />);

    expect(screen.getByTestId("month-label-Jan")).toBeInTheDocument();
    expect(screen.getByTestId("month-label-Feb")).toBeInTheDocument();
  });

  it("renders day-of-week labels (Mon, Wed, Fri)", () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    expect(screen.getByTestId("day-label-Mon")).toBeInTheDocument();
    expect(screen.getByTestId("day-label-Wed")).toBeInTheDocument();
    expect(screen.getByTestId("day-label-Fri")).toBeInTheDocument();
  });

  it("renders color legend with 5 levels", () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    for (let level = 0; level <= 4; level++) {
      expect(screen.getByTestId(`legend-level-${level}`)).toBeInTheDocument();
    }
  });

  it("renders legend labels for first and last levels", () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    expect(screen.getByTestId("legend-label-0")).toHaveTextContent(
      "No activity"
    );
    expect(screen.getByTestId("legend-label-4")).toHaveTextContent("4+ habits");
  });

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------

  it("arrow keys move focus between cells", () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    const firstCell = screen.getByTestId("heatmap-cell-2025-01-06");
    firstCell.focus();

    // ArrowDown moves to next row (index + 1)
    fireEvent.keyDown(firstCell, { key: "ArrowDown" });
    const secondCell = screen.getByTestId("heatmap-cell-2025-01-07");
    expect(document.activeElement).toBe(secondCell);
  });

  it("Enter key triggers onCellClick", () => {
    const onClick = vi.fn();
    const days = buildDays("2025-01-06", "2025-01-19");
    render(
      <HeatmapGrid data={days} semesterRange={range14} onCellClick={onClick} />
    );

    const cell = screen.getByTestId("heatmap-cell-2025-01-06");
    cell.focus();
    fireEvent.keyDown(cell, { key: "Enter" });

    expect(onClick).toHaveBeenCalledWith("2025-01-06");
  });

  it("Space key triggers onCellClick", () => {
    const onClick = vi.fn();
    const days = buildDays("2025-01-06", "2025-01-19");
    render(
      <HeatmapGrid data={days} semesterRange={range14} onCellClick={onClick} />
    );

    const cell = screen.getByTestId("heatmap-cell-2025-01-06");
    cell.focus();
    fireEvent.keyDown(cell, { key: " " });

    expect(onClick).toHaveBeenCalledWith("2025-01-06");
  });

  it("Enter/Space does not trigger onCellClick for future dates", () => {
    const onClick = vi.fn();
    const futureRange = makeDateRange("2099-06-01", "2099-06-07");
    const days = buildDays("2099-06-01", "2099-06-07");
    render(
      <HeatmapGrid
        data={days}
        semesterRange={futureRange}
        onCellClick={onClick}
      />
    );

    const cell = screen.getByTestId("heatmap-cell-2099-06-01");
    cell.focus();
    fireEvent.keyDown(cell, { key: "Enter" });

    expect(onClick).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Interaction callbacks
  // -----------------------------------------------------------------------

  it("onCellHover is called on mouse enter/leave", () => {
    const onHover = vi.fn();
    const days = [makeDay("2025-01-06", 2)];
    render(
      <HeatmapGrid data={days} semesterRange={range14} onCellHover={onHover} />
    );

    const cell = screen.getByTestId("heatmap-cell-2025-01-06");
    fireEvent.mouseEnter(cell);
    expect(onHover).toHaveBeenCalledWith("2025-01-06");

    fireEvent.mouseLeave(cell);
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it("clicking a cell triggers onCellClick", () => {
    const onClick = vi.fn();
    const days = [makeDay("2025-01-06", 2)];
    render(
      <HeatmapGrid data={days} semesterRange={range14} onCellClick={onClick} />
    );

    const cell = screen.getByTestId("heatmap-cell-2025-01-06");
    fireEvent.click(cell);
    expect(onClick).toHaveBeenCalledWith("2025-01-06");
  });

  it("clicking a future date cell does not trigger onCellClick", () => {
    const onClick = vi.fn();
    const futureRange = makeDateRange("2099-06-01", "2099-06-07");
    const days = buildDays("2099-06-01", "2099-06-07");
    render(
      <HeatmapGrid
        data={days}
        semesterRange={futureRange}
        onCellClick={onClick}
      />
    );

    const cell = screen.getByTestId("heatmap-cell-2099-06-01");
    fireEvent.click(cell);
    expect(onClick).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Roving tabindex
  // -----------------------------------------------------------------------

  it("uses roving tabindex — first cell has tabIndex 0, others -1", () => {
    const days = buildDays("2025-01-06", "2025-01-08");
    const range = makeDateRange("2025-01-06", "2025-01-08");
    render(<HeatmapGrid data={days} semesterRange={range} />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveAttribute("tabindex", "0");
    expect(cells[1]).toHaveAttribute("tabindex", "-1");
    expect(cells[2]).toHaveAttribute("tabindex", "-1");
  });

  // -----------------------------------------------------------------------
  // Grid role
  // -----------------------------------------------------------------------

  it('has role="grid" on the grid container', () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Legend is real HTML (regression: SVG legend text overlapped swatches)
  // -----------------------------------------------------------------------

  it("renders the legend as HTML with swatches and labels as distinct nodes", () => {
    const days = buildDays("2025-01-06", "2025-01-19");
    render(<HeatmapGrid data={days} semesterRange={range14} />);

    // The legend container is a sibling of the grid (below it), not inside it.
    const legend = screen.getByTestId("heatmap-legend");
    expect(legend).toBeInTheDocument();

    // Swatch and its label are separate elements — they can never overlap the
    // way the old absolutely-placed SVG <text> did over the next <rect>.
    const swatch0 = screen.getByTestId("legend-level-0");
    const label0 = screen.getByTestId("legend-label-0");
    expect(swatch0).not.toBe(label0);
    expect(legend).toContainElement(swatch0);
    expect(legend).toContainElement(label0);
    // The grid must not contain the legend swatches.
    expect(screen.getByRole("grid")).not.toContainElement(swatch0);
  });

  // -----------------------------------------------------------------------
  // Monday-aligned padding — decorative pads are excluded from gridcells
  // -----------------------------------------------------------------------

  it("keeps gridcell count equal to day count when range starts mid-week", () => {
    // 2025-01-01 is a Wednesday → 2 leading pad slots are added for alignment,
    // but only real days are exposed as gridcells.
    const range = makeDateRange("2025-01-01", "2025-01-07"); // 7 days
    const days = buildDays("2025-01-01", "2025-01-07");
    render(<HeatmapGrid data={days} semesterRange={range} />);

    expect(screen.getAllByRole("gridcell")).toHaveLength(7);
    expect(screen.getByTestId("heatmap-cell-2025-01-01")).toBeInTheDocument();
  });
});

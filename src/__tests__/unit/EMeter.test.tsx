// EMeter render behavior — accessible semantic meter (L2 pattern).
// Feature: prototype-frontend-rebuild (P0.4); see src/design-system/PARITY.md §A.4.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EMeter from "@/design-system/patterns/EMeter";

describe("EMeter (render)", () => {
  it("exposes an accessible meter with a clamped aria value", () => {
    render(<EMeter value={150} label="Course mastery" />);
    const meter = screen.getByRole("meter", { name: "Course mastery" });
    expect(meter).toHaveAttribute("aria-valuenow", "100");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("sets the fill width from the clamped value and uses the brand gradient by default", () => {
    const { container } = render(<EMeter value={42} label="Progress" />);
    const fill = container.querySelector("span") as HTMLElement;
    expect(fill).not.toBeNull();
    expect(fill.style.width).toBe("42%");
    expect(fill.style.background).toContain("--brand-gradient");
  });

  it("uses a taller inset track for the professional (pro) variant", () => {
    const { container: def } = render(<EMeter value={10} label="a" />);
    const defCls = (def.querySelector('[role="meter"]') as HTMLElement)
      .className;
    expect(defCls).toContain("h-2");
    expect(defCls).not.toContain("h-2.5");

    const { container: pro } = render(<EMeter value={10} pro label="b" />);
    const proCls = (pro.querySelector('[role="meter"]') as HTMLElement)
      .className;
    expect(proCls).toContain("h-2.5");
  });
});

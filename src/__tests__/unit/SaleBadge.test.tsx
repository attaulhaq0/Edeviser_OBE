import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import SaleBadge from "@/components/shared/SaleBadge";

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("SaleBadge's presentation-only discount", () => {
  it("keeps the supplied percent and decorative tag on a finite promotional surface", () => {
    render(<SaleBadge discountPercentage={25} />);
    const badge = screen.getByText("25% Off");
    expect(badge).toHaveClass(
      "bg-[var(--promotion-badge-bg)]",
      "text-[var(--promotion-badge-fg)]",
      "tabular-nums"
    );
    expect(badge.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not invent an offer for invalid/nonpositive %s",
    (value) => {
      const { container } = render(<SaleBadge discountPercentage={value} />);
      expect(container).toBeEmptyDOMElement();
    }
  );

  it("preserves a fractional display and formats it through Intl", () => {
    render(<SaleBadge discountPercentage={12.5} />);
    expect(screen.getByText("12.5% Off")).toBeInTheDocument();
  });

  it("uses Arabic script and Arabic-Qatar number formatting without changing the discount", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    render(<SaleBadge discountPercentage={25} />);
    const formatted = new Intl.NumberFormat("ar-QA", {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(0.25);
    expect(screen.getByText(`خصم ${formatted}`)).toBeInTheDocument();
    expect(screen.queryByText(/Off/)).not.toBeInTheDocument();
  });
});

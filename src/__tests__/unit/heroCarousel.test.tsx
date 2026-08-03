// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroCarousel from "@/design-system/patterns/HeroCarousel";

describe("HeroCarousel", () => {
  it("hides carousel controls when only one real slide is available", () => {
    render(
      <HeroCarousel
        ariaLabel="Highlights"
        slides={[<div key="only">Only slide</div>]}
      />
    );

    expect(
      screen.getByRole("region", { name: "Highlights" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Previous slide" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next slide" })
    ).not.toBeInTheDocument();
  });

  it("moves between real slides with localized controls and dots", async () => {
    const user = userEvent.setup();
    render(
      <HeroCarousel
        ariaLabel="Highlights"
        slides={[
          <div key="first">First slide</div>,
          <div key="second">Second slide</div>,
        ]}
      />
    );

    const firstGroup = screen.getByRole("group", { name: "1 of 2" });
    const track = firstGroup.parentElement;
    expect(track).toHaveStyle({ transform: "translateX(-0%)" });

    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(track).toHaveStyle({ transform: "translateX(-100%)" });
    expect(
      screen.getByRole("button", { name: "Go to slide 2" })
    ).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(track).toHaveStyle({ transform: "translateX(-0%)" });
  });
});

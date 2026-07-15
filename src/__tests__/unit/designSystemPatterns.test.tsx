// Design-system L2 patterns — render smoke tests (prototype design language).
// Feature: prototype-frontend-rebuild (P0.4). Ensures the shared surface screens
// build from behaves correctly across its core primitives.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import {
  PageHeader,
  PCard,
  SectionHeader,
  SectionCard,
  KPICard,
  HeroCard,
  StatusDot,
  StatePanel,
} from "@/design-system/patterns";

describe("design-system patterns", () => {
  it("PageHeader renders the title and optional action", () => {
    render(<PageHeader title="Fees" action={<button>Add</button>} />);
    expect(screen.getByRole("heading", { name: "Fees" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("PCard renders children on a white surface", () => {
    const { container } = render(<PCard>body</PCard>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-white");
    expect(el).toHaveTextContent("body");
  });

  it("SectionHeader renders the title (+ gradient chip when an icon is given)", () => {
    const { container } = render(<SectionHeader icon={Wallet} title="History" />);
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    // the icon chip carries the brand gradient
    const chip = container.querySelector('[style*="--brand-gradient"]');
    expect(chip).not.toBeNull();
  });

  it("SectionCard renders its title and body", () => {
    render(
      <SectionCard icon={Wallet} title="Payment history">
        <p>rows</p>
      </SectionCard>
    );
    expect(
      screen.getByRole("heading", { name: "Payment history" })
    ).toBeInTheDocument();
    expect(screen.getByText("rows")).toBeInTheDocument();
  });

  it("KPICard renders label and value", () => {
    render(<KPICard icon={Wallet} label="Total paid" value="5,000" />);
    expect(screen.getByText("Total paid")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
  });

  it("HeroCard exposes a labeled region when ariaLabel is set", () => {
    render(<HeroCard ariaLabel="Identity">hi</HeroCard>);
    expect(screen.getByRole("region", { name: "Identity" })).toHaveTextContent(
      "hi"
    );
  });

  it("StatusDot is decorative by default and labeled when given a label", () => {
    const { container, rerender } = render(<StatusDot tone="success" />);
    expect(
      (container.firstElementChild as HTMLElement).className
    ).toContain("bg-green-500");
    rerender(<StatusDot tone="danger" label="Critical" />);
    expect(screen.getByRole("img", { name: "Critical" })).toBeInTheDocument();
  });

  it("StatePanel renders loading / empty / error variants", () => {
    const { container, rerender } = render(<StatePanel variant="loading" />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();

    rerender(<StatePanel variant="empty" message="Nothing yet." />);
    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();

    rerender(<StatePanel variant="error" message="Broke." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Broke.");
  });
});

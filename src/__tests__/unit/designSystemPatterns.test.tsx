// Shared pattern contracts. DOM checks complement, not replace, browser layout proof.
import { beforeAll, describe, it, expect, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { Link, MemoryRouter, useLocation } from "react-router-dom";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import { existsSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PCard,
  SectionHeader,
  SectionCard,
  KPICard,
  HeroCard,
  StatusDot,
  StatePanel,
  type StatePanelProps,
  Shimmer,
} from "@/design-system/patterns";

const StateActionLocation = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="state-action-location">{pathname}{search}</span>;
};

const stateI18n = createInstance();
beforeAll(async () => {
  await stateI18n.use(initReactI18next).init({
    lng: "en", fallbackLng: "en", ns: ["common"], defaultNS: "common",
    resources: { en: { common: en }, ar: { common: ar } },
    interpolation: { escapeValue: false },
  });
});

describe("design-system patterns", () => {
  it("keeps the retired shared copies absent and the canonical loading pattern available", () => {
    for (const name of ["SectionHeader", "Shimmer"]) {
      const retired = fileURLToPath(new NodeURL(`../../components/shared/${name}.tsx`, import.meta.url));
      expect(existsSync(retired)).toBe(false);
    }
    const { container } = render(<Shimmer className="h-4" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveClass("animate-shimmer", "h-4");
  });

  it("PageHeader renders the title and optional action", () => {
    render(<PageHeader title="Fees" action={<button>Add</button>} />);
    expect(screen.getByRole("heading", { name: "Fees" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("PCard renders children on a card surface", () => {
    const { container } = render(<PCard>body</PCard>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-card");
    expect(el).toHaveTextContent("body");
  });

  it("PCard has static no-padding block defaults and preserves caller overrides", () => {
    const { rerender } = render(<PCard data-testid="surface">content</PCard>);
    const surface = screen.getByTestId("surface");
    expect(surface).toHaveAttribute("data-slot", "card");
    expect(surface).toHaveClass("block", "gap-0", "p-0", "text-card-foreground");
    expect(surface.className).not.toMatch(/(?:^|\s)(?:hover:|transition-)/);
    expect(surface).toHaveClass("motion-reduce:transition-none", "motion-reduce:hover:translate-y-0", "border-border", "shadow-(--depth-2)");
    expect(surface).not.toHaveClass("shadow-sm");
    const onClick = vi.fn();
    rerender(<PCard data-testid="surface" id="summary" aria-busy="true" className="flex gap-2 p-4 shadow-none" style={{ maxWidth: "30rem" }} onClick={onClick}>updated</PCard>);
    fireEvent.click(surface);
    expect(onClick).toHaveBeenCalledOnce();
    expect(surface).toHaveAttribute("id", "summary");
    expect(surface).toHaveAttribute("aria-busy", "true");
    expect(surface).toHaveClass("flex", "gap-2", "p-4", "shadow-none");
    expect(surface).not.toHaveClass("block", "gap-0", "p-0", "py-6", "shadow-sm", "shadow-(--depth-2)");
    expect(surface.style.maxWidth).toBe("30rem");
    expect(surface).toHaveTextContent("updated");
  });

  it("SectionHeader preserves heading level, complete copy and trailing actions", () => {
    const title = "مراجعة الأدلة التعليمية وخطوات التحسين التالية لجميع المقررات";
    render(<SectionHeader as="h3" title={title} description="Long supporting evidence" action={<Button>Review</Button>} />);
    const heading = screen.getByRole("heading", { level: 3, name: title });
    expect(heading).toHaveClass("text-foreground", "text-base", "break-words");
    expect(heading).not.toHaveClass("truncate");
    expect(screen.getByText("Long supporting evidence")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("PageHeader preserves the h1 and gives narrow actions a separate layout row", () => {
    const { container } = render(<PageHeader title="Institutional evidence and improvement planning" action={<Button>Review evidence</Button>} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("min-w-0", "break-words");
    expect(container.firstElementChild).toHaveClass("grid");
    expect(screen.getByRole("button", { name: "Review evidence" })).toBeInTheDocument();
  });

  it("SectionHeader renders the title with a decorative icon when given", () => {
    const { container } = render(
      <SectionHeader icon={Wallet} title="History" />
    );
    expect(
      screen.getByRole("heading", { name: "History" })
    ).toBeInTheDocument();
    const chip = container.querySelector('span[aria-hidden="true"]');
    expect(chip).toHaveClass("size-8", "bg-transparent", "text-primary");
  });

  it.each([PageHeader, SectionHeader])("heading actions share bounded direct-control layout", (Header) => {
    render(<Header title="Evidence" action={<><Button>Review</Button><a href="#evidence">Evidence link</a></>} />);
    const button = screen.getByRole("button", { name: "Review" });
    const link = screen.getByRole("link", { name: "Evidence link" });
    const actions = button.parentElement;
    expect(link.parentElement).toBe(actions);
    expect(actions).toHaveClass("flex", "flex-wrap", "min-w-0", "max-w-full", "gap-2");
    for (const element of ["button", "a"]) {
      expect(actions).toHaveClass(`[&>${element}]:max-w-full`, `[&>${element}]:whitespace-normal`, `[&>${element}]:h-auto`, `[&>${element}]:min-h-11`, `[&>${element}]:min-w-11`, `[&>${element}]:[overflow-wrap:anywhere]`);
    }
    expect(actions).toHaveClass("[&>a]:inline-flex", "[&>a]:items-center", "[&>a]:justify-center");
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

  it("KPICard composes a static semantic surface without class or paint overrides", () => {
    const { container } = render(<KPICard icon={Wallet} label="Total paid" value="5,000" surface="inset" />);
    expect(screen.getByText("Total paid")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toHaveClass("text-card-foreground", "tabular-nums");
    const card = container.firstElementChild;
    expect(card).toHaveClass("bg-card", "border-border", "rounded-2xl", "shadow-none");
    expect(card).toHaveAttribute("data-kpi-tone", "neutral");
    expect(card).toHaveAttribute("data-kpi-value-state", "available");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.innerHTML).not.toMatch(/hover:-translate|group-hover:scale|text-\[10px\]/);
  });

  it("HeroCard exposes a labeled region when ariaLabel is set", () => {
    render(<HeroCard ariaLabel="Identity">hi</HeroCard>);
    expect(screen.getByRole("region", { name: "Identity" })).toHaveTextContent(
      "hi"
    );
  });

  it("StatusDot is decorative by default and labeled when given a label", () => {
    const { container, rerender } = render(<StatusDot tone="success" />);
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "bg-green-500"
    );
    rerender(<StatusDot tone="danger" label="Critical" />);
    expect(screen.getByRole("img", { name: "Critical" })).toBeInTheDocument();
  });

  it("StatePanel shares card ownership and exposes a named, motion-safe loading state", () => {
    const { container, rerender } = render(<StatePanel variant="loading" message="Loading attendance" />);
    const loading = screen.getByRole("status", { name: "Loading attendance" });
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading).not.toHaveAttribute("aria-hidden");
    expect(loading).toHaveClass("animate-pulse", "motion-reduce:animate-none", "bg-muted");

    rerender(<StatePanel variant="empty" message="Nothing yet." />);
    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-slot", "card");
    expect(container.firstElementChild).toHaveClass("bg-card", "border-border", "shadow-(--depth-2)");
    expect(container.firstElementChild).not.toHaveClass("border-0", "shadow-md");

    rerender(<StatePanel variant="error" message="Broke." className="shadow-none" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Broke.");
    expect(screen.getByRole("alert")).toHaveClass("text-destructive");
    expect(container.firstElementChild).toHaveClass("shadow-none");
    expect(container.firstElementChild).not.toHaveClass("shadow-(--depth-2)");
  });

  it.each(["en", "ar"] as const)("StatePanel defaults use real %s resources", async (language) => {
    await stateI18n.changeLanguage(language);
    for (const key of ["status.loading", "errors.generic", "statePanel.empty", "statePanel.partial", "statePanel.permission"]) {
      expect(stateI18n.exists(key, { lng: language, fallbackLng: false })).toBe(true);
    }
    const panel = (variant: StatePanelProps["variant"]) => (
      <I18nextProvider i18n={stateI18n}><StatePanel variant={variant} /></I18nextProvider>
    );
    const { rerender } = render(panel("loading"));
    expect(screen.getByRole("status", { name: stateI18n.t("status.loading") })).toBeInTheDocument();
    rerender(panel("empty"));
    expect(screen.getByText(stateI18n.t("statePanel.empty"))).toBeInTheDocument();
    rerender(panel("error"));
    expect(screen.getByRole("alert")).toHaveTextContent(stateI18n.t("errors.generic"));
    rerender(panel("partial"));
    expect(screen.getByRole("status")).toHaveTextContent(stateI18n.t("statePanel.partial"));
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(panel("permission"));
    expect(screen.getByRole("alert")).toHaveTextContent(stateI18n.t("statePanel.permission"));
    expect(screen.getByRole("alert")).toHaveAttribute("aria-atomic", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  for (const language of ["en", "ar"] as const) {
    it.each(["loading", "empty", "error", "partial", "permission"] as const)(
      `StatePanel %s keeps real ${language} Button/Link actions outside its announcement`, async (variant) => {
        await stateI18n.changeLanguage(language);
        const copy = language === "ar" ? ar : en;
        const onRetry = vi.fn();
        const { container } = render(
          <I18nextProvider i18n={stateI18n}>
            <MemoryRouter>
              <div dir={language === "ar" ? "rtl" : "ltr"}>
                <StatePanel
                  variant={variant}
                  className="shadow-none"
                  action={<>
                    <Button onClick={onRetry}>{copy.buttons.retry}</Button>
                    <Button asChild variant="outline">
                      <Link to="/student/dashboard?source=state-panel">{copy.nav.dashboard}</Link>
                    </Button>
                  </>}
                />
                <StateActionLocation />
              </div>
            </MemoryRouter>
          </I18nextProvider>
        );
        const cards = container.querySelectorAll('[data-slot="card"]');
        expect(cards).toHaveLength(1);
        expect(cards[0]).toHaveClass("bg-card", "border-border", "grid", "min-w-0", "gap-4", "p-6", "shadow-none");
        const button = screen.getByRole("button", { name: copy.buttons.retry });
        const link = screen.getByRole("link", { name: copy.nav.dashboard });
        expect(link).toHaveAttribute("href", "/student/dashboard?source=state-panel");
        expect(button.closest('[data-slot="card"]')).toBe(cards[0]);
        expect(link.parentElement).toBe(button.parentElement);
        for (const control of [button, link]) {
          expect(control.closest('[role="status"], [role="alert"], [aria-busy="true"]')).toBeNull();
          expect(control).not.toBeDisabled();
        }
        expect(button.parentElement).toHaveClass("flex-wrap", "min-w-0", "max-w-full", "gap-2");
        for (const element of ["button", "a"]) {
          expect(button.parentElement).toHaveClass(
            `[&>${element}]:h-auto`, `[&>${element}]:min-h-11`, `[&>${element}]:min-w-11`,
            `[&>${element}]:max-w-full`, `[&>${element}]:whitespace-normal`, `[&>${element}]:[overflow-wrap:anywhere]`
          );
        }
        if (variant === "loading") {
          expect(screen.getByRole("status", { name: copy.status.loading })).toHaveAttribute("aria-busy", "true");
          expect(screen.getByRole("status")).toHaveClass("h-40", "animate-pulse", "motion-reduce:animate-none");
        } else if (variant === "partial") {
          expect(screen.getByRole("status")).toHaveTextContent(copy.statePanel.partial);
          expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
        } else if (variant === "error" || variant === "permission") {
          expect(screen.getByRole("alert")).toHaveTextContent(variant === "error" ? copy.errors.generic : copy.statePanel.permission);
        } else {
          expect(screen.getByText(copy.statePanel.empty)).not.toHaveAttribute("role");
          expect(screen.queryByRole("status")).not.toBeInTheDocument();
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        }
        fireEvent.click(button);
        expect(onRetry).toHaveBeenCalledOnce();
        fireEvent.click(link);
        expect(screen.getByTestId("state-action-location")).toHaveTextContent("/student/dashboard?source=state-panel");
      }
    );

    it(`StatePanel preserves explicit ${language} messages and creates no default actions`, async () => {
      await stateI18n.changeLanguage(language);
      const message = language === "ar" ? "تتوفر سجلات لبعض المقررات فقط." : "Records are available for only some courses.";
      const panel = (variant: StatePanelProps["variant"]) => (
        <I18nextProvider i18n={stateI18n}><StatePanel variant={variant} message={message} /></I18nextProvider>
      );
      const { container, rerender } = render(panel("loading"));
      expect(container.querySelector('[data-slot="card"]')).toBeNull();
      expect(screen.getByRole("status", { name: message })).toHaveClass("h-40");
      for (const variant of ["empty", "error", "partial", "permission"] as const) {
        rerender(panel(variant));
        expect(screen.getByText(message)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
        expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(1);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
      }
    });
  }
});

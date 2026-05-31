// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import PrimaryCTA, {
  type PrimaryCtaAction,
} from "@/components/shared/PrimaryCTA";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const action = (
  id: string,
  priority: number,
  applicable: boolean,
  extra: Partial<PrimaryCtaAction> = {}
): PrimaryCtaAction => ({
  id,
  priority,
  applicable,
  label: id,
  ...extra,
});

/**
 * Shared provider wrapper. PrimaryCTA receives already-localized copy from its
 * consumer, but the test still mounts it inside the same I18nextProvider +
 * MemoryRouter context every student surface uses, keeping the harness aligned
 * with the real composition (and resilient if the component later reads i18n).
 */
const Providers = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nextProvider>
);

const renderCTA = (actions: PrimaryCtaAction[]) =>
  render(
    <Providers>
      <PrimaryCTA actions={actions} regionLabel="Recommended actions" />
    </Providers>
  );

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("PrimaryCTA", () => {
  it("renders nothing when no candidate is applicable (R16.1)", () => {
    const { container } = renderCTA([
      action("profile", 0, false),
      action("submit", 1, false),
    ]);
    expect(container.firstChild).toBeNull();
  });

  it("renders exactly one dominant CTA — the highest-precedence applicable action (R16.1)", () => {
    renderCTA([
      action("continue", 2, true, { label: "Continue Course" }),
      action("submit", 1, true, { label: "Submit Assignment" }),
    ]);

    const primary = screen.getByTestId("primary-cta-primary-submit");
    expect(primary.textContent).toContain("Submit Assignment");
    // There must be only one dominant (primary) CTA.
    expect(screen.getAllByTestId(/^primary-cta-primary-/)).toHaveLength(1);
  });

  it("excludes non-applicable candidates from the dominant selection (R16.1)", () => {
    renderCTA([
      action("profile", 0, false, { label: "Complete Profile" }),
      action("submit", 1, true, { label: "Submit Assignment" }),
    ]);
    expect(screen.getByTestId("primary-cta-primary-submit")).toBeTruthy();
    expect(screen.queryByText("Complete Profile")).toBeNull();
  });

  it("renders the remaining applicable actions as a subordinate secondary row (R16.4)", () => {
    renderCTA([
      action("submit", 1, true, { label: "Submit Assignment" }),
      action("continue", 2, true, { label: "Continue Course" }),
      action("feedback", 3, true, { label: "Review Feedback" }),
    ]);

    const secondaryRow = screen.getByTestId("primary-cta-secondaries");
    const secondaryButtons = within(secondaryRow).getAllByRole("button");
    // submit is primary; continue + feedback are secondaries, in precedence order.
    expect(secondaryButtons.map((b) => b.textContent)).toEqual([
      "Continue Course",
      "Review Feedback",
    ]);
  });

  it("does not render a secondary row when only one action applies", () => {
    renderCTA([
      action("submit", 1, true, { label: "Submit Assignment" }),
      action("continue", 2, false, { label: "Continue Course" }),
    ]);
    expect(screen.queryByTestId("primary-cta-secondaries")).toBeNull();
  });

  it("promotes the next applicable candidate when the top is no longer applicable (R16.3)", () => {
    const { rerender } = render(
      <Providers>
        <PrimaryCTA
          actions={[
            action("submit", 1, true, { label: "Submit Assignment" }),
            action("continue", 2, true, { label: "Continue Course" }),
          ]}
        />
      </Providers>
    );
    expect(screen.getByTestId("primary-cta-primary-submit")).toBeTruthy();

    rerender(
      <Providers>
        <PrimaryCTA
          actions={[
            action("submit", 1, false, { label: "Submit Assignment" }),
            action("continue", 2, true, { label: "Continue Course" }),
          ]}
        />
      </Providers>
    );
    expect(screen.getByTestId("primary-cta-primary-continue")).toBeTruthy();
    expect(screen.queryByTestId("primary-cta-primary-submit")).toBeNull();
  });

  it("renders the primary action as a link when href is provided", () => {
    renderCTA([
      action("submit", 1, true, {
        label: "Submit Assignment",
        href: "/student/assignments",
      }),
    ]);
    const link = screen.getByTestId("primary-cta-primary-submit");
    expect(link.getAttribute("href")).toBe("/student/assignments");
  });

  it("invokes onSelect when an action button is activated", () => {
    const onSelect = vi.fn();
    renderCTA([
      action("submit", 1, true, {
        label: "Submit Assignment",
        onSelect,
      }),
    ]);
    fireEvent.click(screen.getByTestId("primary-cta-primary-submit"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("uses the provided localized labels for both primary and secondary actions (R16.5)", () => {
    renderCTA([
      action("submit", 1, true, {
        label: "أكمل واجبك",
        ctaLabel: "إرسال الواجب",
      }),
      action("continue", 2, true, { label: "متابعة المقرر" }),
    ]);
    // Primary headline + distinct button verb both render localized.
    expect(screen.getByText("أكمل واجبك")).toBeTruthy();
    expect(screen.getByText("إرسال الواجب")).toBeTruthy();
    // Secondary action label renders localized.
    expect(screen.getByText("متابعة المقرر")).toBeTruthy();
  });

  it("exposes an accessible region label", () => {
    renderCTA([action("submit", 1, true, { label: "Submit Assignment" })]);
    expect(
      screen.getByRole("region", { name: "Recommended actions" })
    ).toBeTruthy();
  });
});

// ─── CTA promotion behavior (R16.2, R16.3) ───────────────────────────────────
//
// Task 21.2 — focused coverage of how the single dominant CTA tracks priority
// as candidates complete. These exercises model the real StudentDashboard
// candidate set (Complete Profile → Submit Assignment → Continue Course →
// Review Feedback, ascending priority = descending precedence) so the test
// reflects how the dashboard wires `primaryCtaSelector` through PrimaryCTA.

/**
 * Build the dashboard candidate set with per-action applicability overrides.
 * Priorities mirror StudentDashboard: lower priority = higher precedence.
 */
const dashboardActions = (
  applicable: Partial<Record<string, boolean>> = {}
): PrimaryCtaAction[] => [
  action("complete-profile", 0, applicable["complete-profile"] ?? true, {
    label: "Complete Profile",
  }),
  action("submit-assignment", 1, applicable["submit-assignment"] ?? true, {
    label: "Submit Assignment",
  }),
  action("continue-course", 2, applicable["continue-course"] ?? true, {
    label: "Continue Course",
  }),
  action("review-feedback", 3, applicable["review-feedback"] ?? true, {
    label: "Review Feedback",
  }),
];

const renderDashboardCTA = (
  applicable: Partial<Record<string, boolean>> = {}
) =>
  render(
    <Providers>
      <PrimaryCTA actions={dashboardActions(applicable)} />
    </Providers>
  );

describe("PrimaryCTA — CTA promotion behavior (R16.2, R16.3)", () => {
  it("renders the highest-priority applicable candidate as the dominant CTA (R16.2)", () => {
    // All four apply: the lowest-priority value (complete-profile) is dominant.
    renderDashboardCTA();
    expect(
      screen.getByTestId("primary-cta-primary-complete-profile")
    ).toBeTruthy();
    expect(screen.getAllByTestId(/^primary-cta-primary-/)).toHaveLength(1);
  });

  it("excludes inapplicable higher-priority candidates so the next applicable one is dominant (R16.2)", () => {
    // Profile no longer applies; submit (next precedence) becomes dominant even
    // though a higher-priority candidate exists in the set.
    renderDashboardCTA({ "complete-profile": false });
    expect(
      screen.getByTestId("primary-cta-primary-submit-assignment")
    ).toBeTruthy();
    expect(
      screen.queryByTestId("primary-cta-primary-complete-profile")
    ).toBeNull();
    // The inapplicable candidate is not surfaced anywhere (not in secondaries).
    expect(screen.queryByText("Complete Profile")).toBeNull();
  });

  it("promotes each next-highest candidate as the dominant one completes, in order (R16.3)", () => {
    const { rerender } = render(
      <Providers>
        <PrimaryCTA actions={dashboardActions()} />
      </Providers>
    );
    // Start: profile dominant.
    expect(
      screen.getByTestId("primary-cta-primary-complete-profile")
    ).toBeTruthy();

    // Complete profile → submit promoted.
    rerender(
      <Providers>
        <PrimaryCTA actions={dashboardActions({ "complete-profile": false })} />
      </Providers>
    );
    expect(
      screen.getByTestId("primary-cta-primary-submit-assignment")
    ).toBeTruthy();

    // Complete submit too → continue promoted.
    rerender(
      <Providers>
        <PrimaryCTA
          actions={dashboardActions({
            "complete-profile": false,
            "submit-assignment": false,
          })}
        />
      </Providers>
    );
    expect(
      screen.getByTestId("primary-cta-primary-continue-course")
    ).toBeTruthy();

    // Complete continue too → review promoted (the last applicable candidate).
    rerender(
      <Providers>
        <PrimaryCTA
          actions={dashboardActions({
            "complete-profile": false,
            "submit-assignment": false,
            "continue-course": false,
          })}
        />
      </Providers>
    );
    expect(
      screen.getByTestId("primary-cta-primary-review-feedback")
    ).toBeTruthy();
  });

  it("renders nothing once the last applicable candidate is completed (R16.1, R16.3)", () => {
    const { container } = renderDashboardCTA({
      "complete-profile": false,
      "submit-assignment": false,
      "continue-course": false,
      "review-feedback": false,
    });
    expect(container.firstChild).toBeNull();
  });

  it("removes the completed candidate entirely rather than demoting it to a secondary (R16.3)", () => {
    const { rerender } = render(
      <Providers>
        <PrimaryCTA actions={dashboardActions()} />
      </Providers>
    );
    // Profile is dominant; submit/continue/review are secondaries.
    expect(
      screen.getByTestId("primary-cta-primary-complete-profile")
    ).toBeTruthy();
    let secondaryRow = screen.getByTestId("primary-cta-secondaries");
    expect(
      within(secondaryRow)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["Submit Assignment", "Continue Course", "Review Feedback"]);

    // Completing profile promotes submit and drops profile from the UI entirely.
    rerender(
      <Providers>
        <PrimaryCTA actions={dashboardActions({ "complete-profile": false })} />
      </Providers>
    );
    expect(
      screen.getByTestId("primary-cta-primary-submit-assignment")
    ).toBeTruthy();
    expect(screen.queryByText("Complete Profile")).toBeNull();
    secondaryRow = screen.getByTestId("primary-cta-secondaries");
    expect(
      within(secondaryRow)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["Continue Course", "Review Feedback"]);
  });

  it("reclaims dominance for a higher-priority candidate when it becomes applicable again (R16.2, R16.3)", () => {
    // Start with profile inapplicable: submit is dominant, profile is absent.
    const { rerender } = render(
      <Providers>
        <PrimaryCTA actions={dashboardActions({ "complete-profile": false })} />
      </Providers>
    );
    expect(
      screen.getByTestId("primary-cta-primary-submit-assignment")
    ).toBeTruthy();
    expect(screen.queryByText("Complete Profile")).toBeNull();

    // Profile becomes applicable again → it reclaims the dominant spot and the
    // previously-dominant submit is demoted into the subordinate row.
    rerender(
      <Providers>
        <PrimaryCTA actions={dashboardActions()} />
      </Providers>
    );
    expect(
      screen.getByTestId("primary-cta-primary-complete-profile")
    ).toBeTruthy();
    expect(
      screen.queryByTestId("primary-cta-primary-submit-assignment")
    ).toBeNull();
    const secondaryRow = screen.getByTestId("primary-cta-secondaries");
    expect(
      within(secondaryRow)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toContain("Submit Assignment");
  });
});

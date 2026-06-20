// @vitest-environment happy-dom
// =============================================================================
// Feature: dashboard-and-ux-performance — Phase 7 Task 24 (Appendix B §B.3.5).
// Proves <SectionState> renders the right branch and — critically — surfaces a
// RETRYABLE error instead of vanishing when a query fails with no data, so a
// cancelled/timed-out section no longer silently disappears.
// =============================================================================
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SectionState from "@/components/shared/SectionState";

// Hermetic i18n: return the key so assertions are stable regardless of locale.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("SectionState", () => {
  it("renders the loading fallback while loading with no data", () => {
    render(
      <SectionState
        isLoading
        isError={false}
        data={undefined}
        loadingFallback={<div data-testid="skeleton" />}
      >
        {() => <div data-testid="content" />}
      </SectionState>
    );
    expect(screen.getByTestId("skeleton")).toBeTruthy();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("surfaces a retryable error (not silence) when the query fails with no data", () => {
    const onRetry = vi.fn();
    render(
      <SectionState
        isLoading={false}
        isError
        data={undefined}
        onRetry={onRetry}
      >
        {() => <div data-testid="content" />}
      </SectionState>
    );
    // Error copy + retry are visible…
    expect(screen.getByText("errorBoundary.title")).toBeTruthy();
    const retry = screen.getByRole("button", { name: "actions.retry" });
    expect(retry).toBeTruthy();
    // …and clicking retry invokes the caller's refetch.
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    // The content never rendered.
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("renders children when data is present and non-empty", () => {
    render(
      <SectionState isLoading={false} isError={false} data={[1, 2, 3]}>
        {(items) => <div data-testid="content">{items.length}</div>}
      </SectionState>
    );
    expect(screen.getByTestId("content").textContent).toBe("3");
  });

  it("renders the empty fallback when the query succeeded but the result is empty", () => {
    render(
      <SectionState
        isLoading={false}
        isError={false}
        data={[]}
        emptyFallback={<div data-testid="empty" />}
      >
        {() => <div data-testid="content" />}
      </SectionState>
    );
    expect(screen.getByTestId("empty")).toBeTruthy();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("prefers showing (stale) data over an error when both are present", () => {
    // data exists from a prior success, a background refetch then errored.
    render(
      <SectionState isLoading={false} isError data={[42]}>
        {(items) => <div data-testid="content">{items[0]}</div>}
      </SectionState>
    );
    expect(screen.getByTestId("content").textContent).toBe("42");
    expect(screen.queryByText("errorBoundary.title")).toBeNull();
  });

  it("renders nothing when idle with no data (no spurious error)", () => {
    const { container } = render(
      <SectionState isLoading={false} isError={false} data={undefined}>
        {() => <div data-testid="content" />}
      </SectionState>
    );
    expect(container.textContent).toBe("");
    expect(screen.queryByTestId("content")).toBeNull();
  });
});

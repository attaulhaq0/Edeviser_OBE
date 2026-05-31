// =============================================================================
// TutorStatePanel — Unit tests
// Feature: student-experience-remediation, Task 12.4
// Validates: Requirements 4.2, 4.3, 4.4
// -----------------------------------------------------------------------------
// Verifies that each non-ready TutorUiState renders its own distinct panel with
// the localized title/message routed through the `ai` i18next namespace, and
// that the `ready` state renders nothing so the live chat surface shows through.
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import enAi from "@/locales/en/ai.json";
import arAi from "@/locales/ar/ai.json";
import TutorStatePanel from "@/pages/student/tutor/TutorStatePanel";
import type { TutorUiState } from "@/lib/tutorStatus";

// Pull the canonical copy straight from the locale so the assertions stay in
// sync with the source of truth rather than duplicating literal strings.
const states = enAi.tutor.states;

const renderPanel = (state: TutorUiState, onRetry?: () => void) =>
  render(
    <I18nextProvider i18n={i18n}>
      <TutorStatePanel state={state} onRetry={onRetry} />
    </I18nextProvider>
  );

describe("TutorStatePanel", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the unavailable panel with its localized title and message (R4.2)", () => {
    renderPanel({ kind: "unavailable" });

    expect(screen.getByText(states.unavailable.title)).toBeInTheDocument();
    expect(screen.getByText(states.unavailable.message)).toBeInTheDocument();
  });

  it("renders the not-enrolled panel with its localized title and message (R4.3)", () => {
    renderPanel({ kind: "not_enrolled" });

    expect(screen.getByText(states.notEnrolled.title)).toBeInTheDocument();
    expect(screen.getByText(states.notEnrolled.message)).toBeInTheDocument();
  });

  it("renders the no-embeddings panel with its localized title and message (R4.4)", () => {
    renderPanel({ kind: "no_embeddings" });

    expect(screen.getByText(states.noEmbeddings.title)).toBeInTheDocument();
    expect(screen.getByText(states.noEmbeddings.message)).toBeInTheDocument();
  });

  it("renders the rate-limited panel with its localized title and message (R4.2)", () => {
    renderPanel({ kind: "rate_limited" });

    expect(screen.getByText(states.rateLimited.title)).toBeInTheDocument();
    expect(screen.getByText(states.rateLimited.message)).toBeInTheDocument();
  });

  it("appends the localized reset hint to the rate-limited message when provided", () => {
    const resetHint = "at midnight";
    renderPanel({ kind: "rate_limited", resetHint });

    expect(screen.getByText(states.rateLimited.title)).toBeInTheDocument();
    // The reset interpolation embeds the hint; assert the rendered fragment
    // contains it without duplicating the full i18n template literal.
    expect(
      screen.getByText((content) => content.includes(resetHint))
    ).toBeInTheDocument();
  });

  it("renders the guaranteed error fallback with localized title and default message (R4.2a)", () => {
    renderPanel({ kind: "error", message: "" });

    expect(screen.getByText(states.error.title)).toBeInTheDocument();
    expect(screen.getByText(states.error.message)).toBeInTheDocument();
  });

  it("renders a backend-provided error message in the fallback panel when present", () => {
    const backendMessage = "Upstream model returned 418";
    renderPanel({ kind: "error", message: backendMessage });

    expect(screen.getByText(states.error.title)).toBeInTheDocument();
    expect(screen.getByText(backendMessage)).toBeInTheDocument();
  });

  it("offers a retry control on recoverable panels (unavailable, error)", () => {
    const { unmount } = renderPanel({ kind: "unavailable" }, () => {});
    expect(
      screen.getByRole("button", { name: states.retry })
    ).toBeInTheDocument();
    unmount();

    renderPanel({ kind: "error", message: "" }, () => {});
    expect(
      screen.getByRole("button", { name: states.retry })
    ).toBeInTheDocument();
  });

  it("renders nothing for the ready state so the live chat surface shows through", () => {
    const { container } = renderPanel({ kind: "ready" });
    expect(container).toBeEmptyDOMElement();
  });

  it("localizes panels in Arabic when the language switches", async () => {
    await i18n.changeLanguage("ar");

    renderPanel({ kind: "unavailable" });

    expect(
      screen.getByText(arAi.tutor.states.unavailable.title)
    ).toBeInTheDocument();
  });
});

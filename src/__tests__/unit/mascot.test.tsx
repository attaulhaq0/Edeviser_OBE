// =============================================================================
// Component tests — Mascot coaching surface (R35)
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import Mascot from "@/components/shared/Mascot";
import { setMascotGuidanceEnabled } from "@/hooks/useMascotGuidance";

const renderMascot = (moment: Parameters<typeof Mascot>[0]["moment"]) =>
  render(
    <I18nextProvider i18n={i18n}>
      <Mascot moment={moment} />
    </I18nextProvider>
  );

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Mascot", () => {
  it("renders coaching copy for the welcome moment when enabled (R35.1)", async () => {
    await i18n.changeLanguage("en");
    setMascotGuidanceEnabled(true);
    renderMascot("welcome");
    expect(screen.getByText("Hi, I'm Edi!")).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders the password-screen coaching presence (R35.2)", async () => {
    await i18n.changeLanguage("en");
    setMascotGuidanceEnabled(true);
    renderMascot("password");
    expect(screen.getByText("Keeping you safe")).toBeInTheDocument();
  });

  it("renders nothing when mascot guidance is disabled (R35.4)", () => {
    setMascotGuidanceEnabled(false);
    const { container } = renderMascot("welcome");
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no moment is active (R35.5)", () => {
    setMascotGuidanceEnabled(true);
    const { container } = renderMascot(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Arabic copy when the language is Arabic (R35.3)", async () => {
    await i18n.changeLanguage("ar");
    setMascotGuidanceEnabled(true);
    renderMascot("welcome");
    expect(screen.getByText("مرحبًا، أنا إيدي!")).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });
});

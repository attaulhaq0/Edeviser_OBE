// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import i18n from "@/lib/i18n";
import PrivacyPage from "@/pages/public/PrivacyPage";
import TermsPage from "@/pages/public/TermsPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useLanguagePreference", () => ({
  useUpdateLanguagePreference: () => ({ mutate: vi.fn() }),
}));

const renderPage = (page: ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{page}</MemoryRouter>
    </I18nextProvider>
  );

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

describe("public legal pages", () => {
  it("renders the complete shared Terms layout in English", async () => {
    await i18n.changeLanguage("en");
    renderPage(<TermsPage />);

    expect(
      screen.getByRole("heading", { name: "Terms of Service", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "8. Contact", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "legal@edeviser.com" })
    ).toHaveAttribute("href", "mailto:legal@edeviser.com");
    expect(
      screen.getByRole("link", { name: /Privacy Policy/ })
    ).toHaveAttribute("href", "/privacy");
  });

  it("renders the complete shared Privacy layout in Arabic", async () => {
    await i18n.changeLanguage("ar");
    renderPage(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "سياسة الخصوصية", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "8. التواصل", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "privacy@edeviser.com" })
    ).toHaveAttribute("href", "mailto:privacy@edeviser.com");
    expect(screen.getByRole("link", { name: /شروط الخدمة/ })).toHaveAttribute(
      "href",
      "/terms"
    );
  });
});

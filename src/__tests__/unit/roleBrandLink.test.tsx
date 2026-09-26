import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RoleBrandLink from "@/components/shared/RoleBrandLink";
import i18n from "@/lib/i18n";

afterEach(cleanup);
beforeEach(async () => { await i18n.changeLanguage("en"); });

describe("shared role brand destination contract", () => {
  it.each(["student", "teacher", "coordinator", "admin", "parent"] as const)("preserves the %s dashboard root", (role) => {
    render(<I18nextProvider i18n={i18n}><MemoryRouter><RoleBrandLink userRole={role} /></MemoryRouter></I18nextProvider>);
    expect(screen.getByRole("link", { name: "Edeviser — go to dashboard" })).toHaveAttribute("href", `/${role}`);
    expect(screen.getByText("Edeviser")).toBeInTheDocument();
  });
  it("localizes the dashboard link name in Arabic without translating the brand", async () => {
    await i18n.changeLanguage("ar");
    render(<I18nextProvider i18n={i18n}><MemoryRouter><RoleBrandLink userRole="parent" /></MemoryRouter></I18nextProvider>);
    expect(screen.getByRole("link", { name: "Edeviser — الانتقال إلى لوحة المعلومات" })).toHaveAttribute("href", "/parent");
    expect(screen.getByText("Edeviser")).toBeInTheDocument();
  });
});

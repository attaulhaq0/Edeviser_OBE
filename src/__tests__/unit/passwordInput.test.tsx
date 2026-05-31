// Unit tests for PasswordInput + PasswordVisibilityGroup
// Covers Requirements 5.1, 5.2, 5.3, 5.4, 5.5

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordVisibilityGroup } from "@/components/shared/PasswordVisibilityGroup";

const wrap = (ui: React.ReactNode) => (
  <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
);

describe("PasswordInput", () => {
  it("renders a masked password input with a show toggle by default (R5.1, R5.3)", () => {
    render(wrap(<PasswordInput placeholder="Password" />));

    const input = screen.getByPlaceholderText("Password");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toBeInTheDocument();
  });

  it("reveals characters in plain text when the show control is activated (R5.2)", async () => {
    const user = userEvent.setup();
    render(wrap(<PasswordInput placeholder="Password" />));

    const input = screen.getByPlaceholderText("Password");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(input).toHaveAttribute("type", "text");
  });

  it("masks characters again when the hide control is activated (R5.3)", async () => {
    const user = userEvent.setup();
    render(wrap(<PasswordInput placeholder="Password" />));

    const input = screen.getByPlaceholderText("Password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(input).toHaveAttribute("type", "password");
  });

  it("exposes an accessible name reflecting the current action (R5.4)", async () => {
    const user = userEvent.setup();
    render(wrap(<PasswordInput placeholder="Password" />));

    // Masked → control offers to show.
    expect(
      screen.getByRole("button", { name: "Show password" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show password" }));

    // Revealed → control offers to hide.
    expect(
      screen.getByRole("button", { name: "Hide password" })
    ).toBeInTheDocument();
  });

  it("meets the minimum 44px touch target (R5.4)", () => {
    render(wrap(<PasswordInput placeholder="Password" />));
    const toggle = screen.getByRole("button", { name: "Show password" });
    // h-11 w-11 = 44px in the Tailwind scale.
    expect(toggle.className).toContain("h-11");
    expect(toggle.className).toContain("w-11");
  });

  it("disables the toggle when the field is disabled", () => {
    render(wrap(<PasswordInput placeholder="Password" disabled />));
    expect(
      screen.getByRole("button", { name: "Show password" })
    ).toBeDisabled();
  });
});

describe("PasswordVisibilityGroup mutual exclusion (R5.5)", () => {
  const renderGroup = () =>
    render(
      wrap(
        <PasswordVisibilityGroup>
          <PasswordInput groupId="new" placeholder="New password" />
          <PasswordInput groupId="confirm" placeholder="Confirm password" />
        </PasswordVisibilityGroup>
      )
    );

  it("reveals at most one password field at a time", async () => {
    const user = userEvent.setup();
    renderGroup();

    const newInput = screen.getByPlaceholderText("New password");
    const confirmInput = screen.getByPlaceholderText("Confirm password");

    // Reveal the first field.
    const [firstToggle] = screen.getAllByRole("button", {
      name: "Show password",
    });
    await user.click(firstToggle as HTMLElement);
    expect(newInput).toHaveAttribute("type", "text");
    expect(confirmInput).toHaveAttribute("type", "password");

    // Revealing the second field must mask the first.
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(confirmInput).toHaveAttribute("type", "text");
    expect(newInput).toHaveAttribute("type", "password");
  });

  it("hiding the revealed field masks all fields", async () => {
    const user = userEvent.setup();
    renderGroup();

    const newInput = screen.getByPlaceholderText("New password");

    const [firstToggle] = screen.getAllByRole("button", {
      name: "Show password",
    });
    await user.click(firstToggle as HTMLElement);
    expect(newInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(newInput).toHaveAttribute("type", "password");
    // Both fields now offer "Show password".
    expect(
      screen.getAllByRole("button", { name: "Show password" })
    ).toHaveLength(2);
  });
});

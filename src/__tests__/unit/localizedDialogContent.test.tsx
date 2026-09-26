import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LocalizedDialogContent } from "@/components/shared/LocalizedDialogContent";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

afterEach(cleanup);

async function mount(language: "en" | "ar") {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: false,
    defaultNS: "common",
    initAsync: false,
    resources: { en: { common: en }, ar: { common: ar } },
  });
  const view = render(
    <I18nextProvider i18n={i18n}>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open fixture</Button>
        </DialogTrigger>
        <LocalizedDialogContent
          className="sm:max-w-md"
          aria-describedby="dialog-detail"
        >
          <DialogHeader>
            <DialogTitle>Owned dialog</DialogTitle>
            <DialogDescription id="dialog-detail">
              Safe dialog body
            </DialogDescription>
          </DialogHeader>
        </LocalizedDialogContent>
      </Dialog>
    </I18nextProvider>
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Open fixture" }));
  return { view, i18n };
}

describe("generated DialogContent adoption with localized logical close", () => {
  it.each(["en", "ar"] as const)(
    "uses one translated close and preserves Radix dismissal/focus (%s)",
    async (language) => {
      const { i18n } = await mount(language),
        user = userEvent.setup();
      const dialog = screen.getByRole("dialog", { name: "Owned dialog" });
      const close = within(dialog).getByRole("button", {
        name: i18n.t("buttons.close"),
      });
      expect(close).toHaveClass("end-3", "size-11");
      expect(close.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(within(dialog).queryByText("Close")).toBeNull();
      await user.click(close);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Open fixture" })
      ).toHaveFocus();
    }
  );
  it("still dismisses through Escape, preserving generated portal ownership", async () => {
    await mount("ar");
    const dialog = screen.getByRole("dialog", { name: "Owned dialog" });
    await userEvent.setup().keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(dialog.isConnected).toBe(false);
  });
});

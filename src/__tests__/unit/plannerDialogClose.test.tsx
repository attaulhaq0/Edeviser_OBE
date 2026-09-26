import { useRef, useState } from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import CreateTaskDialog from "@/components/shared/CreateTaskDialog";
import CreateSessionDialog from "@/components/shared/CreateSessionDialog";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const course = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic K–12 course",
  clos: [],
};
const defaultDate = "2026-09-26";
afterEach(cleanup);

async function mount(
  kind: "task" | "session",
  language: "en" | "ar",
  pending = false
) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: false,
    defaultNS: "common",
    initAsync: false,
    resources: { en: { common: en }, ar: { common: ar } },
  });
  const changed = vi.fn(),
    submitted = vi.fn();
  function Fixture() {
    const [open, setOpen] = useState(false);
    const openerRef = useRef<HTMLButtonElement>(null);
    const onOpenChange = (next: boolean) => {
      changed(next);
      setOpen(next);
    };
    return (
      <>
        <Button type="button" ref={openerRef} onClick={() => setOpen(true)}>
          Open fixture
        </Button>
        {kind === "task" ? (
          <CreateTaskDialog
            open={open}
            onOpenChange={onOpenChange}
            returnFocusRef={openerRef}
            defaultDate={defaultDate}
            courses={[course]}
            onSubmit={submitted}
            isPending={pending}
          />
        ) : (
          <CreateSessionDialog
            open={open}
            onOpenChange={onOpenChange}
            returnFocusRef={openerRef}
            defaultDate={defaultDate}
            courses={[course]}
            onSubmit={submitted}
            isPending={pending}
          />
        )}
      </>
    );
  }
  render(
    <I18nextProvider i18n={i18n}>
      <Fixture />
    </I18nextProvider>
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Open fixture" }));
  return { user, i18n, changed, submitted };
}

describe("S09 planner form close adoption retains owned actions", () => {
  it.each(["task", "session"] as const)(
    "uses only one translated Radix close, with no submit on X (%s)",
    async (kind) => {
      const { user, i18n, changed, submitted } = await mount(kind, "ar");
      const dialog = screen.getByRole("dialog");
      const close = within(dialog).getByRole("button", {
        name: i18n.t("buttons.close"),
      });
      expect(
        within(dialog).getAllByRole("button", { name: i18n.t("buttons.close") })
      ).toHaveLength(1);
      expect(close).toHaveClass("size-11", "end-3");
      expect(within(dialog).queryByText("Close")).toBeNull();
      await user.type(
        within(dialog).getByRole("textbox", { name: "Title" }),
        "Unsubmitted reflection"
      );
      await user.click(close);
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Open fixture" })
        ).toHaveFocus()
      );
      expect(changed).toHaveBeenLastCalledWith(false);
      expect(submitted).not.toHaveBeenCalled();
    }
  );
  it.each(["task", "session"] as const)(
    "preserves pending button and existing X dismissal boundaries (%s)",
    async (kind) => {
      const { user, i18n, changed, submitted } = await mount(kind, "en", true);
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByRole("button", {
          name: kind === "task" ? "Create Task" : "Create Session",
        })
      ).toBeDisabled();
      const close = within(dialog).getByRole("button", {
        name: i18n.t("buttons.close"),
      });
      expect(close).toBeEnabled(); // Generated default X already allowed dismissal during pending.
      await user.click(close);
      expect(changed).toHaveBeenLastCalledWith(false);
      expect(submitted).not.toHaveBeenCalled();
    }
  );
  it.each(["task", "session"] as const)(
    "keeps Cancel onOpenChange and draft unrelated to submission (%s)",
    async (kind) => {
      const { user, changed, submitted } = await mount(kind, "en");
      const dialog = screen.getByRole("dialog");
      await user.type(
        within(dialog).getByRole("textbox", { name: "Title" }),
        "Unsubmitted lesson"
      );
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(changed).toHaveBeenLastCalledWith(false);
      expect(submitted).not.toHaveBeenCalled();
    }
  );
});

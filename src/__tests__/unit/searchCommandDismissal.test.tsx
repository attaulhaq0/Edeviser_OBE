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
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchCommand from "@/components/shared/SearchCommand";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const state = vi.hoisted(() => ({
  role: "student",
  pending: false,
  requests: [] as Array<{ query: string; role: string }>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock("@/hooks/useGlobalSearch", () => ({
  useGlobalSearch: (query: string, role: string) => {
    state.requests.push({ query, role });
    return {
      data:
        query === "algebra"
          ? [
              {
                id: "fixture-course",
                type: "course",
                title: "Algebra",
                url: "/student/courses",
              },
            ]
          : [],
      isLoading: state.pending && query === "algebra",
    };
  },
}));
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}
async function mount(language: "en" | "ar") {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: false,
    defaultNS: "common",
    initAsync: false,
    resources: { en: { common: en }, ar: { common: ar } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <SearchCommand showTrigger />
        <LocationProbe />
      </MemoryRouter>
    </I18nextProvider>
  );
  return i18n;
}
afterEach(() => {
  cleanup();
  state.requests = [];
  state.pending = false;
  state.role = "student";
});

describe("command-palette custom in-flow close and query ownership", () => {
  it.each(["en", "ar"] as const)(
    "reserves a single translated close beside the search input (%s)",
    async (language) => {
      const i18n = await mount(language),
        user = userEvent.setup();
      const trigger = screen.getByRole("button", {
        name: i18n.t("header.openGlobalSearch"),
      });
      await user.click(trigger);
      const dialog = screen.getByRole("dialog", {
        name: i18n.t("header.search"),
      });
      expect(
        within(dialog).getAllByRole("button", { name: i18n.t("buttons.close") })
      ).toHaveLength(1);
      const input = within(dialog).getByRole("textbox", {
        name: i18n.t("header.search"),
      });
      expect(input).toHaveAttribute("name", "global-search");
      expect(input).toHaveAttribute("autocomplete", "off");
      expect(input).toHaveAttribute("spellcheck", "false");
      expect(input.parentElement).toHaveClass("min-w-0", "focus-within:ring-2");
      await waitFor(() => expect(input).toHaveFocus());
      await user.type(input, "algebra");
      await waitFor(() =>
        expect(
          state.requests.some(
            (x) => x.query === "algebra" && x.role === "student"
          )
        ).toBe(true)
      );
      expect(
        within(dialog).getByText(i18n.t("header.searchType.course"))
      ).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", { name: i18n.t("buttons.close") })
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(trigger).toHaveFocus());
      await user.click(trigger);
      const reopened = screen.getByRole("dialog", {
        name: i18n.t("header.search"),
      });
      expect(
        within(reopened).getByRole("textbox", { name: i18n.t("header.search") })
      ).toHaveValue("");
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
    }
  );

  it("keeps Cmd/Ctrl+K, Escape, and command routing on one reset path", async () => {
    const i18n = await mount("en"),
      user = userEvent.setup();
    await user.keyboard("{Control>}k{/Control}");
    let dialog = screen.getByRole("dialog", { name: i18n.t("header.search") });
    let input = within(dialog).getByRole("textbox", {
      name: i18n.t("header.search"),
    });
    await waitFor(() => expect(input).toHaveFocus());
    await user.type(input, "progress");
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.keyboard("{Meta>}k{/Meta}");
    dialog = screen.getByRole("dialog", { name: i18n.t("header.search") });
    input = within(dialog).getByRole("textbox", {
      name: i18n.t("header.search"),
    });
    expect(input).toHaveValue("");
    await user.click(
      within(dialog).getByRole("button", {
        name: i18n.t("header.commands.progress"),
      })
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("path")).toHaveTextContent("/student/progress");
    await user.keyboard("{Control>}k{/Control}");
    expect(
      screen.getByRole("textbox", { name: i18n.t("header.search") })
    ).toHaveValue("");
  });
  it.each(["en", "ar"] as const)(
    "announces pending search without losing keyboard Close (%s)",
    async (language) => {
      state.pending = true;
      const i18n = await mount(language),
        user = userEvent.setup();
      await user.click(
        screen.getByRole("button", { name: i18n.t("header.openGlobalSearch") })
      );
      const dialog = screen.getByRole("dialog", {
        name: i18n.t("header.search"),
      });
      await user.type(
        within(dialog).getByRole("textbox", { name: i18n.t("header.search") }),
        "algebra"
      );
      expect(
        await within(dialog).findByRole("status", {
          name: i18n.t("header.searchLoading"),
        })
      ).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", { name: i18n.t("buttons.close") })
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    }
  );
  it.each([
    {
      role: "student",
      label: "header.commands.learningPath",
      path: "/student/learning-path",
    },
    {
      role: "admin",
      label: "header.commands.analytics",
      path: "/admin/analytics",
    },
    {
      role: "admin",
      label: "header.commands.aiGovernance",
      path: "/admin/governance",
    },
  ])(
    "routes $label to its corresponding owned page",
    async ({ role, label, path }) => {
      state.role = role;
      const i18n = await mount("en"),
        user = userEvent.setup();
      await user.click(
        screen.getByRole("button", { name: i18n.t("header.openGlobalSearch") })
      );
      const dialog = screen.getByRole("dialog", {
        name: i18n.t("header.search"),
      });
      await user.click(
        within(dialog).getByRole("button", { name: i18n.t(label) })
      );
      expect(screen.getByTestId("path")).toHaveTextContent(path);
      expect(screen.queryByRole("dialog")).toBeNull();
    }
  );
});

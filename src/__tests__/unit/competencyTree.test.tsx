// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import CompetencyTree from "@/components/shared/CompetencyTree";
import { buildCompetencyTree, toCompetencyItem } from "@/lib/competencyTree";
import type { CompetencyItem } from "@/lib/competencyTree";
import en from "@/locales/en/admin.json";
import ar from "@/locales/ar/admin.json";

const renderTree = (items: CompetencyItem[], language = "en") => {
  const i18n = createInstance();
  // Installed i18next uses initAsync; inline resources initialize synchronously.
  void i18n.init({
    lng: language,
    resources: { en: { admin: en }, ar: { admin: ar } },
    initAsync: false,
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <div dir={language === "ar" ? "rtl" : "ltr"}>
        <CompetencyTree items={items} />
      </div>
    </I18nextProvider>
  );
};
// Self-contained synthetic rows exercising the declared name/description/numeric-level contract.
// These labels and descriptions are test data, not official curriculum or live-record evidence.
const samples = [
  ["Synthetic number topic", "Synthetic description for a number topic."],
  ["Synthetic learner attribute", ""],
  ["Synthetic language topic", "Synthetic description for a language topic."],
].map(([name, description], index) =>
  toCompetencyItem({
    id: `item-${index}`,
    framework_id: `framework-${index}`,
    name: name!,
    description: description!,
    level: 0,
    sort_order: 1,
    parent_id: null,
  })
);

describe("CompetencyTree", () => {
  it.each(samples)(
    "renders actual level-zero producer name and selects details: $title",
    async (item) => {
      renderTree([item]);
      const button = screen.getByRole("button", {
        name: new RegExp(item.title),
      });
      expect(button).toHaveTextContent("Level 0");
      expect(
        screen.queryByRole("button", { name: /^Expand/ })
      ).not.toBeInTheDocument();
      await userEvent.click(button);
      const details = screen.getByRole("region", { name: "Item details" });
      expect(within(details).getByText(item.title)).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-pressed", "true");
      if (item.description)
        expect(within(details).getByText(item.description)).toBeInTheDocument();
      else
        expect(
          within(details).getByText("No description provided for this item.")
        ).toBeInTheDocument();
    }
  );
  it("keeps expansion separate from selection; keyboard can select a leaf", async () => {
    const root = { ...samples[0]!, id: "root", title: "Parent" };
    const child = {
      ...samples[0]!,
      id: "child",
      title: "Child",
      parent_id: "root",
      level: 1,
    };
    renderTree([root, child]);
    const toggle = screen.getByRole("button", { name: "Collapse Parent" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", { name: /Level 1 Child/ })
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Expand Parent" })
    );
    const leaf = screen.getByRole("button", { name: /Level 1 Child/ });
    leaf.focus();
    await userEvent.keyboard("{Enter}");
    expect(leaf).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByRole("region")).getByText("Child")
    ).toBeInTheDocument();
  });
  it("shows every orphan/cyclic item with an honest warning instead of disappearing", () => {
    const items = [
      { ...samples[0]!, id: "a", parent_id: "b" },
      { ...samples[1]!, id: "b", parent_id: "a" },
      { ...samples[2]!, id: "orphan", parent_id: "absent" },
    ];
    expect(buildCompetencyTree(items).roots).toHaveLength(3);
    renderTree(items);
    expect(screen.getByRole("status")).toHaveTextContent("parent links");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
  it("localizes empty state and numeric level in Arabic without inventing an IB category", () => {
    const view = renderTree([], "ar");
    expect(screen.getByText(ar.competency.empty)).toBeInTheDocument();
    view.unmount();
    renderTree([samples[0]!], "ar");
    expect(screen.getByRole("button")).toHaveTextContent("المستوى 0");
    expect(screen.getByRole("list").closest("[dir]")).toHaveAttribute(
      "dir",
      "rtl"
    );
  });
});

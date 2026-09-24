// @vitest-environment happy-dom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import type { ColumnDef, OnChangeFn, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

type Row = { name: string; id: string };
type TableProps = ComponentProps<typeof DataTable<Row, unknown>>;
const rows: Row[] = ["Charlie", "Alpha", "Bravo"].map(name => ({ name, id: name }));
const ascending: SortingState = [{ id: "name", desc: false }];
const descending: SortingState = [{ id: "name", desc: true }];
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    sortDescFirst: false,
    header: ({ column, table }) => <>
      <Button onClick={column.getToggleSortingHandler()}>Sort name</Button>
      <Button onClick={() => table.resetSorting()}>Reset sorting</Button>
    </>,
  },
  { accessorKey: "id", header: "Identifier", enableSorting: false },
];
afterEach(cleanup);

async function mount(props: Partial<TableProps> = {}, language = "en") {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, defaultNS: "common",
    resources: { en: { common: en }, ar: { common: ar } }, initAsync: false });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}><div dir={i18n.dir()}>{children}</div></I18nextProvider>
  );
  const table = (input: Partial<TableProps>) => {
    const { sorting, onSortingChange, manualSorting, ...rest } = input;
    if (sorting !== undefined && onSortingChange !== undefined) {
      return <DataTable columns={columns} data={rows} {...rest}
        sorting={sorting} onSortingChange={onSortingChange} manualSorting={manualSorting} />;
    }
    if (sorting !== undefined || onSortingChange !== undefined || manualSorting) {
      throw new Error("Controlled/manual fixture requires sorting and onSortingChange");
    }
    return <DataTable columns={columns} data={rows} {...rest} />;
  };
  const view = render(table(props), { wrapper });
  return { ...view, i18n, update: (next: Partial<TableProps>) =>
    view.rerender(table({ ...props, ...next })) };
}
const names = () => screen.getAllByRole("row").slice(1).map(row =>
  within(row).getAllByRole("cell")[0]?.textContent);
const header = () => screen.getByRole("button", { name: "Sort name" }).closest("th");
const sort = () => userEvent.click(screen.getByRole("button", { name: "Sort name" }));
const reset = () => userEvent.click(screen.getByRole("button", { name: "Reset sorting" }));
function applyRequest(callback: ReturnType<typeof vi.fn<OnChangeFn<SortingState>>>, previous: SortingState) {
  const updater = callback.mock.calls[callback.mock.calls.length - 1]?.[0];
  if (updater === undefined) throw new Error("Expected a sorting change request");
  return typeof updater === "function" ? updater(previous) : updater;
}

// Mock DTOs only: no DataTable, TanStack, translation, or network mocks.
describe("DataTable sorting ownership", () => {
  it("keeps new table/course locale leaves and placeholders aligned", () => {
    for (const group of ["tableSorting", "courseListSorting"] as const) {
      expect(Object.keys(en[group]).sort()).toEqual(Object.keys(ar[group]).sort());
      for (const [key, value] of Object.entries(en[group])) {
        const translated = Object.entries(ar[group]).find(([name]) => name === key)?.[1];
        expect(translated).toBeTruthy();
        expect(translated?.match(/\{\{[^}]+\}\}/g) ?? []).toEqual(value.match(/\{\{[^}]+\}\}/g) ?? []);
      }
    }
  });
  it("preserves uncontrolled local sorting, reset, and sorted-column aria semantics", async () => {
    await mount();
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(header()?.getAttribute("aria-sort")).toBeNull();
    await sort();
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(header()?.getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getByRole("columnheader", { name: "Identifier" }).hasAttribute("aria-sort")).toBe(false);
    await sort();
    expect(names()).toEqual(["Charlie", "Bravo", "Alpha"]);
    expect(header()?.getAttribute("aria-sort")).toBe("descending");
    await reset();
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(header()?.getAttribute("aria-sort")).toBeNull();
  });

  it("preserves default ten-row client pagination and sorts the complete local dataset", async () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Row ${String(12 - i).padStart(2, "0")}` }));
    const { i18n } = await mount({ data });
    expect(names()).toHaveLength(10);
    expect(names()[0]).toBe("Row 12");
    await sort();
    expect(names()[0]).toBe("Row 01");
    await userEvent.click(screen.getByRole("button", { name: i18n.t("buttons.next") }));
    expect(names()).toEqual(["Row 11", "Row 12"]);
    await userEvent.click(screen.getByRole("button", { name: i18n.t("buttons.back") }));
    expect(names()[0]).toBe("Row 01");
    expect(names()).toHaveLength(10);
  });

  it("uses controlled client state, forwards functional updaters, and honors external resets", async () => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    const view = await mount({ sorting: [], onSortingChange });
    await sort();
    expect(typeof onSortingChange.mock.calls[0]?.[0]).toBe("function");
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(applyRequest(onSortingChange, [])).toEqual(ascending);
    view.update({ sorting: ascending });
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    await sort();
    expect(applyRequest(onSortingChange, ascending)).toEqual(descending);
    view.update({ sorting: descending });
    expect(names()).toEqual(["Charlie", "Bravo", "Alpha"]);
    await reset();
    expect(applyRequest(onSortingChange, descending)).toEqual([]);
    view.update({ sorting: [] });
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(header()?.getAttribute("aria-sort")).toBeNull();
  });

  it.each(["en", "ar"])("keeps legacy server sorting page-local with a localized disclosure (%s)", async language => {
    const onPageChange = vi.fn();
    const view = await mount({ page: 2, pageSize: 3, totalCount: 9, onPageChange }, language);
    expect(view.i18n.exists("tableSorting.pageOnly")).toBe(true);
    expect(screen.getByText(view.i18n.t("tableSorting.pageOnly"))).toBeTruthy();
    await sort();
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(screen.getByText(view.i18n.t("pagination.pageOf", { page: 2, total: 3 }))).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: view.i18n.t("buttons.next") }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    view.update({ page: 3, data: [{ name: "Zulu", id: "z" }, { name: "Delta", id: "d" }] });
    expect(names()).toEqual(["Delta", "Zulu"]);
  });

  it.each(["en", "ar"])("leaves manual rows to the parent and discloses placeholder results (%s)", async language => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    const view = await mount({ manualSorting: true, sorting: [], onSortingChange,
      page: 1, pageSize: 3, totalCount: 9, onPageChange: vi.fn() }, language);
    await sort();
    expect(applyRequest(onSortingChange, [])).toEqual(ascending);
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    view.update({ sorting: ascending, isFetching: true, isPlaceholderData: true });
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(header()?.hasAttribute("aria-sort")).toBe(false);
    expect(view.container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(view.i18n.exists("tableSorting.previousResults")).toBe(true);
    expect(screen.getByText(view.i18n.t("tableSorting.previousResults"))).toBeTruthy();
    expect(screen.queryByText(view.i18n.t("tableSorting.pageOnly"))).toBeNull();
    const suppliedOrder = [rows[2]!, rows[0]!, rows[1]!];
    view.update({ sorting: ascending, data: suppliedOrder, isFetching: false, isPlaceholderData: false });
    expect(names()).toEqual(["Bravo", "Charlie", "Alpha"]);
    expect(header()?.getAttribute("aria-sort")).toBe("ascending");
    expect(screen.queryByText(view.i18n.t("tableSorting.previousResults"))).toBeNull();
    expect(view.container.querySelector('[aria-busy="true"]')).toBeNull();
    view.update({ sorting: descending, data: suppliedOrder, isFetching: true, isPlaceholderData: false });
    expect(names()).toEqual(["Bravo", "Charlie", "Alpha"]);
    expect(header()?.getAttribute("aria-sort")).toBe("descending");
  });

  it("retains manual ownership when totalCount changes from unknown to known", async () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: `Row ${12 - i}`, id: String(i) }));
    const onPageChange = vi.fn();
    const view = await mount({ data, page: 2, pageSize: 12, totalCount: undefined, onPageChange,
      manualSorting: true, sorting: ascending, onSortingChange: vi.fn() });
    expect(names()).toHaveLength(12); // Caller-owned pages must never be sliced again.
    expect(screen.getByText(view.i18n.t("tableSorting.pageUnknownCount", { page: 2 }))).toBeTruthy();
    expect(screen.getByRole("button", { name: view.i18n.t("buttons.next") })).toHaveProperty("disabled", true);
    expect(names()[0]).toBe("Row 12");
    view.update({ totalCount: 36 });
    expect(names()).toEqual(data.map(row => row.name));
    await userEvent.click(screen.getByRole("button", { name: view.i18n.t("buttons.next") }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("reports aria-sort only on sortable leaves, never groups or nonsortable columns", async () => {
    const grouped: ColumnDef<Row>[] = [{
      id: "group", header: "Course group", accessorFn: row => row.name,
      columns: [{ accessorKey: "name", header: "Name leaf" }, { accessorKey: "id", header: "ID leaf", enableSorting: false }],
    }];
    const view = await mount({ columns: grouped, manualSorting: true, sorting: [{ id: "group", desc: true }, { id: "id", desc: true }, { id: "name", desc: false }], onSortingChange: vi.fn() });
    expect(screen.getByRole("columnheader", { name: "Course group" }).hasAttribute("aria-sort")).toBe(false);
    expect(screen.getByRole("columnheader", { name: "ID leaf" }).hasAttribute("aria-sort")).toBe(false);
    expect(screen.getByRole("columnheader", { name: "Name leaf" }).getAttribute("aria-sort")).toBe("ascending");
    view.update({ isPlaceholderData: true, isFetching: true });
    expect(view.container.querySelector("[aria-sort]")).toBeNull();
  });

  it("keeps pending status outside busy rows without fading readable content", async () => {
    const view = await mount({ isFetching: true });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(view.i18n.t("tableSorting.updatingResults"));
    expect(status.closest('[aria-busy="true"]')).toBeNull();
    expect(view.container.querySelector(".opacity-60")).toBeNull();
    for (const name of [view.i18n.t("buttons.next"), view.i18n.t("buttons.back")]) {
      expect(screen.getByRole("button", { name }).classList.contains("min-h-11")).toBe(true);
    }
  });

  it.each(["en", "ar"])("preserves initial loading, default empty, and custom empty states (%s)", async language => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    const view = await mount({ manualSorting: true, sorting: ascending, onSortingChange,
      isLoading: true, data: [] }, language);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(view.i18n.t("pagination.noResults"))).toBeNull();
    view.update({ isLoading: false });
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText(view.i18n.t("pagination.noResults"))).toBeTruthy();
    view.update({ isLoading: false, emptyState: <p>Custom empty fixture</p> });
    expect(screen.getByText("Custom empty fixture")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(onSortingChange).not.toHaveBeenCalled();
  });
});

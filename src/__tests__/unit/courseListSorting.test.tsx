import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseWithRelations } from "@/hooks/useCourses";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import { queryKeys } from "@/lib/queryKeys";

type Request = { table: string; operation: "select" | "update"; columns?: string; orders: Array<{ column: string; ascending: boolean }>; filters: Array<[string, unknown]>; range?: [number, number]; search?: string; patch?: { is_active: boolean } };
type Reply = { data: unknown; error: Error | null; count?: number };
const wire = vi.hoisted(() => ({ execute: vi.fn<(request: Request) => Promise<Reply>>(), audit: vi.fn() }));
vi.mock("@/lib/supabase", () => {
  class Builder implements PromiseLike<Reply> {
    private request: Request;
    constructor(table: string) { this.request = { table, operation: "select", orders: [], filters: [] }; }
    select(columns?: string) { this.request.columns = columns; return this; }
    order(column: string, options: { ascending: boolean }) { this.request.orders.push({ column, ...options }); return this; }
    range(from: number, to: number) { this.request.range = [from, to]; return this; }
    eq(key: string, value: unknown) { this.request.filters.push([key, value]); return this; }
    or(search: string) { this.request.search = search; return this; }
    update(patch: { is_active: boolean }) { this.request.operation = "update"; this.request.patch = patch; return this; }
    single() { return this.run(); }
    private run() { return wire.execute({ ...this.request, orders: [...this.request.orders], filters: [...this.request.filters] }); }
    then<T = Reply, E = never>(resolve?: ((value: Reply) => T | PromiseLike<T>) | null, reject?: ((reason: unknown) => E | PromiseLike<E>) | null): Promise<T | E> { return this.run().then(resolve, reject); }
  }
  return { supabase: { from: (table: string) => new Builder(table) } };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/lib/auditLogger", () => ({ logAuditEvent: wire.audit }));
vi.mock("@/hooks/usePrograms", () => ({ usePrograms: () => ({ data: { data: [{ id: "p1", name: "Program One" }, { id: "p2", name: "Program Two" }] } }) }));
import CourseListPage from "@/pages/admin/courses/CourseListPage";

let client: QueryClient;
let source: CourseWithRelations[];
const respond = async (request: Request): Promise<Reply> => {
  if (request.table !== "courses") throw new Error(`Unexpected table ${request.table}`);
  const filtered = source.filter((row) => request.filters.every(([key, value]) => key === "id" ? row.id === value : key === "program_id" ? row.program_id === value : key === "teacher_id" ? row.teacher_id === value : false))
    .filter((row) => !request.search || row.name.toLowerCase().includes(request.search.split("%")[1]?.toLowerCase() ?? ""));
  if (request.operation === "update") {
    const row = filtered[0]; if (!row) return { data: null, error: new Error("Missing fixture") };
    row.is_active = request.patch?.is_active ?? row.is_active;
    return { data: { ...row }, error: null };
  }
  // Fake server contract: apply full-source ordering BEFORE the bounded range.
  const ordered = [...filtered].sort((a, b) => {
    for (const order of request.orders) {
      const left = order.column === "name" ? a.name : order.column === "id" ? a.id : a.created_at;
      const right = order.column === "name" ? b.name : order.column === "id" ? b.id : b.created_at;
      const difference = left < right ? -1 : left > right ? 1 : 0;
      if (difference) return order.ascending ? difference : -difference;
    }
    return 0;
  });
  const [from, to] = request.range ?? [0, ordered.length - 1];
  return { data: ordered.slice(from, to + 1).map((row) => ({ ...row })), count: filtered.length, error: null };
};
const courseReads = () => wire.execute.mock.calls.map(([request]) => request).filter((request) => request.operation === "select");
const lastRead = () => courseReads()[courseReads().length - 1];
const nameOrders = (ascending: boolean) => [{ column: "name", ascending }, { column: "id", ascending: true }];
const firstCell = () => document.querySelector("tbody tr td")?.textContent;
const sortButton = () => screen.getByRole("button", { name: /name|الاسم/i });
const Destination = ({ kind }: { kind: "edit" | "enrollment" }) => {
  const { id } = useParams();
  return <div data-testid={`${kind}-destination`}>{id}</div>;
};
const mount = async (locale: "en" | "ar" = "en") => {
  const language = createInstance();
  await language.init({ lng: locale, fallbackLng: false, ns: ["common"], defaultNS: "common", resources: { en: { common: en }, ar: { common: ar } }, interpolation: { escapeValue: false }, react: { useSuspense: false } });
  return render(<QueryClientProvider client={client}><I18nextProvider i18n={language}><MemoryRouter initialEntries={["/admin/courses"]}><NuqsAdapter>
    <div dir={locale === "ar" ? "rtl" : "ltr"}><Routes>
      <Route path="/admin/courses" element={<CourseListPage />} />
      <Route path="/admin/courses/:id/edit" element={<Destination kind="edit" />} />
      <Route path="/admin/courses/:id/enrollment" element={<Destination kind="enrollment" />} />
    </Routes></div>
  </NuqsAdapter></MemoryRouter></I18nextProvider></QueryClientProvider>);
};
const ready = async () => { await waitFor(() => expect(firstCell()).toBeTruthy()); };

beforeEach(() => {
  // The real Nuqs React Router adapter reads/writes window.location for shallow
  // updates, not only MemoryRouter entries. Reset that browser state per case.
  window.history.replaceState(null, "", "/admin/courses");
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  source = Array.from({ length: 60 }, (_, index) => ({
    id: `course-${String(index).padStart(2, "0")}`, name: `Course ${String(index).padStart(2, "0")}`, code: `C${index}`,
    program_id: index % 2 ? "p2" : "p1", semester: "Term", semester_id: null, teacher_id: "teacher-1", academic_year: "2026",
    is_active: true, created_at: new Date(Date.UTC(2026, 0, 1) + index * 86_400_000).toISOString(), programs: { name: "Program" }, teacher: { full_name: "Teacher" },
  }));
  wire.execute.mockReset().mockImplementation(respond); wire.audit.mockReset().mockResolvedValue(undefined);
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("Unexpected network in course-list tests"); });
});
afterEach(() => { cleanup(); client.clear(); expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); });

describe("actual course list server sorting", () => {
  it("Name requests whole-result server ordering instead of merely sorting the loaded page", async () => {
    await mount(); await ready(); expect(firstCell()).toBe("Course 59");
    fireEvent.click(sortButton());
    await waitFor(() => expect(lastRead()?.orders).toEqual(nameOrders(true)));
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    expect(lastRead()?.range).toEqual([0, 24]);
  });

  it("resets a later page atomically to page one on sort, then retains sorting on pagination", async () => {
    await mount(); await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(firstCell()).toBe("Course 34"));
    const priorCalls = courseReads().length;
    fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    expect(courseReads().slice(priorCalls)).toHaveLength(1);
    expect(lastRead()).toMatchObject({ orders: nameOrders(true), range: [0, 24] });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(firstCell()).toBe("Course 25"));
    expect(lastRead()).toMatchObject({ orders: nameOrders(true), range: [25, 49] });
    fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 59"));
    expect(lastRead()).toMatchObject({ orders: nameOrders(false), range: [0, 24] });
  });

  it("shows previous rows as pending without falsely publishing the requested aria-sort", async () => {
    await mount(); await ready();
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    wire.execute.mockImplementation(async (request) => { if (request.orders[0]?.column === "name") await gate; return respond(request); });
    fireEvent.click(sortButton());
    try {
      await waitFor(() => expect(lastRead()?.orders).toEqual(nameOrders(true)));
      expect(firstCell()).toBe("Course 59");
      expect(sortButton().closest("th")?.getAttribute("aria-sort")).toBeNull();
      expect(screen.getByText(en.tableSorting.previousResults)).toBeDefined();
      expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    } finally { await act(async () => { release(); await gate; }); }
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    expect(sortButton().closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    expect(screen.queryByText(en.tableSorting.previousResults)).toBeNull();
  });

  it.each(["returned", "thrown"] as const)("shows retry rather than a sorted empty success after a %s request failure", async (failure) => {
    await mount(); await ready();
    wire.execute.mockImplementation(async (request) => {
      if (request.orders[0]?.column === "name") {
        if (failure === "thrown") throw new Error("offline");
        return { data: null, error: new Error("denied") };
      }
      return respond(request);
    });
    fireEvent.click(sortButton());
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.queryByText(en.pagination.noResults)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    wire.execute.mockImplementation(respond);
    fireEvent.click(screen.getByRole("button", { name: en.courseListSorting.retry }));
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    expect(sortButton().closest("th")?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("ignores an older sort result after a newer requested direction has settled", async () => {
    await mount(); await ready();
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    wire.execute.mockImplementation(async (request) => { if (request.orders[0]?.column === "name" && request.orders[0].ascending) await gate; return respond(request); });
    fireEvent.click(sortButton());
    await waitFor(() => expect(lastRead()?.orders).toEqual(nameOrders(true)));
    fireEvent.click(sortButton());
    try {
      await waitFor(() => expect(lastRead()?.orders).toEqual(nameOrders(false)));
      await waitFor(() => expect(sortButton().closest("th")?.getAttribute("aria-sort")).toBe("descending"));
    } finally { await act(async () => { release(); await gate; }); }
    expect(firstCell()).toBe("Course 59");
    expect(sortButton().closest("th")?.getAttribute("aria-sort")).toBe("descending");
  });

  it("retains Name order while search resets the current page", async () => {
    await mount(); await ready(); fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(firstCell()).toBe("Course 25"));
    fireEvent.change(screen.getByPlaceholderText("Search by name or code..."), { target: { value: "Course 05" } });
    await waitFor(() => expect(firstCell()).toBe("Course 05"));
    expect(lastRead()).toMatchObject({ orders: nameOrders(true), range: [0, 24] });
    expect(lastRead()?.search).toBe("name.ilike.%Course 05%,code.ilike.%Course 05%");
  });

  it("retains Name order while a program filter resets the page and preserves its restriction", async () => {
    await mount(); await ready(); fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(firstCell()).toBe("Course 25"));
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Program One" }));
    await waitFor(() => expect(lastRead()?.filters).toContainEqual(["program_id", "p1"]));
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    expect(lastRead()).toMatchObject({ orders: nameOrders(true), range: [0, 24] });
  });

  it.each(["edit", "enrollment"] as const)("preserves the sorted row's %s route and actual id", async (destination) => {
    await mount(); await ready(); fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    const row = screen.getAllByRole("row")[1]; if (!row) throw new Error("Missing row");
    await userEvent.click(within(row).getByRole("button", { name: "Open menu" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: destination === "edit" ? "Edit" : "Manage Enrollment" }));
    expect(screen.getByTestId(`${destination}-destination`).textContent).toBe("course-00");
    expect(wire.execute.mock.calls.filter(([request]) => request.operation === "update")).toHaveLength(0);
  });

  it("keeps an open row action bound to its course id through a server reorder", async () => {
    await mount(); await ready(); fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    const row = screen.getAllByRole("row")[1]; if (!row) throw new Error("Missing row");
    await userEvent.click(within(row).getByRole("button", { name: "Open menu" }));
    await screen.findByRole("menu");
    const moved = source.find((course) => course.id === "course-00"); if (!moved) throw new Error("Missing course");
    moved.name = "Course 10x";
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.courses.lists() }); });
    await waitFor(() => expect(firstCell()).toBe("Course 01"));
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("edit-destination").textContent).toBe("course-00");
  });

  it("disposes an old page's open row action rather than rebinding it to the new page", async () => {
    await mount(); await ready(); fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    wire.execute.mockImplementation(async (request) => { if (request.range?.[0] === 25) await gate; return respond(request); });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastRead()?.range).toEqual([25, 49]));
    try {
      const row = screen.getAllByRole("row")[1]; if (!row) throw new Error("Missing previous row");
      await userEvent.click(within(row).getByRole("button", { name: "Open menu" }));
      await screen.findByRole("menu");
    } finally { await act(async () => { release(); await gate; }); }
    await waitFor(() => expect(firstCell()).toBe("Course 25"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("preserves the existing deactivate payload/audit for the selected sorted row", async () => {
    await mount(); await ready(); fireEvent.click(sortButton());
    await waitFor(() => expect(firstCell()).toBe("Course 00"));
    const row = screen.getAllByRole("row")[1]; if (!row) throw new Error("Missing row");
    await userEvent.click(within(row).getByRole("button", { name: "Open menu" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Deactivate" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Course 00");
    await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(wire.audit).toHaveBeenCalled());
    expect(wire.execute.mock.calls.find(([request]) => request.operation === "update")?.[0]).toMatchObject({ table: "courses", patch: { is_active: false }, filters: [["id", "course-00"]] });
    expect(wire.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "soft_delete", entity_id: "course-00", changes: { is_active: false }, performed_by: "admin-1" }));
  });

  it("distinguishes initial read failure/retry from a genuinely empty successful result", async () => {
    wire.execute.mockResolvedValueOnce({ data: null, error: new Error("initial failure") });
    await mount();
    await screen.findByRole("alert");
    expect(screen.queryByText(en.pagination.noResults)).toBeNull();
    source = [];
    fireEvent.click(screen.getByRole("button", { name: en.courseListSorting.retry }));
    await screen.findByText(en.pagination.noResults);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["en", "ar"] as const)("exposes localized controlled Name sorting in %s", async (locale) => {
    await mount(locale); await ready();
    fireEvent.click(sortButton()); await waitFor(() => expect(firstCell()).toBe("Course 00"));
    expect(sortButton().closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    const copy = locale === "en" ? en : ar;
    expect(sortButton().textContent).toContain(copy.courseListSorting.name);
    expect(screen.queryByText(copy.tableSorting.pageOnly)).toBeNull();
  });
});

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
  type TableOptions,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Shimmer } from "@/design-system";
import type { ReactNode } from "react";

type SortingControl =
  | { sorting?: undefined; onSortingChange?: undefined; manualSorting?: false }
  | {
      sorting: SortingState;
      onSortingChange: OnChangeFn<SortingState>;
      manualSorting?: boolean;
    };

type DataTableProps<TData, TValue> = SortingControl & {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  /**
   * True while a background refetch is in flight (e.g. a page/filter change with
   * `placeholderData: keepPreviousData`). The previous rows stay visible but are
   * marked `aria-busy` so the pending state is perceivable without a
   * skeleton flash (dashboard-and-ux-performance Req 5.1). Distinct from
   * `isLoading`, which is the first-load skeleton.
   */
  isFetching?: boolean;
  /** Supplied rows still belong to the preceding page/filter/sort request. */
  isPlaceholderData?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  /** Opt-in stable identity for stateful cells across sorting/paging. */
  getRowId?: TableOptions<TData>["getRowId"];
  onPageChange?: (page: number) => void;
  emptyState?: ReactNode;
};

function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  isFetching = false,
  isPlaceholderData = false,
  sorting: controlledSorting,
  onSortingChange,
  manualSorting = false,
  page,
  pageSize,
  totalCount,
  getRowId,
  onPageChange,
  emptyState,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation("common");
  const descriptionId = useId();
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const sorting = controlledSorting ?? internalSorting;

  const isServerPaginated = page !== undefined && onPageChange !== undefined;
  const totalPages =
    isServerPaginated &&
    totalCount !== undefined &&
    Number.isFinite(totalCount) &&
    totalCount >= 0
      ? Math.max(1, Math.ceil(totalCount / (pageSize ?? 25)))
      : undefined;
  const pageOnlySorting =
    page !== undefined && onPageChange !== undefined && !manualSorting;
  const descriptions =
    [
      pageOnlySorting ? `${descriptionId}-page-only` : undefined,
      isPlaceholderData || isFetching
        ? `${descriptionId}-previous-results`
        : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const table = useReactTable({
    data,
    columns,
    getRowId,
    manualPagination: isServerPaginated,
    state: { sorting },
    onSortingChange: onSortingChange ?? setInternalSorting,
    manualSorting,
    getCoreRowModel: getCoreRowModel(),
    ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
    ...(isServerPaginated
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  // Show empty state if no data and emptyState is provided
  if (data.length === 0 && emptyState) {
    return emptyState;
  }

  return (
    <>
      {(isPlaceholderData || isFetching) && (
        <p
          id={`${descriptionId}-previous-results`}
          role="status"
          className="mb-3 text-sm text-muted-foreground [overflow-wrap:anywhere]"
        >
          {t(
            isPlaceholderData
              ? "tableSorting.previousResults"
              : "tableSorting.updatingResults"
          )}
        </p>
      )}
      <div
        className="space-y-4"
        aria-busy={isFetching || isPlaceholderData || undefined}
      >
        {pageOnlySorting && (
          <p
            id={`${descriptionId}-page-only`}
            className="text-sm text-muted-foreground [overflow-wrap:anywhere]"
          >
            {t("tableSorting.pageOnly")}
          </p>
        )}
        <div className="rounded-lg border bg-background">
          <Table aria-describedby={descriptions}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        header.isPlaceholder ||
                        header.subHeaders.length > 0 ||
                        !header.column.getCanSort() ||
                        isPlaceholderData
                          ? undefined
                          : header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("pagination.noResults", "No results found.")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {isServerPaginated ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {totalPages === undefined
                ? t("tableSorting.pageUnknownCount", { page })
                : t("pagination.pageOf", { page, total: totalPages })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-auto min-h-11 min-w-11 whitespace-normal px-3 py-2"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                {t("buttons.back", "Previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-auto min-h-11 min-w-11 whitespace-normal px-3 py-2"
                onClick={() => onPageChange(page + 1)}
                disabled={totalPages === undefined || page >= totalPages}
              >
                {t("buttons.next", "Next")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("pagination.pageOf", {
                page: table.getState().pagination.pageIndex + 1,
                total: table.getPageCount() || 1,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-auto min-h-11 min-w-11 whitespace-normal px-3 py-2"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {t("buttons.back", "Previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-auto min-h-11 min-w-11 whitespace-normal px-3 py-2"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {t("buttons.next", "Next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export { DataTable, ArrowUpDown };

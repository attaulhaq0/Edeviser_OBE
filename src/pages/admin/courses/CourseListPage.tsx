import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { courseNameSortFromState } from "@/lib/courseListSorting";
import { StatePanel } from "@/design-system/patterns";
import { useNavigate } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { createColumns } from "./columns";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCourses, useSoftDeleteCourse } from "@/hooks/useCourses";
import { usePrograms } from "@/hooks/usePrograms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import type { Course } from "@/types/app";

const CourseListPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [programFilter, setProgramFilter] = useQueryState(
    "program",
    parseAsString.withDefault("")
  );
  const [courseToDeactivate, setCourseToDeactivate] = useState<Course | null>(
    null
  );
  const [{ page, sorting }, setListing] = useState<{
    page: number;
    sorting: SortingState;
  }>({ page: 1, sorting: [] });
  const setPage = (nextPage: number) =>
    setListing((previous) => ({ ...previous, page: nextPage }));
  const onSortingChange: OnChangeFn<SortingState> = (update) => {
    setListing((previous) => {
      const nextSorting =
        typeof update === "function" ? update(previous.sorting) : update;
      courseNameSortFromState(nextSorting); // reject unsupported/multi-column state
      return { page: 1, sorting: nextSorting };
    });
  };
  const nameSort = courseNameSortFromState(sorting);

  const {
    data: paginatedCourses,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    refetch,
  } = useCourses({
    search: search || undefined,
    programId: programFilter || undefined,
    page,
    ...(nameSort ? { nameSort } : {}),
  });

  const { data: paginatedPrograms } = usePrograms();
  const programs = paginatedPrograms?.data ?? [];
  const softDeleteMutation = useSoftDeleteCourse();

  // Stable cell component types preserve a course's open action state while
  // getRowId keeps that state attached to the same course through reordering.
  const columns = useMemo(
    () =>
      createColumns(
        (course) => navigate(`/admin/courses/${course.id}/edit`),
        (course) => setCourseToDeactivate(course),
        (course) => navigate(`/admin/courses/${course.id}/enrollment`),
        {
          name: t("courseListSorting.name"),
          sortName: t("courseListSorting.sortName"),
        }
      ),
    [navigate, t]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <Button
          variant="tactile"
          onClick={() => navigate("/admin/courses/new")}
        >
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value || null);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <Select
          value={programFilter || "__all__"}
          onValueChange={(value) => {
            setProgramFilter(value === "__all__" ? null : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {isError ? (
        <StatePanel
          variant="error"
          message={t("courseListSorting.loadError")}
          action={
            <Button
              variant="outline"
              className="h-auto min-h-11 whitespace-normal"
              disabled={isFetching}
              onClick={() => {
                void refetch();
              }}
            >
              {t("courseListSorting.retry")}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={paginatedCourses?.data ?? []}
          isLoading={isLoading}
          isFetching={isFetching}
          isPlaceholderData={isPlaceholderData}
          sorting={sorting}
          onSortingChange={onSortingChange}
          manualSorting
          getRowId={(course) => course.id}
          page={page}
          pageSize={paginatedCourses?.pageSize}
          totalCount={paginatedCourses?.count}
          onPageChange={setPage}
        />
      )}

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!courseToDeactivate}
        onOpenChange={() => setCourseToDeactivate(null)}
        title="Deactivate Course"
        description={`Are you sure you want to deactivate "${courseToDeactivate?.name}"? Students will no longer be able to submit assignments for this course.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={softDeleteMutation.isPending}
        onConfirm={() => {
          if (!courseToDeactivate) return;
          softDeleteMutation.mutate(courseToDeactivate.id, {
            onSuccess: () => {
              toast.success(`${courseToDeactivate.name} has been deactivated`);
              setCourseToDeactivate(null);
            },
            onError: (err) => {
              toast.error(err.message);
            },
          });
        }}
      />
    </div>
  );
};

export default CourseListPage;

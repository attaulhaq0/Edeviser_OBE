import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { parseAsString, useQueryState } from "nuqs";
import { createColumns } from "./columns";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  useCLOReviewCounts,
  useCLOs,
  useDeleteCLO,
  useSetCLOReviewStatus,
} from "@/hooks/useCLOs";
import { useTeacherCourses } from "@/hooks/useCourses";
import { readinessFromCounts } from "@/lib/curriculumReadiness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Plus, Search } from "lucide-react";
import type { LearningOutcome } from "@/types/app";
import { NoCourses } from "@/components/shared/EmptyState";

const CLOListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [courseFilter, setCourseFilter] = useQueryState(
    "course",
    parseAsString.withDefault("")
  );
  const [cloToDelete, setCloToDelete] = useState<LearningOutcome | null>(null);
  const [page, setPage] = useState(1);

  const { data: paginatedCourses, isLoading: coursesLoading } =
    useTeacherCourses();
  const courses = paginatedCourses?.data;
  const {
    data: paginatedCLOs,
    isLoading,
    isFetching,
  } = useCLOs(courseFilter || undefined, { page });
  const deleteMutation = useDeleteCLO();
  const setReviewStatus = useSetCLOReviewStatus();
  const { data: reviewCounts } = useCLOReviewCounts(courseFilter || undefined);
  const readiness = reviewCounts
    ? readinessFromCounts(
        reviewCounts.confirmed,
        reviewCounts.inReview,
        reviewCounts.total
      )
    : null;

  const filteredCLOs = (paginatedCLOs?.data ?? []).filter((clo) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      clo.title.toLowerCase().includes(q) ||
      (clo.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const columns = createColumns(
    (id) => navigate(`/teacher/clos/${id}`),
    (id) => navigate(`/teacher/clos/${id}/edit`),
    (clo) => setCloToDelete(clo),
    (clo, status) => {
      setReviewStatus.mutate(
        { cloId: clo.id, status },
        {
          onSuccess: () =>
            toast.success(
              status === "confirmed"
                ? "CLO confirmed"
                : status === "in_review"
                ? "CLO submitted for review"
                : "CLO reopened as draft"
            ),
          onError: (err) => toast.error(err.message),
        }
      );
    }
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Course Learning Outcomes
        </h1>
        <Button variant="tactile" onClick={() => navigate("/teacher/clos/new")}>
          <Plus className="h-4 w-4" /> Add CLO
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search CLOs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select
          value={courseFilter}
          onValueChange={(val) => {
            setCourseFilter(val === "all" ? "" : val);
            setPage(1);
          }}
          disabled={coursesLoading}
        >
          <SelectTrigger className="w-[260px] bg-white">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Curriculum readiness (E2.B) — shown when a course is selected */}
      {readiness && readiness.total > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xs">
          <span className="text-sm font-medium text-gray-700">
            Curriculum readiness: {readiness.confirmed} of {readiness.total}{" "}
            CLOs confirmed
          </span>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${readiness.percent}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{readiness.percent}%</span>
          {readiness.ready && (
            <Badge className="gap-1 bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3" /> Curriculum ready
            </Badge>
          )}
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredCLOs}
        isLoading={isLoading}
        isFetching={isFetching}
        page={page}
        pageSize={paginatedCLOs?.pageSize}
        totalCount={paginatedCLOs?.count}
        onPageChange={setPage}
        emptyState={
          filteredCLOs.length === 0 && !isLoading ? <NoCourses /> : undefined
        }
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!cloToDelete}
        onOpenChange={() => setCloToDelete(null)}
        title="Delete CLO"
        description={`Are you sure you want to delete "${cloToDelete?.title}"? This action cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!cloToDelete) return;
          deleteMutation.mutate(cloToDelete.id, {
            onSuccess: () => {
              toast.success(`"${cloToDelete.title}" has been deleted`);
              setCloToDelete(null);
            },
            onError: (err) => {
              toast.error(err.message);
              setCloToDelete(null);
            },
          });
        }}
      />
    </div>
  );
};

export default CLOListPage;

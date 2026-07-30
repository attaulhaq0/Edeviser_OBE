import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useCourseSections } from "@/hooks/useCourseSections";
import { gradingQueueColumns } from "./gradingQueueColumns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoCourses, NoSubmissions } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";

const GradingQueuePage = () => {
  const { user } = useAuth();
  const [courseId, setCourseId] = useQueryState(
    "course",
    parseAsString.withDefault("")
  );
  const [assignmentId, setAssignmentId] = useQueryState(
    "assignment",
    parseAsString.withDefault("")
  );
  const [sectionId, setSectionId] = useQueryState(
    "section",
    parseAsString.withDefault("")
  );
  const [page, setPage] = useState(1);

  const { data: paginatedCourses } = useCourses({
    teacherId: user?.id,
    pageSize: 100,
  });
  const courses = paginatedCourses?.data;
  const { data: paginatedAssignments } = useAssignments(courseId || undefined);
  const { data: sections } = useCourseSections(courseId || undefined);
  const {
    data: paginatedSubmissions,
    isLoading,
    isFetching,
  } = useSubmissions({
    courseId: courseId || undefined,
    courseIds: courseId
      ? undefined
      : (courses ?? []).map((course) => course.id),
    assignmentId: assignmentId || undefined,
    sectionId: sectionId || undefined,
    pendingOnly: true,
    page,
  });

  const assignments = paginatedAssignments?.data;
  const submissions = paginatedSubmissions?.data ?? [];

  const handleCourseChange = (value: string) => {
    setCourseId(value === "all" ? "" : value);
    setAssignmentId("");
    setSectionId("");
    setPage(1);
  };

  const handleAssignmentChange = (value: string) => {
    setAssignmentId(value === "all" ? "" : value);
    setPage(1);
  };

  const handleSectionChange = (value: string) => {
    setSectionId(value === "all" ? "" : value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <h1 className="text-2xl font-bold tracking-tight">Grading Queue</h1>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={courseId || "all"} onValueChange={handleCourseChange}>
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={assignmentId || "all"}
          onValueChange={handleAssignmentChange}
          disabled={!courseId}
        >
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Assignments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            {assignments?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sectionId || "all"}
          onValueChange={handleSectionChange}
          disabled={!courseId}
        >
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Section {s.section_code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={gradingQueueColumns}
        data={submissions}
        isLoading={isLoading}
        isFetching={isFetching}
        page={page}
        pageSize={paginatedSubmissions?.pageSize}
        totalCount={paginatedSubmissions?.count}
        onPageChange={setPage}
        emptyState={
          submissions.length === 0 && !isLoading ? (
            courses?.length ? (
              <NoSubmissions />
            ) : (
              <NoCourses />
            )
          ) : undefined
        }
      />
    </div>
  );
};

export default GradingQueuePage;

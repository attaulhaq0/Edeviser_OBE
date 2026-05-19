// =============================================================================
// GradebookView — Students × assessments matrix with weighted grades
// =============================================================================

import { useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useGradebookMatrix, useGradeCategories } from "@/hooks/useGradebook";
import { useInstitutionSettings } from "@/hooks/useInstitutionSettings";
import { useCourses } from "@/hooks/useCourses";
import { useCourseSections } from "@/hooks/useCourseSections";
import { mapToLetterGrade } from "@/lib/letterGradeMapper";
import type { GradeScale } from "@/types/app";
import { DEFAULT_GRADE_SCALES } from "@/types/app";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import GradeCategoryManager from "@/pages/teacher/gradebook/GradeCategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoStudents } from "@/components/shared/EmptyState";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGradeColor(percent: number): string {
  if (percent >= 85) return "text-green-600";
  if (percent >= 70) return "text-blue-600";
  if (percent >= 50) return "text-yellow-600";
  return "text-red-600";
}

function getCellBg(score: number | null, maxScore: number): string {
  if (score === null) return "bg-gray-50 text-gray-400";
  const pct = (score / maxScore) * 100;
  if (pct >= 85) return "bg-green-50 text-green-700";
  if (pct >= 70) return "bg-blue-50 text-blue-700";
  if (pct >= 50) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}

// ─── Component ──────────────────────────────────────────────────────────────

const GradebookView = () => {
  const [courseId, setCourseId] = useQueryState(
    "course",
    parseAsString.withDefault("")
  );
  const [sectionId, setSectionId] = useQueryState(
    "section",
    parseAsString.withDefault("")
  );

  const { data: coursesResult, isLoading: coursesLoading } = useCourses();
  const courses = coursesResult?.data ?? [];
  const { data: sections = [] } = useCourseSections(courseId || undefined);
  const { data: categories = [] } = useGradeCategories(courseId || undefined);
  const { data: gradebookData = [], isLoading: gradebookLoading } =
    useGradebookMatrix(courseId || undefined, sectionId || undefined);
  const { data: settings } = useInstitutionSettings();

  const gradeScales: GradeScale[] =
    settings?.grade_scales ?? DEFAULT_GRADE_SCALES;

  // Resolve letter grades using institution grade scales
  const enrichedData = useMemo(
    () =>
      gradebookData.map((entry) => ({
        ...entry,
        letter_grade: mapToLetterGrade(entry.final_weighted_grade, gradeScales),
      })),
    [gradebookData, gradeScales]
  );

  const totalWeight = categories.reduce((sum, c) => sum + c.weight_percent, 0);
  const isBalanced = totalWeight === 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gradebook</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={courseId}
          onValueChange={(v) => {
            setCourseId(v);
            setSectionId("");
          }}
        >
          <SelectTrigger className="w-[260px] bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {sections.length > 0 && (
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Section {s.section_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!courseId ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a course to view the gradebook.
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="matrix">
          <TabsList className="gap-2 rounded-xl">
            <TabsTrigger
              value="matrix"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <BookOpen className="h-4 w-4 me-1" /> Gradebook
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4 me-1" /> Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="mt-4">
            {!isBalanced && categories.length > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                <Settings className="h-4 w-4" />
                Category weights don&apos;t sum to 100% ({totalWeight}%).
                Configure categories first.
              </div>
            )}

            {coursesLoading || gradebookLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : enrichedData.length === 0 ? (
              <NoStudents />
            ) : (
              <GradebookTable data={enrichedData} categories={categories} />
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <GradeCategoryManager courseId={courseId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// ─── GradebookTable ─────────────────────────────────────────────────────────

interface GradebookTableProps {
  data: Array<{
    student_id: string;
    student_name: string;
    categories: Array<{
      category_id: string;
      category_name: string;
      weight_percent: number;
      assessments: Array<{
        id: string;
        title: string;
        score: number | null;
        max_score: number;
      }>;
      subtotal_percent: number;
    }>;
    final_weighted_grade: number;
    letter_grade: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    weight_percent: number;
  }>;
}

const GradebookTable = ({ data, categories }: GradebookTableProps) => {
  const firstRow = data[0] as (typeof data)[number] | undefined;

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-md">
      <table className="w-full text-sm">
        <thead>
          {/* Category header row */}
          <tr className="bg-slate-50 border-b border-slate-200">
            <th
              rowSpan={2}
              className="sticky start-0 bg-slate-50 px-4 py-2 text-start font-medium text-gray-600 z-10 min-w-[160px]"
            >
              Student
            </th>
            {categories.map((cat) => {
              const colCount = firstRow
                ? (firstRow.categories.find((c) => c.category_id === cat.id)
                    ?.assessments.length ?? 0) + 1
                : 1;
              return (
                <th
                  key={cat.id}
                  colSpan={colCount}
                  className="px-2 py-2 text-center font-bold text-gray-700 border-s border-slate-200"
                >
                  {cat.name}
                  <Badge variant="secondary" className="ms-1 text-[10px]">
                    {cat.weight_percent}%
                  </Badge>
                </th>
              );
            })}
            <th
              rowSpan={2}
              className="px-3 py-2 text-center font-bold text-gray-700 border-s border-slate-200 min-w-[80px]"
            >
              Final %
            </th>
            <th
              rowSpan={2}
              className="px-3 py-2 text-center font-bold text-gray-700 border-s border-slate-200 min-w-[60px]"
            >
              Grade
            </th>
          </tr>
          {/* Assessment header row */}
          <tr className="bg-slate-50">
            {categories.map((cat) => {
              const catData = firstRow
                ? firstRow.categories.find((c) => c.category_id === cat.id)
                : undefined;
              const assessments = catData?.assessments ?? [];
              return [
                ...assessments.map((a) => (
                  <th
                    key={a.id}
                    className="px-2 py-1 text-center font-medium text-gray-500 whitespace-nowrap border-s border-slate-100"
                  >
                    <div
                      className="truncate max-w-[90px] text-xs"
                      title={a.title}
                    >
                      {a.title}
                    </div>
                    <div className="text-[10px] text-gray-400 font-normal">
                      /{a.max_score}
                    </div>
                  </th>
                )),
                <th
                  key={`${cat.id}-subtotal`}
                  className="px-2 py-1 text-center font-bold text-gray-600 whitespace-nowrap border-s border-slate-200 bg-slate-100"
                >
                  <div className="text-xs">Subtotal</div>
                </th>,
              ];
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((student) => (
            <tr
              key={student.student_id}
              className="border-t border-slate-100 hover:bg-slate-50/50"
            >
              <td className="sticky start-0 bg-white px-4 py-2 font-medium truncate max-w-[160px] z-10">
                {student.student_name}
              </td>
              {student.categories.map((cat) => [
                ...cat.assessments.map((a) => (
                  <td
                    key={a.id}
                    className={cn(
                      "px-2 py-2 text-center font-medium tabular-nums border-s border-slate-100",
                      getCellBg(a.score, a.max_score)
                    )}
                  >
                    {a.score !== null ? a.score : "—"}
                  </td>
                )),
                <td
                  key={`${cat.category_id}-sub`}
                  className="px-2 py-2 text-center font-bold tabular-nums border-s border-slate-200 bg-slate-50"
                >
                  <span className={getGradeColor(cat.subtotal_percent)}>
                    {cat.subtotal_percent.toFixed(1)}%
                  </span>
                </td>,
              ])}
              <td className="px-3 py-2 text-center font-bold tabular-nums border-s border-slate-200">
                <span className={getGradeColor(student.final_weighted_grade)}>
                  {student.final_weighted_grade.toFixed(1)}%
                </span>
              </td>
              <td className="px-3 py-2 text-center border-s border-slate-200">
                <Badge
                  className={cn(
                    "text-xs font-bold",
                    student.final_weighted_grade >= 85
                      ? "bg-green-50 text-green-600 border-green-200"
                      : student.final_weighted_grade >= 70
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : student.final_weighted_grade >= 50
                      ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  )}
                  variant="outline"
                >
                  {student.letter_grade}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GradebookView;

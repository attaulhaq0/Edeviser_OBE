import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import { useCourses } from "@/hooks/useCourses";
import { useSemesters } from "@/hooks/useSemesters";
import { useGenerateCourseFile } from "@/hooks/useCourseFile";
import { toast } from "sonner";
import { FileText, Download, Loader2, CheckCircle2 } from "lucide-react";

// ─── Course File Generator Page ─────────────────────────────────────────────

const CourseFileGenerator = () => {
  const { data: coursesResult, isLoading: coursesLoading } = useCourses({
    pageSize: 200,
  });
  const { data: semesters, isLoading: semestersLoading } = useSemesters();
  const generateMutation = useGenerateCourseFile();

  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [lastResult, setLastResult] = useState<{
    download_url: string;
    course_name: string;
    course_code: string;
    semester: string;
    generated_at: string;
  } | null>(null);

  const courses = coursesResult?.data ?? [];
  const isLoading = coursesLoading || semestersLoading;

  const handleGenerate = () => {
    if (!courseId) {
      toast.error("Please select a course");
      return;
    }
    if (!semesterId) {
      toast.error("Please select a semester");
      return;
    }

    setLastResult(null);

    generateMutation.mutate(
      { course_id: courseId, semester_id: semesterId },
      {
        onSuccess: (result) => {
          setLastResult({
            download_url: result.download_url,
            course_name: result.course_name,
            course_code: result.course_code,
            semester: result.semester,
            generated_at: result.generated_at,
          });
          toast.success("Course file generated successfully");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Course file generation failed"
          );
        },
      }
    );
  };

  const handleDownload = () => {
    if (lastResult?.download_url) {
      window.open(lastResult.download_url, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Course File Generator
        </h1>
      </div>

      {/* Configuration Card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <FileText className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Generate Course File
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Course Selector */}
              <div className="space-y-2">
                <Label htmlFor="course-select">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="course-select" className="bg-white">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                    {courses.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No courses available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Semester Selector */}
              <div className="space-y-2">
                <Label htmlFor="semester-select">Semester</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger id="semester-select" className="bg-white">
                    <SelectValue placeholder="Select a semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {(semesters ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    {(!semesters || semesters.length === 0) && (
                      <SelectItem value="__none" disabled>
                        No semesters available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={
                  generateMutation.isPending || !courseId || !semesterId
                }
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {generateMutation.isPending
                  ? "Generating..."
                  : "Generate Course File"}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Result Card */}
      {lastResult && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <CheckCircle2 className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Course File Ready
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Course
                </p>
                <p className="font-semibold mt-1">
                  {lastResult.course_code} — {lastResult.course_name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Semester
                </p>
                <p className="font-semibold mt-1">{lastResult.semester}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Generated
                </p>
                <p className="font-semibold mt-1">
                  {lastResult.generated_at.slice(0, 10)}
                </p>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CourseFileGenerator;

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Plus, BookOpen, Calendar } from "lucide-react";
import { format } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Shimmer from "@/components/shared/Shimmer";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import {
  useJournalEntries,
  useCreateJournalEntry,
} from "@/hooks/useJournal";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

const useEnrolledCourseOptions = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, view: "journal" }),
    queryFn: async (): Promise<CourseOption[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("student_courses")
        .select("course_id, courses!inner(id, name, code)")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const c = row.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        return c;
      });
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

const StudentJournalPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id;

  const [isCreating, setIsCreating] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [content, setContent] = useState("");

  const { data: entries, isLoading: entriesLoading } = useJournalEntries();
  const { data: courses } = useEnrolledCourseOptions(studentId);
  const createEntry = useCreateJournalEntry();

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const courseLookup = new Map((courses ?? []).map((c) => [c.id, c]));

  const handleSubmit = async () => {
    if (!selectedCourse || content.trim().length === 0) return;
    try {
      await createEntry.mutateAsync({
        course_id: selectedCourse,
        content: content.trim(),
      });
      toast.success(t("journal.created", "Journal entry saved"));
      setContent("");
      setSelectedCourse("");
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save entry";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("journal.title", "Learning Journal")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              "journal.subtitle",
              "Reflect on what you've learned. Earn 20 XP per entry of 50+ words."
            )}
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95">
              <Plus className="h-4 w-4 me-2" />
              {t("journal.newEntry", "New Entry")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("journal.dialog.title", "New Journal Entry")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "journal.dialog.description",
                  "Reflect on a recent class, assignment, or concept."
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">
                  {t("journal.dialog.course", "Course")}
                </Label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                >
                  <SelectTrigger id="course">
                    <SelectValue
                      placeholder={t(
                        "journal.dialog.selectCourse",
                        "Select a course"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(courses ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">
                  {t("journal.dialog.content", "Reflection")}
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder={t(
                    "journal.dialog.placeholder",
                    "What did you learn? What was challenging? What questions do you have?"
                  )}
                />
                <p className="text-xs text-gray-500">
                  {wordCount}{" "}
                  {t("journal.dialog.words", "words")}
                  {wordCount >= 50 && (
                    <span className="ms-2 text-green-600 font-semibold">
                      ✓ {t("journal.dialog.xpEarned", "+20 XP eligible")}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                disabled={createEntry.isPending}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !selectedCourse ||
                  content.trim().length === 0 ||
                  createEntry.isPending
                }
                className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
              >
                {createEntry.isPending
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {entriesLoading ? (
        <div className="space-y-3">
          <Shimmer className="h-32 rounded-xl" />
          <Shimmer className="h-32 rounded-xl" />
        </div>
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon={<PenLine className="h-12 w-12 text-gray-400" />}
          title={t("journal.empty.title", "No journal entries yet")}
          description={t(
            "journal.empty.description",
            "Start your learning journal — reflect on a class or concept and earn XP."
          )}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const course = courseLookup.get(entry.course_id);
            return (
              <Card
                key={entry.id}
                className="bg-white border-0 shadow-md rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {course ? (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        <BookOpen className="h-3 w-3 me-1" />
                        {course.code}
                      </Badge>
                    ) : null}
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 me-1" />
                      {format(new Date(entry.created_at), "PPP")}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {entry.content}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentJournalPage;

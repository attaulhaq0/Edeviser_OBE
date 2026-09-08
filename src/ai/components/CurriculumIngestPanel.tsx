// =============================================================================
// CurriculumIngestPanel — 7.8 coordinator curriculum ingestion (paste/upload)
// =============================================================================
// Coordinator pastes (or uploads a .txt/.md) syllabus → the curriculum-ingest
// edge function extracts bilingual CLO candidates → a DRY-RUN coordinator
// approval proposal is stored. Zero curriculum writes happen here; the
// proposal is approved in the dashboard approval inbox above this panel.
// =============================================================================

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileUp, Loader2, Wand2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useCurriculumIngest } from "@/hooks/useCurriculumIngest";

const MIN_CHARS = 200;
const ACCEPTED = ".txt,.md,.markdown";

interface IngestCourse {
  id: string;
  name: string;
}

/** Courses visible to the coordinator (RLS-scoped). */
const useCoordinatedCourses = (enabled: boolean) => {
  return useQuery({
    queryKey: ["curriculum-ingest-courses"],
    queryFn: async (): Promise<IngestCourse[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .order("name")
        .limit(200);
      if (error) throw error;
      return (data ?? []) as IngestCourse[];
    },
    enabled,
    staleTime: 60_000,
  });
};

export default function CurriculumIngestPanel({
  courseId,
  onCourseChange,
}: {
  courseId: string;
  onCourseChange: (courseId: string) => void;
}) {
  const { t } = useTranslation("coordinator");
  const ingest = useCurriculumIngest();
  const [syllabusName, setSyllabusName] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const coursesQuery = useCoordinatedCourses(!!courseId);

  const readFile = (file: File) => {
    if (file.size > 512 * 1024) {
      toast.error(t("curriculumIngest.fileTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setSyllabusText(text);
      if (!syllabusName) {
        setSyllabusName(file.name.replace(/\.(txt|md|markdown)$/i, ""));
      }
    };
    reader.readAsText(file);
  };

  const canRun =
    syllabusName.trim().length > 0 && syllabusText.trim().length >= MIN_CHARS;

  const run = () => {
    ingest.mutate(
      {
        courseId,
        syllabusName: syllabusName.trim(),
        syllabusText,
      },
      {
        onSuccess: (result) => {
          toast.success(
            t("curriculumIngest.successToast", { count: result.candidateCount })
          );
        },
        onError: () => toast.error(t("curriculumIngest.errorToast")),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-violet-600" />
          {t("curriculumIngest.title")}
        </CardTitle>
        <p className="text-sm text-slate-500">
          {t("curriculumIngest.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-slate-500">
            {t("curriculumIngest.courseLabel")}
          </Label>
          <Select value={courseId} onValueChange={onCourseChange}>
            <SelectTrigger className="mt-1 bg-white">
              <SelectValue
                placeholder={t("curriculumIngest.coursePlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {(coursesQuery.data ?? []).map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          value={syllabusName}
          onChange={(e) => setSyllabusName(e.target.value)}
          placeholder={t("curriculumIngest.namePlaceholder")}
          maxLength={200}
        />
        <Textarea
          value={syllabusText}
          onChange={(e) => setSyllabusText(e.target.value)}
          placeholder={t("curriculumIngest.textPlaceholder")}
          className="min-h-[140px] resize-y font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="me-1 h-3 w-3" />
            {t("curriculumIngest.upload")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="text-xs"
            disabled={!canRun || ingest.isPending}
            onClick={run}
          >
            {ingest.isPending ? (
              <Loader2 className="me-1 h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="me-1 h-3 w-3" />
            )}
            {ingest.isPending
              ? t("curriculumIngest.running")
              : t("curriculumIngest.run")}
          </Button>
          {syllabusText.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {syllabusText.length} / {MIN_CHARS}+ chars
            </Badge>
          )}
        </div>
        {ingest.isError && (
          <p className="text-xs text-red-600">
            {t("curriculumIngest.errorToast")}
          </p>
        )}
        {ingest.data && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {t("curriculumIngest.candidateCount", {
                  count: ingest.data.candidateCount,
                })}
              </Badge>
              {ingest.data.model !== "unknown" && (
                <Badge variant="outline" className="text-[10px]">
                  {ingest.data.model}
                </Badge>
              )}
            </div>
            {ingest.data.summary && (
              <p className="mt-2 text-xs text-slate-500">
                {ingest.data.summary}
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {ingest.data.candidates.map((candidate) => (
                <li key={candidate.titleEn} className="text-xs text-slate-600">
                  {candidate.titleEn}
                  {candidate.titleAr && (
                    <span className="ms-2 text-slate-400">
                      {candidate.titleAr}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">
              {t("curriculumIngest.approvalNote")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
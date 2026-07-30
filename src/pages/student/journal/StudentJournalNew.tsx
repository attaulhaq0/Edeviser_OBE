// =============================================================================
// StudentJournalNew — redesigned learning journal (P3, spec task 3.1)
// =============================================================================
//
// List + create-dialog archetype gated behind `newUiModules` (see the wrapper
// in StudentJournalPage.tsx). REUSES every existing hook, the create-entry
// mutation, the CLO-contextual guided-prompt generation, the reflection-prompt
// templates, and the word-count / XP-eligibility logic VERBATIM (R10.1–R10.3a).
// Only presentation changes: the CTA + save buttons use the tactile Button
// variant and entry cards use `.card-elevated`. i18n reuses the exact `student`
// namespace `journal.*` keys. Flag-off keeps the legacy page byte-identical.
// =============================================================================

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CalendarDays,
  Check,
  Flame,
  Lightbulb,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

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
import { KPICard, PCard, Shimmer } from "@/design-system";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useJournalEntries, useCreateJournalEntry } from "@/hooks/useJournal";
import { useJournalCourseOptions } from "@/hooks/useJournalCourseOptions";
import { useCLOs } from "@/hooks/useCLOs";
import {
  generateJournalPrompt,
  type GeneratedJournalPrompt,
} from "@/lib/journalPromptGenerator";
import {
  REFLECTION_PROMPT_TEMPLATES,
  seedContentWithPrompt,
} from "@/lib/reflectionPrompts";
import { getJournalInsights } from "@/lib/journalInsights";
import { toast } from "sonner";

/**
 * Builds the seed text for a CLO-contextual guided prompt: the intro followed
 * by the Kolb reflection questions as scaffolding.
 */
const buildGuidedSeed = (prompt: GeneratedJournalPrompt): string => {
  const questions = prompt.questions.map((q) => `• ${q.question}`).join("\n");
  return `${prompt.promptText}\n\n${questions}`;
};

const StudentJournalNew = () => {
  const { t, i18n } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id;

  const [isCreating, setIsCreating] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [content, setContent] = useState("");

  const { data: entries, isLoading: entriesLoading } = useJournalEntries();
  const { data: courses } = useJournalCourseOptions(studentId);
  const createEntry = useCreateJournalEntry();

  // CLOs for the selected course drive the existing CLO-contextual prompt
  // generator. Matches the pattern used in JournalEditor.
  const { data: closData } = useCLOs(selectedCourse || undefined);
  const clos = useMemo(() => closData?.data ?? [], [closData]);

  // Build a guided, CLO-contextual prompt when context is available. When no
  // course/CLO context exists — or the generator is otherwise unavailable —
  // this is null and the page falls back to the static templates + free-text
  // (basic unguided journal), so journaling always remains possible (R10.3a).
  const guidedPrompt = useMemo((): GeneratedJournalPrompt | null => {
    if (!selectedCourse) return null;
    const cloWithBlooms = clos.find((c) => c.blooms_level);
    if (!cloWithBlooms || !cloWithBlooms.blooms_level) return null;
    try {
      return generateJournalPrompt({
        cloTitle: cloWithBlooms.title,
        bloomsLevel: cloWithBlooms.blooms_level,
        // Real attainment would come from outcome_attainment; "Developing"
        // is a neutral default that yields the full set of reflection stages.
        attainmentLevel: "Developing",
      });
    } catch {
      // Generator unavailable — fall back to the unguided journal (R10.3a).
      return null;
    }
  }, [selectedCourse, clos]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const courseLookup = new Map((courses ?? []).map((c) => [c.id, c]));
  const insights = useMemo(() => getJournalInsights(entries ?? []), [entries]);
  const dailyPrompt = t(
    REFLECTION_PROMPT_TEMPLATES[
      new Date().getUTCDate() % REFLECTION_PROMPT_TEMPLATES.length
    ]!.i18nKey
  );
  const formatEntryDate = (
    date: string | Date,
    options?: Intl.DateTimeFormatOptions
  ) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options,
    }).format(new Date(date));

  const handleSelectTemplate = (promptText: string) => {
    setContent((prev) => seedContentWithPrompt(prev, promptText));
  };

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
      const message =
        err instanceof Error ? err.message : "Failed to save entry";
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
          <p className="mt-1 text-sm text-gray-500">
            {t(
              "journal.subtitle",
              "Reflect on what you've learned. Earn 20 XP per entry of 50+ words."
            )}
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button variant="tactile">
              <Plus className="h-4 w-4" />
              {t("journal.newEntry", "New Entry")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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

              {/* Reflection prompt templates — always available so the journal
                  is guided rather than a bare textbox (R10.1, R10.2). */}
              <div className="space-y-2">
                <Label>
                  {t("journal.prompts.title", "Reflection prompts")}
                </Label>
                <p className="text-xs text-gray-500">
                  {t(
                    "journal.prompts.hint",
                    "Pick a prompt to get started, or just write freely below."
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {REFLECTION_PROMPT_TEMPLATES.map((template) => {
                    const promptText = t(template.i18nKey);
                    return (
                      <Button
                        key={template.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleSelectTemplate(promptText)}
                      >
                        <Lightbulb className="me-1.5 h-3.5 w-3.5 text-amber-500" />
                        {promptText}
                      </Button>
                    );
                  })}
                </div>

                {/* CLO-contextual guided prompt from the existing generator,
                    shown only when course/CLO context is available (R10.3). */}
                {guidedPrompt && (
                  <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                        {t("journal.prompts.guided", "Guided reflection")}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-teal-700 hover:bg-teal-100"
                        onClick={() =>
                          handleSelectTemplate(buildGuidedSeed(guidedPrompt))
                        }
                      >
                        {t("journal.prompts.use", "Use this prompt")}
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {guidedPrompt.promptText}
                    </p>
                  </div>
                )}
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
                  {wordCount} {t("journal.dialog.words", "words")}
                  {wordCount >= 50 && (
                    <span className="ms-2 font-semibold text-green-600">
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
                variant="tactile"
                onClick={handleSubmit}
                disabled={
                  !selectedCourse ||
                  content.trim().length === 0 ||
                  createEntry.isPending
                }
              >
                {createEntry.isPending
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <PCard className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <PenLine className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                {t("journal.today.title")}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
                {t("journal.today.description")}
              </p>
            </div>
          </div>
          <Button variant="tactile" onClick={() => setIsCreating(true)}>
            <PenLine className="size-4" />
            {t("journal.today.cta")}
          </Button>
        </div>
      </PCard>

      {entriesLoading ? (
        <div className="space-y-4">
          <Shimmer className="h-72 rounded-[20px]" />
          <Shimmer className="h-52 rounded-[20px]" />
        </div>
      ) : (
        <>
          <PCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <BookOpen className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  {t("journal.journey.title")}
                </h2>
              </div>
              <Badge
                variant="outline"
                className="rounded-lg px-2.5 py-1 text-xs text-slate-500"
              >
                {t("journal.journey.thisWeek")}
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPICard
                icon={BookOpen}
                label={t("journal.journey.entriesThisWeek")}
                value={insights.entriesThisWeek}
                iconBgClass="bg-teal-50"
                iconColorClass="text-teal-600"
                valueClassName="text-slate-900"
              />
              <KPICard
                icon={Flame}
                label={t("journal.journey.dayStreak")}
                value={insights.streak}
                iconBgClass="bg-orange-50"
                iconColorClass="text-orange-600"
                valueClassName="text-slate-900"
              />
              <KPICard
                icon={Sparkles}
                label={t("journal.journey.substantive")}
                value={insights.substantiveThisWeek}
                iconBgClass="bg-amber-50"
                iconColorClass="text-amber-600"
                valueClassName="text-slate-900"
              />
              <KPICard
                icon={CalendarDays}
                label={t("journal.journey.totalEntries")}
                value={insights.totalEntries}
                iconBgClass="bg-blue-50"
                iconColorClass="text-blue-600"
                valueClassName="text-slate-900"
              />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-700">
                  {t("journal.journey.weeklyStreak")}
                </p>
                <span className="text-xs font-semibold text-teal-700">
                  {t("journal.journey.daysOfWeek", {
                    count: insights.days.filter((day) => day.hasEntry).length,
                  })}
                </span>
              </div>
              <ol
                className="mt-4 grid grid-cols-7 gap-1.5"
                aria-label={t("journal.journey.weeklyStreak")}
              >
                {insights.days.map((day) => {
                  const isToday =
                    day.date.toISOString().slice(0, 10) ===
                    new Date().toISOString().slice(0, 10);
                  return (
                    <li
                      key={day.date.toISOString()}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={
                          day.hasEntry
                            ? "flex size-8 items-center justify-center rounded-[10px] bg-teal-600 text-white"
                            : isToday
                            ? "flex size-8 items-center justify-center rounded-[10px] border-2 border-dashed border-teal-600 text-teal-700"
                            : "flex size-8 items-center justify-center rounded-[10px] bg-slate-100 text-slate-300"
                        }
                        aria-label={formatEntryDate(day.date, {
                          weekday: "long",
                        })}
                      >
                        {day.hasEntry ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : (
                          "·"
                        )}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatEntryDate(day.date, { weekday: "narrow" })}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </PCard>

          <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50 p-4">
            <Lightbulb
              className="size-5 shrink-0 text-teal-700"
              aria-hidden="true"
            />
            <p className="text-sm text-slate-600">
              <span className="font-semibold">
                {t("journal.dailyPrompt.label")}
              </span>{" "}
              <span className="font-bold text-slate-800">{dailyPrompt}</span>
            </p>
          </div>

          <PCard className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  {t("journal.pastEntries")}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {t("journal.entryCount", { count: insights.totalEntries })}
              </span>
            </div>

            {!entries || entries.length === 0 ? (
              <div className="pt-5">
                <EmptyState
                  icon={<PenLine className="h-12 w-12 text-gray-400" />}
                  title={t("journal.empty.title", "No journal entries yet")}
                  description={t("journal.empty.description")}
                />
              </div>
            ) : (
              <ol className="mt-5 space-y-4">
                {entries.map((entry, index) => {
                  const course = courseLookup.get(entry.course_id);
                  return (
                    <li key={entry.id} className="relative flex gap-3 ps-1">
                      {index < entries.length - 1 && (
                        <span
                          className="absolute start-[7px] top-5 h-[calc(100%+0.75rem)] w-px bg-slate-200"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className="relative mt-1.5 size-3.5 shrink-0 rounded-full border-[3px] border-teal-100 bg-teal-600"
                        aria-hidden="true"
                      />
                      <Link
                        to={`/student/journal/${entry.id}`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <time
                            className="text-xs font-bold text-slate-400"
                            dateTime={entry.created_at}
                          >
                            {formatEntryDate(entry.created_at)}
                          </time>
                          {course ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold"
                            >
                              <BookOpen className="me-1 size-3" />
                              {course.code}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                          {entry.content}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </PCard>
        </>
      )}
    </div>
  );
};

export default StudentJournalNew;

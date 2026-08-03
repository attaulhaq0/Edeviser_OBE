// =============================================================================
// StudentJournalNew — prototype-aligned journal body
// =============================================================================
// The page deliberately keeps the existing TanStack Query/Supabase hooks and
// mutation intact. This component only changes the presentation and composes
// the same data into the reflection, journey, prompt and timeline sections
// from the Journal prototype.
// =============================================================================

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BookOpen, Check, ChevronDown, Lightbulb, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/shared/EmptyState";
import MascotCharacter from "@/design-system/mascot/MascotCharacter";
import { PCard, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useCLOs } from "@/hooks/useCLOs";
import { useCreateJournalEntry, useJournalEntries } from "@/hooks/useJournal";
import { useJournalCourseOptions } from "@/hooks/useJournalCourseOptions";
import {
  generateJournalPrompt,
  type GeneratedJournalPrompt,
} from "@/lib/journalPromptGenerator";
import { getJournalInsights } from "@/lib/journalInsights";
import {
  REFLECTION_PROMPT_TEMPLATES,
  seedContentWithPrompt,
} from "@/lib/reflectionPrompts";
import { toast } from "sonner";

const buildGuidedSeed = (prompt: GeneratedJournalPrompt): string => {
  const questions = prompt.questions.map((q) => `• ${q.question}`).join("\n");
  return `${prompt.promptText}\n\n${questions}`;
};

const StudentJournalNew = () => {
  const { t, i18n } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id;
  const entryRef = useRef<HTMLTextAreaElement>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [content, setContent] = useState("");

  const { data: entries, isLoading: entriesLoading } = useJournalEntries();
  const { data: courses } = useJournalCourseOptions(studentId);
  const createEntry = useCreateJournalEntry();
  const { data: closData } = useCLOs(selectedCourse || undefined);
  const clos = useMemo(() => closData?.data ?? [], [closData]);
  const guidedPrompt = useMemo((): GeneratedJournalPrompt | null => {
    if (!selectedCourse) return null;
    const clo = clos.find((item) => item.blooms_level);
    if (!clo?.blooms_level) return null;
    try {
      return generateJournalPrompt({
        cloTitle: clo.title,
        bloomsLevel: clo.blooms_level,
        attainmentLevel: "Developing",
      });
    } catch {
      return null;
    }
  }, [clos, selectedCourse]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const characterCount = content.length;
  const courseLookup = new Map(
    (courses ?? []).map((course) => [course.id, course])
  );
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

  const focusComposer = () => {
    entryRef.current?.focus();
  };

  const handleSelectTemplate = (promptText: string) => {
    setContent((previous) => seedContentWithPrompt(previous, promptText));
    requestAnimationFrame(focusComposer);
  };

  const handleSubmit = async () => {
    const courseId = selectedCourse || courses?.[0]?.id;
    if (!courseId || wordCount < 50) return;
    try {
      await createEntry.mutateAsync({
        course_id: courseId,
        content: content.trim(),
      });
      toast.success(t("journal.created", "Journal entry saved"));
      setContent("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save entry"
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-5">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            {t("journal.title", "Reflection Journal")}
          </h1>
          <p className="text-xs text-slate-500">
            {t(
              "journal.subtitle",
              "Reflect, grow, and make your learning visible."
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={focusComposer}
        >
          <PenLine className="me-2 size-4" />
          {t("journal.newEntry", "New Entry")}
        </Button>
      </div>

      <PCard className="overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
              📝
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-tight text-slate-900">
                {t("journal.today.title", "Today's Reflection")}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {t(
                  "journal.today.description",
                  "What did you learn today? Reflect on your progress, thoughts, or anything meaningful."
                )}
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 items-start gap-2 sm:flex">
            <div className="relative mt-1 max-w-[150px] rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-slate-600 shadow-sm before:absolute before:start-[-7px] before:top-4 before:size-3 before:rotate-45 before:border-b before:border-s-amber-300 before:bg-amber-50">
              {t(
                "journal.today.mascotMessage",
                "Every reflection makes you stronger! ✨"
              )}
            </div>
            <MascotCharacter
              character="foxi"
              emotion="happy"
              size="md"
              animation="float"
              alt={t(
                "journal.today.mascotAlt",
                "Foxi cheering your reflection"
              )}
              className="-mt-2"
            />
          </div>
        </div>

        <div className="relative mt-4">
          <Textarea
            ref={entryRef}
            value={content}
            maxLength={1000}
            rows={4}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t(
              "journal.dialog.placeholder",
              "Write your thoughts here…"
            )}
            className="resize-none rounded-xl border-slate-200 bg-slate-50 p-3.5 pe-20 text-sm focus:border-blue-400 focus:ring-blue-100"
            aria-label={t("journal.dialog.content", "Reflection")}
          />
          <span className="pointer-events-none absolute bottom-3 end-3.5 text-[11px] text-slate-400">
            {characterCount} / 1000
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500">
            {t("journal.prompts.hint", "Need inspiration? Try these:")}
          </p>
          {courses && courses.length > 1 ? (
            <div className="flex items-center gap-2">
              <Label
                htmlFor="journal-course"
                className="text-[11px] text-slate-500"
              >
                {t("journal.dialog.course", "Course")}
              </Label>
              <Select
                value={selectedCourse || courses?.[0]?.id || ""}
                onValueChange={setSelectedCourse}
              >
                <SelectTrigger
                  id="journal-course"
                  className="h-8 w-[190px] rounded-lg text-xs"
                >
                  <SelectValue
                    placeholder={t(
                      "journal.dialog.selectCourse",
                      "Select a course"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {REFLECTION_PROMPT_TEMPLATES.map((template) => {
            const promptText = t(template.i18nKey);
            return (
              <Button
                key={template.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600"
                onClick={() => handleSelectTemplate(promptText)}
              >
                <Lightbulb className="me-1.5 size-3.5 text-amber-500" />
                {promptText}
              </Button>
            );
          })}
        </div>
        {guidedPrompt ? (
          <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
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
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {guidedPrompt.promptText}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
            ⭐ {t("journal.today.xp", "+20 XP for journaling")}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              {wordCount >= 50
                ? t("journal.today.ready", "Ready ✓")
                : t(
                    "journal.today.wordsNeeded",
                    "{{count}} more words for +20 XP",
                    {
                      count: Math.max(0, 50 - wordCount),
                    }
                  )}
            </span>
            <Button
              type="button"
              variant="tactile"
              onClick={handleSubmit}
              disabled={
                wordCount < 50 ||
                !(selectedCourse || courses?.[0]?.id) ||
                createEntry.isPending
              }
              className="rounded-xl"
            >
              {createEntry.isPending
                ? t("common.saving", "Saving…")
                : `💾 ${t("journal.today.save", "Save Reflection")}`}
            </Button>
          </div>
        </div>
      </PCard>

      {entriesLoading ? (
        <>
          <Shimmer className="h-64 rounded-[20px]" />
          <Shimmer className="h-52 rounded-[20px]" />
        </>
      ) : (
        <>
          <PCard className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-lg">
                  📔
                </span>
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  {t("journal.journey.title", "Your Journaling Journey")}
                </h2>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500"
              >
                {t("journal.journey.thisWeek", "This Week")}
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [
                  "📖",
                  insights.entriesThisWeek,
                  t("journal.journey.entriesThisWeek", "Entries this week"),
                  "bg-teal-50",
                ],
                [
                  "🔥",
                  insights.streak,
                  t("journal.journey.dayStreak", "Day streak"),
                  "bg-red-50",
                ],
                [
                  "⭐",
                  insights.substantiveThisWeek * 20,
                  t("journal.journey.xpEarned", "XP earned this week"),
                  "bg-amber-50",
                ],
                [
                  "📅",
                  insights.totalEntries,
                  t("journal.journey.totalEntries", "Total entries"),
                  "bg-blue-50",
                ],
              ].map(([icon, value, label, iconBg]) => (
                <div key={String(label)} className="flex items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg ${iconBg}`}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none text-slate-900">
                      {value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700">
                  🔥{" "}
                  {t(
                    "journal.journey.weeklyStreak",
                    "This week's reflection streak"
                  )}
                </p>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-600">
                  {t("journal.journey.keepAlive", "Keep it alive today!")}
                </span>
              </div>
              <ol
                className="flex gap-1.5"
                aria-label={t(
                  "journal.journey.weeklyStreak",
                  "This week's reflection streak"
                )}
              >
                {insights.days.map((day) => {
                  const isToday =
                    day.date.toISOString().slice(0, 10) ===
                    new Date().toISOString().slice(0, 10);
                  return (
                    <li
                      key={day.date.toISOString()}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                    >
                      <span
                        className={
                          day.hasEntry
                            ? "flex size-[30px] items-center justify-center rounded-[10px] bg-teal-600 text-sm font-black text-white"
                            : isToday
                            ? "flex size-[30px] items-center justify-center rounded-[10px] border-2 border-dashed border-teal-600 text-sm font-black text-teal-700"
                            : "flex size-[30px] items-center justify-center rounded-[10px] bg-slate-100 text-sm font-black text-slate-300"
                        }
                      >
                        {day.hasEntry ? <Check className="size-4" /> : "·"}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400">
                        {formatEntryDate(day.date, { weekday: "narrow" })}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mb-1.5 mt-4 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500">
                  {t(
                    "journal.journey.habitForming",
                    "Habit forming · {{count}} / 7 days this week",
                    {
                      count: insights.days.filter((day) => day.hasEntry).length,
                    }
                  )}
                </p>
                <p className="text-[11px] font-bold text-slate-400">
                  {t(
                    "journal.journey.perfectWeek",
                    "{{count}} more for a perfect week 🏅",
                    {
                      count: Math.max(
                        0,
                        7 - insights.days.filter((day) => day.hasEntry).length
                      ),
                    }
                  )}
                </p>
              </div>
              <div className="h-[9px] overflow-hidden rounded-full bg-slate-200">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500"
                  style={{
                    width: `${Math.round(
                      (insights.days.filter((day) => day.hasEntry).length / 7) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </PCard>

          <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50 p-3.5 text-xs text-slate-600">
            <span className="text-lg">💭</span>
            <p>
              {t("journal.dailyPrompt.label", "Today's prompt:")}{" "}
              <b className="font-bold text-slate-800">{dailyPrompt}</b>
            </p>
          </div>

          <PCard className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-lg">
                  🗂️
                </span>
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  {t("journal.pastEntries", "Past Entries")}
                </h2>
              </div>
              <span className="text-xs font-bold text-blue-600">
                {t("journal.viewAll", "View all entries →")}
              </span>
            </div>
            {!entries || entries.length === 0 ? (
              <EmptyState
                icon={<PenLine className="h-12 w-12 text-gray-400" />}
                title={t("journal.empty.title", "No journal entries yet")}
                description={t(
                  "journal.empty.description",
                  "Start your learning journal — reflect on a class or concept and earn XP."
                )}
              />
            ) : (
              <ol className="relative">
                {entries.map((entry, index) => {
                  const course = courseLookup.get(entry.course_id);
                  return (
                    <li
                      key={entry.id}
                      className="relative flex gap-3 pb-3 last:pb-0"
                    >
                      <span className="relative mt-1.5 flex w-4 shrink-0 justify-center">
                        <span className="z-10 size-3.5 rounded-full border-[3px] border-teal-100 bg-teal-600" />
                        {index < entries.length - 1 ? (
                          <span className="absolute top-4 h-[calc(100%+0.75rem)] w-0.5 bg-slate-200" />
                        ) : null}
                      </span>
                      <Link
                        to={`/student/journal/${entry.id}`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <time
                            className="text-[11px] font-bold text-slate-400"
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
                        <p className="mt-0.5 line-clamp-1 text-sm font-bold text-slate-900">
                          {entry.content.split(/\r?\n/)[0]}
                        </p>
                        <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                          {entry.content}
                        </p>
                      </Link>
                      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                        <span className="text-[10px] font-bold text-green-600">
                          +20 XP
                        </span>
                        <MascotCharacter
                          character="penguin"
                          emotion="happy"
                          size="xs"
                          decorative
                        />
                      </div>
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

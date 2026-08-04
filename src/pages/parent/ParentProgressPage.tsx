import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  PCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
} from "@/design-system";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { useParentChildProgress } from "@/hooks/useParentProgress";
import { cn } from "@/lib/utils";

const bandInfo = (p: number) => {
  if (p >= 85)
    return {
      label: "Strong",
      pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      barGradient: "linear-gradient(90deg, #14b8a6, #0382bd)",
    };
  if (p >= 70)
    return {
      label: "Growing",
      pillClass: "bg-blue-50 text-blue-700 border-blue-200",
      barGradient: "linear-gradient(90deg, #14b8a6, #0382bd)",
    };
  if (p >= 50)
    return {
      label: "Growing",
      pillClass: "bg-sky-50 text-sky-700 border-sky-200",
      barGradient: "linear-gradient(90deg, #38bdf8, #0284c7)",
    };
  return {
    label: "Needs support",
    pillClass: "bg-amber-50 text-amber-700 border-amber-200",
    barGradient: "linear-gradient(90deg, #f59e0b, #f97316)",
  };
};

const ParentProgressPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(
    user?.id
  );
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const selectedChild = useMemo(() => {
    if (!children || children.length === 0) return null;
    if (selectedChildId) {
      return (
        children.find((c) => c.student_id === selectedChildId) ?? children[0]
      );
    }
    return children[0];
  }, [selectedChildId, children]);

  const effectiveChildId = selectedChild?.student_id ?? "";
  const childFirstName = selectedChild?.student_name.split(" ")[0] ?? "Child";

  const { data: courses, isLoading: progressLoading } = useParentChildProgress(
    effectiveChildId || undefined
  );

  // Only show a trend when the canonical gamification record has real
  // activity. Course enrollment alone is not a wellbeing signal.
  const hasConsistencyData = Boolean(
    selectedChild &&
      (selectedChild.current_streak > 0 || selectedChild.xp_total > 0)
  );

  return (
    <div className="space-y-5 no-scrollbar">
      {/* ── Page Header matching prototype ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {t("parent.progress.growthTitle", {
              defaultValue: "{{name}}'s growth & wellbeing",
              name: childFirstName,
            })}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "parent.progress.growthSubtitle",
              "Progress described as growth over time — strengths and effort, not raw grades."
            )}
          </p>
        </div>

        {children && children.length > 1 && (
          <div className="w-48 shrink-0">
            <Select value={effectiveChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="h-9 text-xs font-semibold">
                <SelectValue
                  placeholder={t(
                    "parent.progress.selectChild",
                    "Select a child"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.student_id} value={c.student_id}>
                    {c.student_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {childrenLoading ? (
        <Shimmer className="h-64 rounded-xl" />
      ) : !children || children.length === 0 ? (
        <NoLinkedStudents />
      ) : (
        <>
          {progressLoading ? (
            <Shimmer className="h-64 rounded-xl" />
          ) : !courses || courses.length === 0 ? (
            <PCard className="p-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
                🌱
              </div>
              <p className="text-sm text-slate-500">
                {t(
                  "parent.progress.noData",
                  "No progress data yet. Once your child has activity, growth bands will appear here."
                )}
              </p>
            </PCard>
          ) : (
            <>
              {/* ── Subject strengths as bands (matching prototype parent-progress.html) ── */}
              <PCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ParentSectionIcon emoji="📚" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {t(
                      "parent.progress.subjectsTitle",
                      "Subjects · where they stand"
                    )}
                  </h2>
                </div>

                <div className="space-y-3.5">
                  {courses.map((course) => {
                    if (!course.has_evidence) {
                      return (
                        <div
                          key={course.course_id}
                          className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500"
                        >
                          <span className="font-semibold text-slate-700">
                            {course.course_name}
                          </span>{" "}
                          · No released outcome evidence yet.
                        </div>
                      );
                    }
                    const info = bandInfo(course.attainment_percent);
                    return (
                      <div key={course.course_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span className="text-slate-900 dark:text-slate-100">
                            {course.course_name}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                              info.pillClass
                            )}
                          >
                            {info.label}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                course.attainment_percent,
                                12
                              )}%`,
                              background: info.barGradient,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-[11px] text-slate-400">
                  {t(
                    "parent.progress.bandsExplanation",
                    "Bands (Strong / Growing / Needs support) describe mastery of learning outcomes — chosen over numbers to keep the focus on progress."
                  )}
                </p>
              </PCard>

              {/* ── 2-Column Grid: Consistency & Wellbeing Signals ── */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Study consistency */}
                <PCard className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ParentSectionIcon emoji="🔥" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {t(
                        "parent.progress.consistencyTitle",
                        "Study consistency"
                      )}
                    </h2>
                  </div>

                  {hasConsistencyData ? (
                    <>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                        🔥 {selectedChild?.current_streak ?? 0}-day shared
                        activity streak · {selectedChild?.xp_total ?? 0} XP
                        recorded.
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Not enough study history to show a consistency trend yet.
                    </div>
                  )}
                </PCard>

                {/* Wellbeing signals */}
                <PCard className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ParentSectionIcon emoji="😊" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {t("parent.progress.wellbeingTitle", "Wellbeing signals")}
                    </h2>
                  </div>

                  <div className="py-8 text-center text-xs text-slate-500">
                    🔒 No approved wellbeing summary is available yet. Private
                    journals, reflections and tutor conversations remain hidden.
                  </div>
                </PCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ParentProgressPage;

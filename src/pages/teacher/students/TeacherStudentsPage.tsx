import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Clock3,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button, PCard, SectionHeader, StatusDot } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import {
  useAtRiskStudents,
  useTeacherKPIs,
  useSendNudge,
  type AtRiskStudent,
} from "@/hooks/useTeacherDashboard";
import { useAtRiskPredictions } from "@/hooks/useAtRiskPredictions";
import { cn } from "@/lib/utils";

type Severity = "crit" | "att" | "mon";

const severityOf = (student: AtRiskStudent): Severity => {
  if (
    student.risk_reasons.length >= 2 ||
    student.days_inactive >= 14 ||
    student.low_clo_count >= 3
  ) {
    return "crit";
  }
  if (student.days_inactive >= 7 || student.low_clo_count >= 2) {
    return "att";
  }
  return "mon";
};

const severityLabel: Record<Severity, string> = {
  crit: "Critical",
  att: "Attention",
  mon: "Monitor",
};

const severityTone: Record<Severity, "danger" | "warning" | "info"> = {
  crit: "danger",
  att: "warning",
  mon: "info",
};

const severityButtonClass: Record<Severity, string> = {
  crit: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  att: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  mon: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
};

const TeacherStudentsPage = () => {
  const { t } = useTranslation("teacher");
  const { user } = useAuth();
  const atRiskQuery = useAtRiskStudents();
  const kpiQuery = useTeacherKPIs();
  const predictionQuery = useAtRiskPredictions();
  const sendNudge = useSendNudge();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<Severity | "all">("all");

  const filteredData = useMemo(() => {
    const list = atRiskQuery.data ?? [];
    return list.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const sev = severityOf(student);
      const matchesFilter = selectedFilter === "all" || sev === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [atRiskQuery.data, searchTerm, selectedFilter]);

  const grouped = useMemo(() => {
    const result: Record<Severity, AtRiskStudent[]> = {
      crit: [],
      att: [],
      mon: [],
    };

    for (const student of filteredData) {
      result[severityOf(student)].push(student);
    }

    return result;
  }, [filteredData]);

  const criticalCount = (atRiskQuery.data ?? []).filter(
    (s) => severityOf(s) === "crit"
  ).length;
  const attentionCount = (atRiskQuery.data ?? []).filter(
    (s) => severityOf(s) === "att"
  ).length;
  const monitorCount = (atRiskQuery.data ?? []).filter(
    (s) => severityOf(s) === "mon"
  ).length;
  const flaggedCount = kpiQuery.data?.atRiskCount ?? 0;
  const detailsUnavailable =
    !atRiskQuery.isPending &&
    (atRiskQuery.data?.length ?? 0) === 0 &&
    flaggedCount > 0;

  const predictionByStudent = useMemo(() => {
    const map = new Map<string, string>();
    for (const prediction of predictionQuery.data ?? []) {
      if (!map.has(prediction.student_id)) {
        map.set(prediction.student_id, prediction.suggestion_text);
      }
    }
    return map;
  }, [predictionQuery.data]);

  const handleNudge = async (student: AtRiskStudent) => {
    if (!user?.id) return;
    try {
      await sendNudge.mutateAsync({
        studentId: student.id,
        message: `Hi ${student.full_name}, I noticed you may need a quick check-in. Let's get you back on track.`,
      });
      toast.success(`Nudge sent to ${student.full_name}`);
    } catch (error) {
      console.error("[TeacherStudentsPage] Failed to send nudge:", error);
      toast.error("Could not send nudge");
    }
  };

  return (
    <div className="space-y-6">
      <PCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              {t("dashboard.triage.all", "Student triage")}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {t("dashboard.triage.all", "Students who need attention")}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              {t(
                "dashboard.triage.helper",
                "See students who may benefit from support, ordered by documented evidence and deterministic attention rules."
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/teacher/grading">
                <Sparkles className="me-2 h-4 w-4" />
                {t("dashboard.quickActions.grade", "Go to grading")}
              </Link>
            </Button>
            <Button variant="tactile" className="rounded-xl" asChild>
              <Link to="/teacher/dashboard">
                {t("dashboard.quickActions.back", "Back to dashboard")}
              </Link>
            </Button>
          </div>
        </div>
      </PCard>

      {detailsUnavailable ? (
        <PCard className="border-amber-200 bg-amber-50/60 p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-extrabold text-slate-900">
                {t("dashboard.accessLimited.title")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {t("dashboard.accessLimited.description", {
                  count: flaggedCount,
                })}
              </p>
            </div>
          </div>
        </PCard>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                id: "crit" as const,
                label: "Critical",
                value: criticalCount,
                tone: "danger" as const,
                icon: TriangleAlert,
              },
              {
                id: "att" as const,
                label: "Attention",
                value: attentionCount,
                tone: "warning" as const,
                icon: Clock3,
              },
              {
                id: "mon" as const,
                label: "Monitor",
                value: monitorCount,
                tone: "info" as const,
                icon: Users,
              },
            ].map(({ id, label, value, tone, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setSelectedFilter(selectedFilter === id ? "all" : id)
                }
                className="text-start focus:outline-none"
              >
                <PCard
                  className={cn(
                    "p-5 transition-all",
                    selectedFilter === id && "ring-2 ring-blue-500 shadow-md"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        tone === "danger" && "bg-red-50 text-red-600",
                        tone === "warning" && "bg-amber-50 text-amber-600",
                        tone === "info" && "bg-blue-50 text-blue-600"
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        {label}
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        {value}
                      </p>
                    </div>
                  </div>
                </PCard>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              placeholder="Search student name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-80"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Filter:
              </span>
              {(["all", "crit", "att", "mon"] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setSelectedFilter(filterKey)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
                    selectedFilter === filterKey
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {filterKey === "all"
                    ? "All Students"
                    : filterKey === "crit"
                    ? "Critical"
                    : filterKey === "att"
                    ? "Attention"
                    : "Monitor"}
                </button>
              ))}
            </div>
          </div>

          {(Object.keys(grouped) as Severity[]).map((severity) => {
            const students = grouped[severity];
            return (
              <section key={severity} className="space-y-3">
                <SectionHeader
                  icon={
                    severity === "crit"
                      ? TriangleAlert
                      : severity === "att"
                      ? Clock3
                      : Users
                  }
                  title={severityLabel[severity]}
                  description={`${students.length} students`}
                />
                {students.length === 0 ? (
                  <PCard className="p-5">
                    <p className="text-sm text-slate-500">
                      No students in this bucket right now.
                    </p>
                  </PCard>
                ) : (
                  <div className="grid gap-4">
                    {students.map((student) => {
                      const prediction = predictionByStudent.get(student.id);
                      return (
                        <PCard key={student.id} className="p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-3">
                              <div className="flex items-start gap-3">
                                <StatusDot
                                  tone={severityTone[severity]}
                                  label={severityLabel[severity]}
                                  className="mt-2"
                                />
                                <div className="min-w-0">
                                  <p className="text-base font-extrabold text-slate-900">
                                    {student.full_name}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {student.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {student.risk_reasons.map((reason) => (
                                  <span
                                    key={reason}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>

                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                                  {student.last_login_at
                                    ? t("dashboard.daysInactive", {
                                        count: student.days_inactive,
                                      })
                                    : t("dashboard.activityUnavailable")}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                                  {student.low_clo_count} CLOs below 50%
                                </span>
                                {prediction ? (
                                  <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                                    Evidence: {prediction}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button
                                variant="outline"
                                className={cn(
                                  "rounded-xl",
                                  severityButtonClass[severity]
                                )}
                                onClick={() => void handleNudge(student)}
                                disabled={sendNudge.isPending}
                              >
                                <Bell className="me-2 h-4 w-4" />
                                Send nudge
                              </Button>
                              <Button
                                variant="ghost"
                                className="rounded-xl"
                                asChild
                              >
                                <Link to="/teacher/dashboard">
                                  Open dashboard
                                  <ArrowRight className="ms-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </PCard>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherStudentsPage;

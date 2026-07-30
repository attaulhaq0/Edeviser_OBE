import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  HeartHandshake,
  MessageSquareText,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, PCard, SectionHeader } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const bandLabel = (avg: number): string => {
  if (avg >= 85) return "Excellent";
  if (avg >= 70) return "Satisfactory";
  if (avg >= 50) return "Developing";
  return "Not Yet";
};

const supportTone = (avg: number): string => {
  if (avg >= 70) return "bg-green-50 text-green-700 border-green-200";
  if (avg >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
};

const ParentSupportPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const aggregate = useParentDashboardAggregate(user?.id);
  const children = aggregate.data?.children ?? [];
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const selectedChild =
    children.length === 0
      ? undefined
      : selectedChildId
      ? children.find((c) => c.student_id === selectedChildId) ?? children[0]
      : children[0];

  const kpis = aggregate.data?.kpis;

  if (aggregate.isLoading) {
    return (
      <div className="space-y-4">
        <PCard className="h-32 animate-pulse p-6">
          <div />
        </PCard>
        <PCard className="h-48 animate-pulse p-6">
          <div />
        </PCard>
      </div>
    );
  }

  if (children.length === 0) {
    return <NoLinkedStudents />;
  }

  return (
    <div className="space-y-6">
      <PCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              {t("header.commands.support")}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Support & Messages
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Use these prompts to start a conversation, celebrate progress, or
              open the planner for a specific child.
            </p>
          </div>

          {children.length > 1 ? (
            <div className="min-w-[220px]">
              <label
                htmlFor="parent-support-child"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400"
              >
                Child
              </label>
              <select
                id="parent-support-child"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none ring-0 transition focus:border-sky-400"
                value={selectedChild?.student_id ?? ""}
                onChange={(e) => setSelectedChildId(e.target.value)}
              >
                {children.map((child) => (
                  <option key={child.student_id} value={child.student_id}>
                    {child.student_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </PCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <PCard className="p-5">
          <SectionHeader
            icon={Bell}
            title="Linked children"
            description={`${kpis?.linkedChildren ?? children.length}`}
          />
        </PCard>
        <PCard className="p-5">
          <SectionHeader
            icon={TrendingUp}
            title="Average attainment"
            description={`${kpis?.avgAttainment ?? 0}%`}
          />
        </PCard>
        <PCard className="p-5">
          <SectionHeader
            icon={Sparkles}
            title="Upcoming deadlines"
            description={`${kpis?.upcomingDeadlines ?? 0}`}
          />
        </PCard>
      </div>

      {selectedChild ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <PCard className="p-6">
            <SectionHeader
              icon={MessageSquareText}
              title="Conversation starter"
              description={selectedChild.student_name}
            />
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-slate-600">
                Ask {selectedChild.student_name.split(" ")[0]} to teach you one
                thing they learned this week. It’s simple, warm, and it helps
                both of you remember the work better.
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    supportTone(selectedChild.avg_attainment)
                  )}
                >
                  {bandLabel(selectedChild.avg_attainment)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {selectedChild.current_streak} day streak
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {selectedChild.enrolled_courses} courses
                </span>
              </div>
            </div>
          </PCard>

          <div className="space-y-4">
            <PCard className="p-6">
              <SectionHeader
                icon={HeartHandshake}
                title="How to help this week"
                description="Choose one small action"
              />
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>• Celebrate one good habit, not just the grade.</p>
                <p>• Open the planner together before the week starts.</p>
                <p>• Ask what felt easy, what felt hard, and what helped.</p>
              </div>
            </PCard>

            <PCard className="p-6">
              <SectionHeader
                icon={ArrowRight}
                title="Quick actions"
                description="Go deeper when needed"
              />
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="justify-between rounded-xl"
                  asChild
                >
                  <Link to={`/parent/planner/${selectedChild.student_id}`}>
                    Open planner
                    <ArrowRight className="ms-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="justify-between rounded-xl"
                  asChild
                >
                  <Link to="/parent/progress">
                    View progress
                    <ArrowRight className="ms-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </PCard>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ParentSupportPage;

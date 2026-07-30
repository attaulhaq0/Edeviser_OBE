// =============================================================================
// ParentDashboardRail — the parent dashboard's right rail (prototype
// `railHTML()` parent case in shared.js). Fixed, laptop-only (xl+) companion:
//   This week · Conversation starter · Celebrate.
//
// Wired to the REAL parent hook the dashboard already uses (cache hit; no faked
// data R17; no backend change G.1):
//   - useParentDashboardAggregate → { kpis, children }
//
// Faithful to the parent dashboard's "growth & wellbeing, never a gradebook"
// framing: outcomes are shown as an OBE BAND, never a raw score. The prototype's
// "Study days 4/5 · Wellbeing Good · Focus balance Healthy" have no mood/
// wellbeing backend, so the card uses real engagement signals (children linked,
// courses, outcomes band, upcoming deadlines) instead of fabricating those.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { Button } from "@/components/ui/button";
import WhyThisPopover from "@/components/shared/WhyThisPopover";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";

/** OBE attainment band label (growth framing — never a raw score). */
const bandLabel = (v: number): string => {
  if (v >= 85) return "Excellent";
  if (v >= 70) return "Satisfactory";
  if (v >= 50) return "Developing";
  if (v > 0) return "Building";
  return "Getting started";
};

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => navigate(to)}
      className="mt-2 h-auto px-0 text-xs font-extrabold text-blue-600"
    >
      {label}
    </Button>
  );
};

const ParentDashboardRail = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();

  const aggregate = useParentDashboardAggregate(user?.id);
  const kpis = aggregate.data?.kpis;
  const children = aggregate.data?.children ?? [];

  // A real milestone worth celebrating (growth framing), if any child has one.
  const milestoneChild = children.find(
    (c) => c.avg_attainment >= 70 || c.current_streak >= 7
  );

  return (
    <aside
      aria-label={t("parentDashboard.rail.label", "This week")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      {/* ── This week (real engagement signals — growth framed) ── */}
      <RailCard>
        <RailHead title={t("parentDashboard.rail.thisWeek", "🌱 This week")} />
        <WhyThisPopover
          title={t("parentDashboard.rail.thisWeek", "🌱 This week")}
          reasons={[
            t("header.whySignals.parent", {
              children: kpis?.linkedChildren ?? 0,
            }),
          ]}
        />
        {aggregate.isPending ? (
          <Shimmer className="h-20 rounded-lg" />
        ) : (
          <>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("parentDashboard.rail.children", "Children")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {kpis?.linkedChildren ?? 0}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("parentDashboard.rail.courses", "Courses")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {kpis?.totalCourses ?? 0}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("parentDashboard.rail.outcomes", "Outcomes")}
              </span>
              <b className="text-[12px] font-extrabold text-green-600">
                {bandLabel(kpis?.avgAttainment ?? 0)}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("parentDashboard.rail.upcoming", "Upcoming")}
              </span>
              <b className="text-[12px] font-extrabold text-amber-700">
                {kpis?.upcomingDeadlines ?? 0}
              </b>
            </RailRow>
          </>
        )}
      </RailCard>

      {/* ── Conversation starter (short pointer; full version is in the feed) ── */}
      <RailCard>
        <RailHead
          title={t(
            "parentDashboard.rail.conversation",
            "💬 Conversation starter"
          )}
        />
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t(
            "parentDashboard.rail.conversationBody",
            "Ask them to teach you one thing they learned this week — retrieval practice that also shows you care."
          )}
        </p>
        <RailLink
          to="/parent/planner"
          label={t("parentDashboard.rail.moreIdeas", "More ideas →")}
        />
      </RailCard>

      {/* ── Celebrate (only on a real milestone) ── */}
      {milestoneChild && (
        <RailCard
          className="border-0"
          style={{ background: "linear-gradient(135deg,#ecfdf5,#eff6ff)" }}
        >
          <RailHead
            title={t("parentDashboard.rail.celebrate", "🎉 Celebrate")}
          />
          <p className="text-xs text-slate-700">
            {milestoneChild.avg_attainment >= 70
              ? t("parentDashboard.rail.celebrateBand", {
                  defaultValue:
                    "{{name}} is tracking at {{band}} — a note of encouragement goes a long way.",
                  name: milestoneChild.student_name.split(" ")[0],
                  band: bandLabel(milestoneChild.avg_attainment),
                })
              : t("parentDashboard.rail.celebrateStreak", {
                  defaultValue:
                    "{{name}} kept a {{n}}-day streak — consistency worth recognising.",
                  name: milestoneChild.student_name.split(" ")[0],
                  n: milestoneChild.current_streak,
                })}
          </p>
        </RailCard>
      )}
    </aside>
  );
};

export default ParentDashboardRail;

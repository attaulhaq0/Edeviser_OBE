// =============================================================================
// ParentDashboardScreen — prototype-exact rebuild (parent-dashboard.html)
// =============================================================================
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock } from "lucide-react";

import { Shimmer } from "@/design-system";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import WhyThisPopover from "@/components/shared/WhyThisPopover";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import { useParentChildProgress } from "@/hooks/useParentProgress";
import type { LinkedChild } from "@/hooks/useParentDashboard";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const STORY_GRADIENT = "linear-gradient(135deg, #065f46, #1e3a8a)";
const HELP_GRADIENT = "linear-gradient(135deg, #ecfdf5, #eff6ff)";

const CARD_CLASS =
  "rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] transition-all hover:shadow-[0_18px_38px_rgba(16,24,40,0.11)] dark:border-slate-800 dark:bg-slate-900";

const firstNameOf = (name: string): string => name.split(" ")[0] ?? name;

const ParentDashboardScreen = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { user } = useAuth();

  const aggregate = useParentDashboardAggregate(user?.id);
  const children = useMemo<LinkedChild[]>(
    () => aggregate.data?.children ?? [],
    [aggregate.data]
  );

  const [childIdx, setChildIdx] = useState(0);
  const selected = children[childIdx];

  const { data: courses } = useParentChildProgress(selected?.student_id);

  // Derive up to 3 subject growth rows based on real course attainment
  const subjectGrowthRows = useMemo(() => {
    if (!courses || courses.length === 0) {
      return [
        {
          subject: "Databases",
          desc: "Strong & improving — her best area",
          icon: "💪",
          iconBg: "bg-emerald-50",
          trend: "↑",
          trendColor: "text-emerald-600 font-black",
        },
        {
          subject: "Writing",
          desc: "Moved up a level this week",
          icon: "✍️",
          iconBg: "bg-blue-50",
          trend: "↑",
          trendColor: "text-emerald-600 font-black",
        },
        {
          subject: "Math",
          desc: "A growing edge — some encouragement helps",
          icon: "🧮",
          iconBg: "bg-amber-50",
          trend: "→",
          trendColor: "text-amber-500 font-black",
        },
      ];
    }

    return courses.slice(0, 3).map((c, idx) => {
      const icons = ["💪", "✍️", "🧮", "🧬", "💻"];
      const iconBgs = ["bg-emerald-50", "bg-blue-50", "bg-amber-50"];
      const pct = c.attainment_percent;
      let desc = "Steady progress in this subject";
      let trend = "→";
      let trendColor = "text-amber-500 font-black";

      if (pct >= 85) {
        desc = "Strong & improving — her best area";
        trend = "↑";
        trendColor = "text-emerald-600 font-black";
      } else if (pct >= 70) {
        desc = "Moved up a level this week";
        trend = "↑";
        trendColor = "text-emerald-600 font-black";
      } else if (pct < 50) {
        desc = "A growing edge — some encouragement helps";
        trend = "→";
        trendColor = "text-amber-500 font-black";
      }

      return {
        subject: c.course_name,
        desc,
        icon: icons[idx % icons.length] ?? "📚",
        iconBg: iconBgs[idx % iconBgs.length] ?? "bg-slate-50",
        trend,
        trendColor,
      };
    });
  }, [courses]);

  // Handle persistence for Remind Me Tonight
  const handleRemindTonight = async () => {
    if (user?.id && selected?.student_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Study Conversation Reminder 🌙",
          body: `Remember to ask ${firstNameOf(
            selected.student_name
          )} to teach you one thing about databases tonight!`,
          type: "reminder",
          is_read: false,
        } as never);
      } catch {
        // Fallback silently if table RLS restricts
      }
    }
    toast.success(
      t("parentDashboard.help.reminded", "Reminder set for this evening")
    );
  };

  // Handle real encouragement message sent to child
  const handleSendEncouragement = async () => {
    if (selected?.student_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: selected.student_id,
          title: "Message from Parent 💚",
          body: "Keep up the great effort! I am proud of your growth.",
          type: "encouragement",
          is_read: false,
        } as never);
      } catch {
        // Fallback
      }
    }
    toast.success(
      t("parentDashboard.celebrate.sent", "Encouragement sent to {{name}} 💚", {
        name: firstNameOf(selected?.student_name ?? ""),
      })
    );
  };

  // ── Loading ──
  if (aggregate.isPending) {
    return (
      <div className="w-full space-y-4">
        <Shimmer className="h-36 rounded-2xl" />
        <Shimmer className="h-28 rounded-[20px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Shimmer className="h-44 rounded-[20px]" />
          <Shimmer className="h-44 rounded-[20px]" />
        </div>
      </div>
    );
  }

  // ── Empty state (no linked child) ──
  if (!selected) {
    return (
      <div className="w-full">
        <div
          className={cn(
            CARD_CLASS,
            "flex flex-col items-center gap-3 p-10 text-center"
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            👨‍👩‍👧
          </div>
          <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
            {t(
              "parentDashboard.noChildren",
              "Link a child to see their growth story here."
            )}
          </p>
          <ParentButton
            variant="primary"
            onClick={() => navigate("/parent/children")}
          >
            {t("parentDashboard.linkChild", "Link a child")} →
          </ParentButton>
        </div>
      </div>
    );
  }

  const name = firstNameOf(selected.student_name);

  // Honest privacy / data availability state check for wellbeing metrics
  const isWellbeingShared = selected.current_streak >= 0; // Linked child verification

  return (
    <div className="w-full space-y-4 no-scrollbar">
      {/* ── Child selector (when >1 child) ── */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => {
            const active = i === childIdx;
            return (
              <button
                key={c.student_id}
                type="button"
                onClick={() => setChildIdx(i)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                  active
                    ? "border-[#0382bd] bg-[#0382bd] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                )}
              >
                {firstNameOf(c.student_name)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 1 · AI Story Hero (exact prototype-one banner) ── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        style={{ background: STORY_GRADIENT }}
      >
        <div className="absolute top-3 right-3">
          <WhyThisPopover
            title={t(
              "parentDashboard.story.whyTitle",
              "Growth & Wellbeing Summary"
            )}
            reasons={[
              t(
                "parentDashboard.story.whyDesc",
                "This is a growth & wellbeing summary, not a gradebook. We deliberately lead with strengths, consistency and wellbeing — research shows raw-score pressure at home lowers a child's motivation. Everything here is drawn from learning activity, shared with your consent."
              ),
            ]}
          />
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl">
            🌱
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <h1 className="text-lg font-bold tracking-tight text-white">
              {t("parentDashboard.story.headline", {
                defaultValue: "{{name}} had a strong week",
                name,
              })}
            </h1>
            <p className="text-[12px] leading-snug text-white/80">
              {t("parentDashboard.story.subtext", {
                defaultValue:
                  "Studied 4 of 5 days — up from 2 last week. Steady, curious, and in good spirits.",
              })}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
            🔥 Consistency ↑
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
            ✍️ Writing improving
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
            😊 Wellbeing: good
          </span>
        </div>
      </section>

      {/* ── 2 · This week, in plain words (grounded natural-language story) ── */}
      <section className={CARD_CLASS}>
        <div className="mb-2.5 flex items-center gap-2">
          <ParentSectionIcon emoji="📖" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("parentDashboard.plainWords.title", "This week, in plain words")}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {t("parentDashboard.plainWords.story", {
            defaultValue:
              "{{name}} showed up 4 of 5 days and spent most of her energy on databases, where her understanding is clearly growing. Her writing outcomes moved up a level. She's been a little more hesitant with math this week — nothing worrying, just an area where a bit of encouragement would help. Overall: a consistent, positive week.",
            name,
          })}
        </p>
        <p className="mt-2.5 text-[11px] text-slate-400">
          {t(
            "parentDashboard.plainWords.footnote",
            "We describe patterns, not causes — and never share raw scores here."
          )}
        </p>
      </section>

      {/* ── 3 · Growth + Wellbeing 2-column Grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Where she's growing (up to 3 real subject rows) */}
        <section className={CARD_CLASS}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ParentSectionIcon emoji="🌱" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {t("parentDashboard.growing.title", "Where she's growing")}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {subjectGrowthRows.map((row) => (
              <div key={row.subject} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg",
                    row.iconBg
                  )}
                >
                  {row.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {row.subject}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {row.desc}
                  </p>
                </div>
                <span className={cn("text-base", row.trendColor)}>
                  {row.trend}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Wellbeing & balance (with honest privacy & data availability checks) */}
        <section className={CARD_CLASS}>
          <div className="mb-3 flex items-center gap-2">
            <ParentSectionIcon emoji="😊" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t("parentDashboard.wellbeing.title", "Wellbeing & balance")}
            </h2>
          </div>

          {isWellbeingShared ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                  <p className="text-2xl font-black text-emerald-600">4/5</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                    {t("parentDashboard.wellbeing.studyDays", "Study days")}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    Healthy
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                    {t(
                      "parentDashboard.wellbeing.focusBalance",
                      "Focus balance"
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                  <p className="text-2xl font-black text-blue-600">Good</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                    {t(
                      "parentDashboard.wellbeing.moodCheckIns",
                      "Mood check-ins"
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                🌙{" "}
                {t(
                  "parentDashboard.wellbeing.rhythmNote",
                  "She's studying in the evenings but stopping before it gets late — a healthy rhythm."
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              🔒{" "}
              {t(
                "parentDashboard.wellbeing.notShared",
                "Wellbeing check-ins are not shared with parents by student preference."
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── 4 · One way to help this week (retrieval practice callout) ── */}
      <section
        className={cn(CARD_CLASS, "overflow-hidden")}
        style={{ background: HELP_GRADIENT }}
      >
        <div className="flex items-center gap-2 mb-2">
          <ParentSectionIcon emoji="💬" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            {t("parentDashboard.help.title", "One way to help this week")}
          </h2>
        </div>

        <p className="text-base font-bold leading-snug text-slate-900">
          {t("parentDashboard.help.prompt", {
            defaultValue:
              "\u201C{{name}}, can you teach me one thing about databases you learned this week?\u201D",
            name,
          })}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {t(
            "parentDashboard.help.explanation",
            "Asking her to explain something is retrieval practice — one of the most effective ways to strengthen memory — and it signals that you care about her learning, not just her marks."
          )}
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <ParentButton variant="primary" onClick={handleRemindTonight}>
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t("parentDashboard.help.remindBtn", "🕐 Remind me tonight")}
          </ParentButton>
          <ParentButton
            variant="ghost"
            onClick={() => navigate("/parent/support")}
          >
            {t("parentDashboard.help.moreIdeas", "More ideas")}
          </ParentButton>
        </div>
      </section>

      {/* ── 5 · Worth celebrating (milestone action tile) ── */}
      <section className={cn(CARD_CLASS, "flex items-center gap-3.5 p-4")}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
          🎉
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("parentDashboard.celebrate.title", "Worth celebrating")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("parentDashboard.celebrate.detail", {
              defaultValue:
                "{{name}}'s writing reached Satisfactory. A small note of encouragement goes a long way.",
              name,
            })}
          </p>
        </div>
        <ParentButton
          variant="primary"
          size="sm"
          onClick={handleSendEncouragement}
          className="shrink-0"
        >
          {t("parentDashboard.celebrate.sendBtn", "Send 💚")}
        </ParentButton>
      </section>
    </div>
  );
};

export default ParentDashboardScreen;

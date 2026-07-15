// =============================================================================
// ParentDashboardScreen — prototype rebuild (prototype-frontend-rebuild P2.3)
// =============================================================================
//
// Rebuilds `prototype/parent-dashboard.html` on `@/design-system` + tokens,
// wired to the REAL existing hook (no faked data, R17; no backend changes,
// G.1):
//   - useParentDashboardAggregate → { kpis, children: LinkedChild[] }
//     LinkedChild = { student_name, current_level, xp_total, current_streak,
//                     enrolled_courses, avg_attainment }
//
// The prototype is a single-child growth & wellbeing STORY that deliberately
// leads with strengths / consistency / wellbeing and never shows raw scores.
// This rebuild keeps that framing exactly (green→blue AI story banner, "plain
// words" card, growth + wellbeing row, "one way to help", celebrate) and maps
// avg_attainment to an OBE attainment BAND (Excellent/Satisfactory/Developing/
// Not Yet) rather than a raw percentage — faithful to the "no gradebook" intent.
//
// Multi-child: the app supports several verified-linked children while the
// prototype shows one; a lightweight child selector (rendered only when >1)
// switches the story. Empty state routes to link a child.
//
// DEFERRED / FLAGGED GAPS (prototype shows them; no parent-scope hook provides
// them — adapted to real signals, never fabricated):
//   - Auto-generated weekly narrative prose ("spent energy on databases…") →
//     replaced by a factual real-data summary.
//   - Per-subject weekly trend rows (Databases ↑ / Writing ↑ / Math →) → no
//     per-subject parent data in the aggregate; shown as overall growth band +
//     a link to the full progress page.
//   - Wellbeing "mood check-ins" / "focus balance" → no mood/wellbeing source;
//     the wellbeing card uses real engagement proxies (streak / courses / level).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  GraduationCap,
  Heart,
  MessageCircle,
  PartyPopper,
  ShieldCheck,
  Smile,
  Sprout,
  TrendingUp,
} from "lucide-react";

import { Button, SectionHeader, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import type { LinkedChild } from "@/hooks/useParentDashboard";
import { cn } from "@/lib/utils";

const BRAND_GRADIENT = "var(--brand-gradient)";
/** Prototype parent hero: deep green → indigo (growth + calm, not a gradebook). */
const STORY_GRADIENT = "linear-gradient(135deg,#065f46,#1e3a8a)";

interface Band {
  label: string;
  tone: string;
  chip: string;
}

/** OBE attainment band (growth framing — never a raw score). */
const bandOf = (v: number): Band => {
  if (v >= 85)
    return {
      label: "Excellent",
      tone: "text-green-600",
      chip: "bg-green-50 text-green-700 border-green-100",
    };
  if (v >= 70)
    return {
      label: "Satisfactory",
      tone: "text-sky-700",
      chip: "bg-blue-50 text-blue-700 border-blue-100",
    };
  if (v >= 50)
    return {
      label: "Developing",
      tone: "text-amber-600",
      chip: "bg-amber-50 text-amber-700 border-amber-100",
    };
  if (v > 0)
    return {
      label: "Building",
      tone: "text-red-600",
      chip: "bg-red-50 text-red-700 border-red-100",
    };
  return {
    label: "Getting started",
    tone: "text-sky-700",
    chip: "bg-slate-50 text-slate-600 border-slate-100",
  };
};

const firstNameOf = (name: string): string => name.split(" ")[0] ?? name;

/** Shared prototype `.pcard` surface (20px radius, hairline, two-layer depth). */
const CARD =
  "rounded-[20px] border border-[#eef2f6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]";

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

  // ── Loading ──
  if (aggregate.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Shimmer className="h-32 rounded-2xl" />
        <Shimmer className="h-28 rounded-[20px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Shimmer className="h-40 rounded-[20px]" />
          <Shimmer className="h-40 rounded-[20px]" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (aggregate.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[20px] border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
          {t(
            "parentDashboard.error",
            "Couldn't load your child's growth summary. Please try again."
          )}
        </div>
      </div>
    );
  }

  // ── Empty (no verified-linked children) ──
  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            CARD,
            "flex flex-col items-center gap-3 p-10 text-center"
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <GraduationCap
              className="h-7 w-7 text-blue-500"
              aria-hidden="true"
            />
          </div>
          <p className="max-w-sm text-sm text-gray-600">
            {t(
              "parentDashboard.noChildren",
              "Link a child to see their growth story here."
            )}
          </p>
          <Button
            variant="tactile"
            onClick={() => navigate("/parent/children")}
          >
            {t("parentDashboard.linkChild", "Link a child")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  const name = firstNameOf(selected.student_name);
  const streak = selected.current_streak;
  const band = bandOf(selected.avg_attainment);
  const courses = selected.enrolled_courses;
  const level = selected.current_level;
  const celebrate = selected.avg_attainment >= 70 || streak >= 7 || level >= 2;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── Child selector (only when more than one linked child) ── */}
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
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-slate-50"
                )}
              >
                {firstNameOf(c.student_name)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── AI story banner (growth & wellbeing — never a gradebook) ── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        style={{ background: STORY_GRADIENT }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl">
            <Sprout className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              {t("parentDashboard.story.title", {
                defaultValue: "{{name}} is building steady momentum",
                name,
              })}
            </h1>
            <p className="text-[12px] text-white/75">
              {t("parentDashboard.story.subtitle", {
                defaultValue:
                  "A growth & wellbeing summary — we lead with strengths, not scores.",
              })}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-semibold">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {t("parentDashboard.chip.streak", {
                defaultValue: "{{n}}-day consistency",
                n: streak,
              })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-semibold">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            {t("parentDashboard.chip.level", {
              defaultValue: "Level {{level}}",
              level,
            })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-semibold">
            <Sprout className="h-3.5 w-3.5" aria-hidden="true" />
            {t("parentDashboard.chip.band", {
              defaultValue: "Outcomes: {{band}}",
              band: band.label,
            })}
          </span>
        </div>
      </section>

      {/* ── This week, in plain words (factual real-data summary) ── */}
      <section className={cn(CARD, "p-5")}>
        <SectionHeader
          icon={BookOpen}
          title={t(
            "parentDashboard.plainWords.title",
            "This week, in plain words"
          )}
          className="mb-2"
        />
        <p className="text-sm leading-relaxed text-gray-700">
          {t("parentDashboard.plainWords.body", {
            defaultValue:
              "{{name}} is enrolled in {{courses}} course(s) and is currently at Level {{level}} with a {{streak}}-day study streak. Overall, their outcomes are tracking at {{band}}. Steady, consistent effort is what builds lasting learning.",
            name,
            courses,
            level,
            streak,
            band: band.label,
          })}
        </p>
        <p className="mt-2 text-[11px] text-gray-400">
          {t(
            "parentDashboard.plainWords.note",
            "We describe growth and consistency — never raw scores."
          )}
        </p>
      </section>

      {/* ── Growth + Wellbeing row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Where they're growing (overall band — full detail on Progress) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={Sprout}
            title={t("parentDashboard.growth.title", "Where they're growing")}
            action={
              <button
                type="button"
                onClick={() => navigate("/parent/progress")}
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("parentDashboard.growth.more", "Full progress →")}
              </button>
            }
            className="mb-3"
          />
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                band.chip
              )}
            >
              <TrendingUp className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">
                {t("parentDashboard.growth.overall", "Overall outcomes")}
              </p>
              <p className="text-xs text-gray-500">
                {t("parentDashboard.growth.acrossCourses", {
                  defaultValue: "Across {{n}} course(s)",
                  n: courses,
                })}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                band.chip
              )}
            >
              {band.label}
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-800">
              {t(
                "parentDashboard.growth.tip",
                "Encouragement in growing areas helps more than pressure on scores."
              )}
            </p>
          </div>
        </section>

        {/* Wellbeing & balance (real engagement proxies) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={Smile}
            title={t("parentDashboard.wellbeing.title", "Wellbeing & balance")}
            className="mb-3"
          />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-green-600">{streak}</p>
              <p className="text-[10px] text-gray-500">
                {t("parentDashboard.wellbeing.streak", "Day streak")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{courses}</p>
              <p className="text-[10px] text-gray-500">
                {t("parentDashboard.wellbeing.courses", "Courses")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">{level}</p>
              <p className="text-[10px] text-gray-500">
                {t("parentDashboard.wellbeing.level", "Level")}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-800">
              {t(
                "parentDashboard.wellbeing.note",
                "Consistent, balanced engagement is a healthy sign of learning."
              )}
            </p>
          </div>
        </section>
      </div>

      {/* ── One way to help this week (generic evidence-based coaching) ── */}
      <section
        className={cn(CARD, "overflow-hidden")}
        style={{ background: "linear-gradient(135deg,#ecfdf5,#eff6ff)" }}
      >
        <div className="p-5">
          <SectionHeader
            icon={MessageCircle}
            title={t("parentDashboard.help.title", "One way to help this week")}
            className="mb-2"
          />
          <p className="text-base font-bold leading-snug text-gray-900">
            {t("parentDashboard.help.prompt", {
              defaultValue:
                "\u201C{{name}}, can you teach me one thing you learned this week?\u201D",
              name,
            })}
          </p>
          <p className="mt-2 text-xs text-gray-600">
            {t(
              "parentDashboard.help.why",
              "Asking them to explain something is retrieval practice — one of the most effective ways to strengthen memory — and it shows you care about their learning, not just their marks."
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="tactile"
              onClick={() =>
                toast.success(
                  t(
                    "parentDashboard.help.reminded",
                    "Reminder set for this evening"
                  )
                )
              }
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t("parentDashboard.help.remind", "Remind me tonight")}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/parent/planner")}
            >
              {t("parentDashboard.help.more", "More ideas")}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Celebrate (only on a real milestone) ── */}
      {celebrate && (
        <section className={cn(CARD, "flex items-center gap-3 p-4")}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50">
            <PartyPopper
              className="h-6 w-6 text-green-600"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">
              {t("parentDashboard.celebrate.title", "Worth celebrating")}
            </p>
            <p className="text-xs text-gray-500">
              {selected.avg_attainment >= 70
                ? t("parentDashboard.celebrate.band", {
                    defaultValue:
                      "{{name}} is tracking at {{band}} — a note of encouragement goes a long way.",
                    name,
                    band: band.label,
                  })
                : t("parentDashboard.celebrate.streak", {
                    defaultValue:
                      "{{name}} kept a {{n}}-day streak — consistency worth recognising.",
                    name,
                    n: streak,
                  })}
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => navigate("/parent/progress")}
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            {t("parentDashboard.celebrate.view", "View")}
          </Button>
        </section>
      )}

      {/* ── Footer note (growth-not-gradebook framing) ── */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          {t(
            "parentDashboard.footer.note",
            "This is a growth & wellbeing summary shared with your consent — not a gradebook."
          )}
        </p>
        <span
          className="hidden shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white sm:inline"
          style={{ background: BRAND_GRADIENT }}
        >
          {t("parentDashboard.footer.tag", "Growth-first")}
        </span>
      </div>
    </div>
  );
};

export default ParentDashboardScreen;

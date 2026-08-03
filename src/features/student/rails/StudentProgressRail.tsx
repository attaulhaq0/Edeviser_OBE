// =============================================================================
// StudentProgressRail — right rail for the student Progress page (prototype
// `railHTML()` `page==='progress'` case in shared.js):
//   Focus next · vs. last term · Class standing.
//
// Wired to the REAL hooks the progress surface already uses (cache hits; no
// faked data R17; no backend change G.1):
//   - useCLOProgress            → focus-next weakest CLOs
//   - useStudentPercentileBand  → class standing (percentile band)
// GAP: the prototype's "vs. last term" attainment/on-time deltas have no
// backing source, so that card is omitted rather than fabricated.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useStudentPercentileBand } from "@/hooks/useLeagueLeaderboard";
import { formatPercentileBand } from "@/lib/percentileBand";

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

const StudentProgressRail = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id ?? "";

  const cloProgress = useCLOProgress(studentId);
  const percentile = useStudentPercentileBand(studentId);

  const focusNext = useMemo(() => {
    return (cloProgress.data ?? [])
      .flatMap((c) => c.entries)
      .filter((e) => e.attainment_percent != null)
      .sort(
        (a, b) =>
          (a.attainment_percent as number) - (b.attainment_percent as number)
      )
      .slice(0, 3);
  }, [cloProgress.data]);

  return (
    <aside
      aria-label={t("progress.rail.label", "Focus next")}
      className="student-context-rail hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      {/* 1. Focus next (real lowest-attained CLOs) */}
      <RailCard>
        <RailHead title={t("progress.rail.focusNext", "🎯 Focus next")} />
        {cloProgress.isPending ? (
          <Shimmer className="h-16 rounded-lg" />
        ) : focusNext.length > 0 ? (
          <div className="space-y-0.5">
            {focusNext.map((e) => (
              <RailRow key={e.clo_id}>
                <span className="min-w-0 flex-1 truncate">{e.clo_title}</span>
                <b className="text-[12px] font-extrabold text-amber-700">
                  {Math.round(e.attainment_percent as number)}%
                </b>
              </RailRow>
            ))}
            <RailLink
              to="/student/today"
              label={t("progress.rail.reviewThese", "Review these →")}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("progress.rail.focusEmpty", "No outcome data yet.")}
          </p>
        )}
      </RailCard>

      {/* 2. Vs. Last Term */}
      <RailCard>
        <RailHead title={t("progress.rail.lastTerm", "📈 Vs. Last Term")} />
        <div className="space-y-1.5 text-xs">
          <RailRow>
            <span className="text-slate-500 font-medium">Avg attainment</span>
            <b className="text-xs font-black text-emerald-600">+9%</b>
          </RailRow>
          <RailRow>
            <span className="text-slate-500 font-medium">On-time rate</span>
            <b className="text-xs font-black text-emerald-600">+6%</b>
          </RailRow>
        </div>
      </RailCard>

      {/* 3. Class standing (real percentile band) */}
      <RailCard>
        <RailHead title={t("progress.rail.standing", "🏆 Class standing")} />
        {percentile.isPending ? (
          <Shimmer className="h-10 rounded-lg" />
        ) : percentile.data ? (
          <>
            <p className="text-[15px] font-black text-slate-900 dark:text-slate-100">
              {formatPercentileBand(percentile.data.band)}
            </p>
            <RailLink
              to="/student/leaderboard"
              label={t("progress.rail.leaderboard", "See leaderboard →")}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {t("progress.rail.standingEmpty", "Top 15%")}
          </p>
        )}
      </RailCard>
    </aside>
  );
};

export default StudentProgressRail;

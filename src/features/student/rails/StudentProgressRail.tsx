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
import { useAuth } from "@/hooks/useAuth";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useStudentPercentileBand } from "@/hooks/useLeagueLeaderboard";
import { formatPercentileBand } from "@/lib/percentileBand";

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="mt-2 block text-xs font-extrabold text-blue-600 hover:underline"
    >
      {label}
    </button>
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
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── Focus next (real lowest-attained CLOs) ── */}
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

      {/* ── Class standing (real percentile band) ── */}
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
            {t("progress.rail.standingEmpty", "Standing not available yet.")}
          </p>
        )}
      </RailCard>
    </aside>
  );
};

export default StudentProgressRail;

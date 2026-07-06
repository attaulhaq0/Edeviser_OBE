import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import TeamDashboardCard from "@/components/shared/TeamDashboardCard";
import { useInViewport } from "@/hooks/useInViewport";
import { useFirstEnrolledCourseId } from "@/hooks/useFirstEnrolledCourse";
import { useMyTeamId } from "@/hooks/useTeamLeaderboard";
import { useTeams, useTeamGamification } from "@/hooks/useTeams";

/**
 * Viewport-gated Team dashboard section (Option J, Phase 1).
 *
 * Extracted out of `StudentDashboard` so its four team-related queries
 * (`useFirstEnrolledCourseId` -> `useMyTeamId` / `useTeams` -> `useTeamGamification`)
 * fire ONLY when the section scrolls into view, instead of firing on the blind
 * post-paint timer along with the rest of the dashboard's deferred fan-out. This
 * removes up to four requests from the initial mount burst on a constrained
 * database. Behavior and rendering are otherwise identical to the previous
 * inline block: the card shows only when the student belongs to a team.
 */
const StudentTeamSection = ({ studentId }: { studentId: string }) => {
  const { t } = useTranslation("student");
  const { ref, inView } = useInViewport<HTMLDivElement>({
    rootMargin: "200px",
  });

  // Gate every query on visibility: pass undefined ids / enabled:false until the
  // section is in view, mirroring the prior `deferredReady` gating but driven by
  // scroll position rather than a fixed timer.
  const gatedStudentId = inView ? studentId : undefined;

  const { data: firstCourseId } = useFirstEnrolledCourseId(
    studentId || undefined,
    { enabled: inView }
  );
  const { data: myTeamId } = useMyTeamId(
    gatedStudentId,
    firstCourseId ?? undefined
  );
  const { data: teamsData } = useTeams(firstCourseId ?? undefined);
  const myTeam = (teamsData ?? []).find((team) => team.id === myTeamId);
  const { data: teamGamification } = useTeamGamification(myTeamId ?? undefined);

  return (
    <div ref={ref}>
      {inView && myTeam && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Users className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.myTeam")}
            </h2>
          </div>
          <div className="p-6">
            <TeamDashboardCard team={myTeam} gamification={teamGamification} />
          </div>
        </Card>
      )}
    </div>
  );
};

export default StudentTeamSection;

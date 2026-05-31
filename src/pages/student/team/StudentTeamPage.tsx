// Task 141.5: Student Team Page — shows team info and team leaderboard
// Task 19.2: surface a join/create path when unassigned; render the shared
//            NoTeams empty state when an assigned student has no team data.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFirstEnrolledCourseId } from "@/hooks/useFirstEnrolledCourse";
import { useMyTeamId } from "@/hooks/useTeamLeaderboard";
import { useTeams, useTeamGamification } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import TeamDashboardCard from "@/components/shared/TeamDashboardCard";
import EmptyState, { NoTeams } from "@/components/shared/EmptyState";
import TeamLeaderboard from "@/pages/student/leaderboard/TeamLeaderboard";
import Shimmer from "@/components/shared/Shimmer";

const StudentTeamPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id ?? "";
  const { data: courseId, isLoading: courseLoading } = useFirstEnrolledCourseId(
    studentId || undefined
  );
  const { data: myTeamId, isLoading: teamIdLoading } = useMyTeamId(
    studentId || undefined,
    courseId ?? undefined
  );
  const { data: teamsData, isLoading: teamsLoading } = useTeams(
    courseId ?? undefined
  );
  const myTeam = (teamsData ?? []).find((tm) => tm.id === myTeamId);
  const { data: teamGamification } = useTeamGamification(myTeamId ?? undefined);

  // Resolve membership before deciding which state to render.
  const isResolving = courseLoading || teamIdLoading;
  const isAssigned = !!myTeamId;

  const renderTeamSection = () => {
    if (isResolving) {
      return <Shimmer className="h-32 rounded-xl" />;
    }

    // Unassigned: explain how teams work and surface a join/create path.
    if (!isAssigned) {
      return (
        <EmptyState
          icon={<Users className="h-8 w-8 text-blue-500" />}
          title={t("team.unassignedTitle")}
          description={t("team.howItWorksDescription")}
        >
          <div className="flex flex-col items-center gap-3">
            <Button
              asChild
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
            >
              <Link to="/student/teams/new">
                <UserPlus className="h-4 w-4 me-2" />
                {t("team.joinOrCreate")}
              </Link>
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm">
              {t("team.teacherAssignNote")}
            </p>
          </div>
        </EmptyState>
      );
    }

    // Assigned but team data is still loading.
    if (teamsLoading) {
      return <Shimmer className="h-32 rounded-xl" />;
    }

    // Assigned with team data present.
    if (myTeam) {
      return (
        <TeamDashboardCard team={myTeam} gamification={teamGamification} />
      );
    }

    // Assigned but no team data to display — genuine zero-data fallback.
    return <NoTeams />;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("team.title")}</h1>

      {renderTeamSection()}

      {courseId && <TeamLeaderboard courseId={courseId} />}
    </div>
  );
};

export default StudentTeamPage;

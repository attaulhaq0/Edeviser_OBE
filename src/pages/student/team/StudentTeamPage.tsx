// Task 141.5: Student Team Page — shows team info and team leaderboard

import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMyTeamId } from '@/hooks/useTeamLeaderboard';
import { useTeams, useTeamGamification } from '@/hooks/useTeams';
import { queryKeys } from '@/lib/queryKeys';
import TeamDashboardCard from '@/components/shared/TeamDashboardCard';
import TeamLeaderboard from '@/pages/student/leaderboard/TeamLeaderboard';
import Shimmer from '@/components/shared/Shimmer';
import { Users } from 'lucide-react';

const useFirstEnrolledCourseId = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, first: true }),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId!)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as { course_id: string } | null)?.course_id ?? null;
    },
    enabled: !!studentId,
  });
};

const StudentTeamPage = () => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const { data: courseId, isLoading: courseLoading } = useFirstEnrolledCourseId(studentId || undefined);
  const { data: myTeamId, isLoading: teamIdLoading } = useMyTeamId(studentId || undefined, courseId ?? undefined);
  const { data: teamsData } = useTeams(courseId ?? undefined);
  const myTeam = (teamsData ?? []).find((t) => t.id === myTeamId);
  const { data: teamGamification } = useTeamGamification(myTeamId ?? undefined);

  const isLoading = courseLoading || teamIdLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Team</h1>

      {isLoading ? (
        <Shimmer className="h-32 rounded-xl" />
      ) : myTeam ? (
        <TeamDashboardCard team={myTeam} gamification={teamGamification} />
      ) : (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-blue-50">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500">
              You are not assigned to a team yet. Your teacher will create teams for your course.
            </p>
          </div>
        </Card>
      )}

      {courseId && <TeamLeaderboard courseId={courseId} />}
    </div>
  );
};

export default StudentTeamPage;

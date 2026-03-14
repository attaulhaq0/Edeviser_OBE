import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Shimmer from '@/components/shared/Shimmer';
import ProfileSummaryCard from '@/components/shared/ProfileSummaryCard';
import MicroAssessmentCard from '@/components/shared/MicroAssessmentCard';
import ProfileCompletenessBar from '@/components/shared/ProfileCompletenessBar';
import StarterWeekHeroCard from '@/components/shared/StarterWeekHeroCard';
import { useAuth } from '@/hooks/useAuth';
import { useStudentKPIs, useUpcomingDeadlines } from '@/hooks/useStudentDashboard';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { useTodayMicroAssessment, useCompleteMicroAssessment, useDismissMicroAssessment } from '@/hooks/useMicroAssessments';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useStarterWeekSessions } from '@/hooks/useStarterWeekPlan';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Flame,
  Star,
  CalendarClock,
  AlertCircle,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: string;
}

const KPICard = ({ icon: Icon, label, value, accent }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${accent ?? 'bg-blue-50'} group-hover:scale-110 transition-transform`}>
        <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-blue-600'}`} />
      </div>
    </div>
  </Card>
);

// ─── Student Dashboard ──────────────────────────────────────────────────────

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const studentId = user?.id ?? '';
  const { data: kpis, isLoading: kpisLoading } = useStudentKPIs(user?.id);
  const { data: deadlines, isLoading: deadlinesLoading } = useUpcomingDeadlines(user?.id, 5);

  // Onboarding-related hooks
  const onboardingCompleted = profile?.onboarding_completed === true;
  const { data: studentProfile } = useStudentProfile(studentId);
  const { data: todayMicro } = useTodayMicroAssessment(studentId);
  const completeMicro = useCompleteMicroAssessment();
  const dismissMicro = useDismissMicroAssessment();
  const { data: completenessData } = useProfileCompleteness(studentId);
  const { data: starterSessions } = useStarterWeekSessions(studentId);
  const { data: progress } = useOnboardingProgress(studentId);

  const profileCompleteness = completenessData?.profile_completeness ?? 0;
  const day1Completed = completenessData?.day1_completed ?? false;
  const hasSkippedSections = (progress?.skipped_sections?.length ?? 0) > 0;

  // Determine if starter week is post-week (7+ days since first session)
  const isPostWeek = (() => {
    if (!starterSessions || starterSessions.length === 0) return false;
    const firstDate = starterSessions[0]?.suggested_date;
    if (!firstDate) return false;
    return differenceInDays(new Date(), new Date(firstDate)) >= 7;
  })();

  // Determine if student deferred onboarding (not completed, account > 1 day old)
  const showDeferredBanner = !onboardingCompleted && profile?.created_at
    ? differenceInDays(new Date(), new Date(profile.created_at)) >= 1
    : false;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* 7.7 — Onboarding deferred reminder banner */}
      {showDeferredBanner && (
        <Card className="border-0 shadow-md rounded-xl p-4 bg-amber-50 flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Complete your onboarding</p>
            <p className="text-xs text-amber-600">
              Finish your profile to unlock personalized recommendations and earn XP.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/student/dashboard')}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95 transition-transform duration-100"
          >
            Start Now
          </Button>
        </Card>
      )}

      {/* 7.3 — Micro-assessment prompt (first 14 days) */}
      {onboardingCompleted && todayMicro && (
        <MicroAssessmentCard
          assessmentType={todayMicro.assessment_type}
          questionCount={todayMicro.question_ids.length}
          dismissalCount={todayMicro.dismissal_count}
          onComplete={() =>
            completeMicro.mutate({ id: todayMicro.id, studentId })
          }
          onDismiss={() =>
            dismissMicro.mutate({
              id: todayMicro.id,
              studentId,
              currentDismissals: todayMicro.dismissal_count,
            })
          }
        />
      )}

      {/* 7.5 — Starter Week Hero Card */}
      {onboardingCompleted && day1Completed && starterSessions && starterSessions.length > 0 && (
        <StarterWeekHeroCard
          sessions={starterSessions}
          onViewPlan={() => navigate('/student/planner/starter-week')}
          isPostWeek={isPostWeek}
        />
      )}

      {/* Welcome Hero Card */}
      <Card
        className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Student'} 👋
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Keep up the momentum — every step counts.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black">{kpis?.totalXP ?? 0}</p>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/60">XP</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">Lv {kpis?.currentLevel ?? 1}</p>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/60">Level</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 7.4 — Profile Completeness Bar */}
      {onboardingCompleted && profileCompleteness < 100 && (
        <ProfileCompletenessBar completeness={profileCompleteness} />
      )}
      {onboardingCompleted && profileCompleteness >= 100 && (
        <ProfileCompletenessBar completeness={100} />
      )}

      {/* 7.6 — Complete Assessment prompt for skipped sections */}
      {onboardingCompleted && hasSkippedSections && !studentProfile?.personality_traits && !studentProfile?.learning_style && (
        <Card className="border-0 shadow-md rounded-xl p-4 bg-blue-50 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Complete your assessment</p>
            <p className="text-xs text-blue-600">
              You skipped some sections during onboarding. Complete them to get full personalization.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/student/onboarding/complete-profile')}
            className="text-xs border-blue-300 text-blue-700"
          >
            Complete Now
          </Button>
        </Card>
      )}

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={BookOpen} label="Courses" value={kpis?.enrolledCourses ?? 0} />
          <KPICard icon={CheckCircle2} label="Completed" value={kpis?.completedAssignments ?? 0} />
          <KPICard
            icon={TrendingUp}
            label="Avg Attainment"
            value={`${kpis?.avgAttainment ?? 0}%`}
          />
          <KPICard icon={Flame} label="Streak" value={`${kpis?.currentStreak ?? 0}d`} />
        </div>
      )}

      {/* Two-column layout: Upcoming Deadlines + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <CalendarClock className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Upcoming Deadlines</h2>
          </div>
          <div className="p-6">
            {deadlinesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shimmer key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (deadlines ?? []).length > 0 ? (
              <div className="space-y-3">
                {(deadlines ?? []).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-gray-500 truncate">{d.course_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {format(new Date(d.due_date), 'MMM d')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-green-50 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">No upcoming deadlines. Enjoy the break.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Gamification Summary */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <Star className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Your Progress</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total XP</span>
              <span className="text-sm font-bold text-amber-600">{kpis?.totalXP ?? 0} XP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Current Level</span>
              <span className="text-sm font-bold">Level {kpis?.currentLevel ?? 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Login Streak</span>
              <span className="text-sm font-bold text-red-500">
                🔥 {kpis?.currentStreak ?? 0} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Assignments Done</span>
              <span className="text-sm font-bold">{kpis?.completedAssignments ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 7.2 — Profile Summary Card */}
      {onboardingCompleted && studentProfile && (
        <ProfileSummaryCard
          personalityTraits={studentProfile.personality_traits}
          learningStyle={studentProfile.learning_style}
          selfEfficacy={studentProfile.self_efficacy}
          studyStrategies={studentProfile.study_strategies}
          hasSkippedSections={hasSkippedSections}
          onRetake={() => navigate('/student/settings/reassessment')}
          onCompleteRemaining={() => navigate('/student/onboarding/complete-profile')}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, BarChart3, Info, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import Shimmer from '@/components/shared/Shimmer';
import ConsistencyScoreRing from '@/components/shared/ConsistencyScoreRing';
import HabitCompletionChart from '@/components/shared/HabitCompletionChart';
import BestDayChart from '@/components/shared/BestDayChart';
import CorrelationInsightCard from '@/components/shared/CorrelationInsightCard';
import CorrelationDisclaimer from '@/components/shared/CorrelationDisclaimer';
import LevelProgressionChart from '@/components/shared/LevelProgressionChart';
import { useAuth } from '@/hooks/useAuth';
import { useSemesterRange } from '@/hooks/useSemesterRange';
import { useHeatmapData } from '@/hooks/useHeatmapData';
import { useWellnessPreferences } from '@/hooks/useWellnessPreferences';
import { useStudentHabitLevel } from '@/hooks/useStudentHabitLevel';
import {
  useWeeklyCompletionRates,
  useMonthlyCompletionRates,
  useConsistencyScore,
  useBestDayOfWeek,
  useLevelAwareWeeklyCompletionRates,
  useLevelAwareMonthlyCompletionRates,
  useLevelAwareAcademicWeeklyRates,
  useLevelAwareAcademicMonthlyRates,
} from '@/hooks/useHabitAnalytics';
import { useHabitCorrelations } from '@/hooks/useHabitCorrelations';
import { useHabitExport } from '@/hooks/useHabitExport';
import type { DateRange } from '@/types/habits';

// ---------------------------------------------------------------------------
// Page Content (inside ErrorBoundary)
// ---------------------------------------------------------------------------

const HabitAnalyticsContent = () => {
  const { user } = useAuth();
  const studentId = user?.id;

  const { data: semesterRange, isLoading: semesterLoading } = useSemesterRange(studentId);
  const resolvedRange: DateRange = semesterRange ?? { start: '', end: '' };

  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmapData(
    studentId,
    resolvedRange,
  );
  const { data: preferences } = useWellnessPreferences(studentId);
  const enabledWellness = preferences?.enabledHabits ?? [];

  // Student habit level
  const { data: habitLevel } = useStudentHabitLevel(studentId);
  const levelHistory = habitLevel?.levelHistory ?? [];
  const currentLevel = habitLevel?.currentLevel ?? 4;

  // Possible habits per day: 4 academic + enabled wellness
  const allPossiblePerDay = 4 + enabledWellness.length;
  const academicPossiblePerDay = 4;

  // Level-aware analytics hooks (use level-relative denominator when history available)
  const hasLevelHistory = levelHistory.length > 0;

  // Fallback (non-level-aware) hooks
  const fallbackWeekly = useWeeklyCompletionRates(heatmapData, allPossiblePerDay);
  const fallbackMonthly = useMonthlyCompletionRates(heatmapData, allPossiblePerDay);
  const fallbackAcademicWeekly = useWeeklyCompletionRates(heatmapData, academicPossiblePerDay);
  const fallbackAcademicMonthly = useMonthlyCompletionRates(heatmapData, academicPossiblePerDay);

  // Level-aware hooks
  const levelWeekly = useLevelAwareWeeklyCompletionRates(heatmapData, levelHistory, enabledWellness.length);
  const levelMonthly = useLevelAwareMonthlyCompletionRates(heatmapData, levelHistory, enabledWellness.length);
  const levelAcademicWeekly = useLevelAwareAcademicWeeklyRates(heatmapData, levelHistory);
  const levelAcademicMonthly = useLevelAwareAcademicMonthlyRates(heatmapData, levelHistory);

  // Use level-aware rates when level history is available
  const weeklyData = hasLevelHistory ? levelWeekly : fallbackWeekly;
  const monthlyData = hasLevelHistory ? levelMonthly : fallbackMonthly;
  const academicWeekly = hasLevelHistory ? levelAcademicWeekly : fallbackAcademicWeekly;
  const academicMonthly = hasLevelHistory ? levelAcademicMonthly : fallbackAcademicMonthly;

  const consistencyScore = useConsistencyScore(heatmapData);
  const { averages } = useBestDayOfWeek(heatmapData);

  // Correlations
  const {
    data: correlationResult,
    isLoading: correlationsLoading,
  } = useHabitCorrelations(studentId);

  // CSV export
  const { exportCSV } = useHabitExport({
    studentId,
    semesterRange: resolvedRange,
    enabledWellnessHabits: enabledWellness,
    levelHistory,
  });

  const isLoading = semesterLoading || heatmapLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/student/habits">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Habit Analytics</h1>
        </div>
        <Button
          onClick={exportCSV}
          disabled={isLoading}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 gap-1"
          data-testid="export-report-btn"
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Shimmer className="h-40 rounded-xl" />
          <Shimmer className="h-64 rounded-xl" />
          <Shimmer className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Consistency Score */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Consistency</h2>
            </div>
            <div className="p-6 flex justify-center">
              <ConsistencyScoreRing score={consistencyScore} label="Consistency Score" />
            </div>
          </Card>

          {/* Level Progression */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden" data-testid="level-progression-section">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Level Progression</h2>
            </div>
            <div className="p-6">
              <LevelProgressionChart
                data={levelHistory}
                currentLevel={currentLevel}
              />
            </div>
          </Card>

          {/* Completion Rates */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Completion Rates</h2>
            </div>
            <div className="p-6">
              <HabitCompletionChart
                weeklyData={weeklyData}
                monthlyData={monthlyData}
                academicOnlyWeeklyData={academicWeekly}
                academicOnlyMonthlyData={academicMonthly}
              />
            </div>
          </Card>

          {/* Best Day of Week */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Best Day of Week</h2>
            </div>
            <div className="p-6">
              <BestDayChart data={averages} />
            </div>
          </Card>

          {/* Correlation Insights */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Insights</h2>
            </div>
            <div className="p-6 space-y-3">
              {correlationsLoading ? (
                <Shimmer className="h-24 rounded-xl" />
              ) : correlationResult?.insufficientData ? (
                <div
                  className="flex items-center gap-3 rounded-xl bg-blue-50 p-4"
                  data-testid="insufficient-data-message"
                >
                  <Info className="h-5 w-5 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700">
                    {correlationResult.daysUntilReady != null
                      ? `Almost there — ${correlationResult.daysUntilReady} more days of data needed for insights`
                      : 'Keep tracking — insights appear after 2 weeks of data'}
                  </p>
                </div>
              ) : correlationResult?.insights && correlationResult.insights.length > 0 ? (
                <>
                  <CorrelationDisclaimer />
                  <div className="space-y-3" data-testid="correlation-insights-list">
                    {correlationResult.insights.slice(0, 3).map((insight) => (
                      <CorrelationInsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <CorrelationDisclaimer />
                  <p className="text-sm text-gray-500 text-center py-4">
                    No insights available yet
                  </p>
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exported Page (wrapped in ErrorBoundary)
// ---------------------------------------------------------------------------

const HabitAnalyticsPage = () => (
  <ErrorBoundary>
    <HabitAnalyticsContent />
  </ErrorBoundary>
);

export default HabitAnalyticsPage;

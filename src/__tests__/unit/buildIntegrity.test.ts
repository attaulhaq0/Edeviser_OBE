// =============================================================================
// Build Integrity Test — Verifies all major module exports resolve correctly.
// Catches broken imports, missing exports, and circular dependency issues
// that lint/tsc might miss but would crash at runtime.
// =============================================================================
import { describe, it, expect } from 'vitest';

describe('Build integrity: lib modules export correctly', () => {
  const libModules = [
    () => import('@/lib/xpLevelCalculator'),
    () => import('@/lib/streakCalculator'),
    () => import('@/lib/attainmentClassifier'),
    () => import('@/lib/submissionDeadline'),
    () => import('@/lib/journalPromptGenerator'),
    () => import('@/lib/auditLogger'),
    () => import('@/lib/activityLogger'),
    () => import('@/lib/notificationBatcher'),
    () => import('@/lib/bloomsClimb'),
    () => import('@/lib/masteryRecovery'),
    () => import('@/lib/predictionValidator'),
    () => import('@/lib/sanitizeFilter'),
    () => import('@/lib/imageCompressor'),
    () => import('@/lib/leagueTier'),
    () => import('@/lib/percentileBand'),
    () => import('@/lib/mostImprovedLeaderboard'),
    () => import('@/lib/personalBestLeaderboard'),
    () => import('@/lib/habitDifficulty'),
    () => import('@/lib/teamStreakCalculator'),
    () => import('@/lib/teamBadgeChecker'),
    () => import('@/lib/adaptiveXP'),
    () => import('@/lib/heatmapUtils'),
    () => import('@/lib/wellnessTips'),
    () => import('@/lib/levelAwareHeatmap'),
    () => import('@/lib/streakMilestones'),
    () => import('@/lib/quizGrader'),
    () => import('@/lib/scoreCalculator'),
    () => import('@/lib/profileCompleteness'),
    () => import('@/lib/onboardingSchemas'),
    () => import('@/lib/onboardingConstants'),
    () => import('@/lib/queryKeys'),
    () => import('@/lib/supabase'),
  ];

  it.each(libModules.map((fn, i) => [i, fn]))(
    'lib module %i imports without error',
    async (_idx, importFn) => {
      const mod = await (importFn as () => Promise<unknown>)();
      expect(mod).toBeDefined();
    },
  );
});

// Task 137.4: Adaptive XP TanStack Query hooks

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { getLevelMultiplier, getDifficultyMultiplier, type BloomsLevel } from '@/lib/adaptiveXP';
import type { BloomsLevel as AppBloomsLevel } from '@/types/app';

export const useStudentXPMultiplier = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.xpMultiplier.detail(studentId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_gamification')
        .select('level')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      const level = data?.level ?? 1;
      return {
        level,
        multiplier: getLevelMultiplier(level),
      };
    },
    enabled: !!studentId,
  });
};

export const useDiminishingReturnsStatus = (
  studentId: string | undefined,
  actionType: string,
) => {
  return useQuery({
    queryKey: [...queryKeys.diminishingReturns.all, studentId, actionType],
    queryFn: async () => {
      const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('id')
        .eq('student_id', studentId!)
        .eq('source', actionType)
        .gte('created_at', windowStart);

      if (error) throw error;
      const count = data?.length ?? 0;
      const nextMultiplier = Math.max(1.0 - count * 0.2, 0.2);

      return {
        repeat_count: count,
        next_multiplier: nextMultiplier,
        is_diminished: nextMultiplier < 1.0,
      };
    },
    enabled: !!studentId && !!actionType,
  });
};

export const useImprovementBonusHistory = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.improvementBonusHistory.detail(studentId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('student_id', studentId!)
        .eq('source', 'improvement_bonus' as never)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studentId,
  });
};


// Map lowercase app BloomsLevel to the title-case BloomsLevel used in adaptiveXP lib
const toAdaptiveBloomsLevel = (level: AppBloomsLevel): BloomsLevel => {
  const map: Record<AppBloomsLevel, BloomsLevel> = {
    remembering: 'Remembering',
    understanding: 'Understanding',
    applying: 'Applying',
    analyzing: 'Analyzing',
    evaluating: 'Evaluating',
    creating: 'Creating',
  };
  return map[level];
};

export interface AssignmentDifficultyBonus {
  bloomsLevel: AppBloomsLevel;
  multiplier: number;
}

export const useAssignmentDifficultyBonus = (cloIds: string[]) => {
  return useQuery({
    queryKey: ['assignmentDifficultyBonus', ...cloIds],
    queryFn: async (): Promise<AssignmentDifficultyBonus | null> => {
      if (cloIds.length === 0) return null;

      const { data, error } = await supabase
        .from('learning_outcomes')
        .select('blooms_level')
        .in('id', cloIds);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Find the highest Bloom's level among linked CLOs
      const bloomsOrder: AppBloomsLevel[] = [
        'remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating',
      ];

      let highestLevel: AppBloomsLevel = 'remembering';
      for (const row of data) {
        const bl = row.blooms_level as AppBloomsLevel | null;
        if (bl && bloomsOrder.indexOf(bl) > bloomsOrder.indexOf(highestLevel)) {
          highestLevel = bl;
        }
      }

      const adaptiveLevel = toAdaptiveBloomsLevel(highestLevel);
      return {
        bloomsLevel: highestLevel,
        multiplier: getDifficultyMultiplier(adaptiveLevel),
      };
    },
    enabled: cloIds.length > 0,
  });
};

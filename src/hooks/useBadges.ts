import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface StudentBadge {
  badge_id: string;
  awarded_at: string;
}

export const useStudentBadges = () => {
  return useQuery({
    queryKey: queryKeys.badges.list({}),
    queryFn: async (): Promise<StudentBadge[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
        .from('student_badges')
        .select('badge_id, awarded_at')
        .eq('student_id', user.id)
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentBadge[];
    },
  });
};

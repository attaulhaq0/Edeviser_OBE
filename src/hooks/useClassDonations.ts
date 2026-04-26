/**
 * Hooks for class donation campaigns and contributions. Task 20.7
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export interface ClassDonation {
  id: string;
  course_id: string;
  resource_description: string;
  goal_amount: number;
  current_total: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export const useClassDonations = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.donations.list(courseId ?? ''),
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from('class_donations')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClassDonation[];
    },
    enabled: !!courseId,
  });
};

export const useContributeToDonation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ donationId, xpAmount, studentId }: { donationId: string; xpAmount: number; studentId: string }) => {
      // Insert contribution and deduct XP via purchase
      const { data, error } = await supabase
        .from('class_donation_contributions')
        .insert({ donation_id: donationId, student_id: studentId, xp_amount: xpAmount })
        .select()
        .single();
      if (error) throw error;

      // Update donation total
      await supabase.rpc('increment_donation_total', { p_donation_id: donationId, p_amount: xpAmount });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.donations.all });
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.balance('') });
      toast.success('Donation contributed!');
    },
  });
};

export const useCreateClassDonation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { course_id: string; resource_description: string; goal_amount: number }) => {
      const { data, error } = await supabase
        .from('class_donations')
        .insert({ ...input, current_total: 0, status: 'active' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.donations.all });
      toast.success('Donation campaign created');
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ReflectionDigest, DigestShareEntry } from '@/types/planner';

const mapDigest = (r: Record<string, unknown>): ReflectionDigest => ({
  id: r.id as string,
  studentId: r.student_id as string,
  month: r.month as string,
  themes: (r.themes ?? []) as ReflectionDigest['themes'],
  growthPatterns: (r.growth_patterns ?? []) as ReflectionDigest['growthPatterns'],
  emotionalTrends: (r.emotional_trends ?? []) as ReflectionDigest['emotionalTrends'],
  suggestedFocus: (r.suggested_focus ?? []) as ReflectionDigest['suggestedFocus'],
  sharedWith: (r.shared_with ?? []) as DigestShareEntry[],
  generatedAt: r.generated_at as string,
});

export const useMonthlyDigest = (month: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reflectionDigest', user?.id, month],
    queryFn: async (): Promise<ReflectionDigest | null> => {
      const { data, error } = await supabase
        .from('reflection_digests')
        .select('*')
        .eq('student_id', user!.id)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapDigest(data as Record<string, unknown>);
    },
    enabled: !!user?.id && !!month,
  });
};

export const useShareDigest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { digestId: string; role: 'parent' | 'advisor'; userId: string }) => {
      // Fetch current shared_with
      const { data: digest, error: fetchErr } = await supabase
        .from('reflection_digests')
        .select('shared_with')
        .eq('id', input.digestId)
        .eq('student_id', user!.id)
        .single();
      if (fetchErr) throw fetchErr;

      const currentShared = (digest.shared_with ?? []) as DigestShareEntry[];
      const alreadyShared = currentShared.some(
        (s) => s.role === input.role && s.userId === input.userId,
      );
      if (alreadyShared) return;

      const newEntry: DigestShareEntry = {
        role: input.role,
        userId: input.userId,
        sharedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('reflection_digests')
        .update({ shared_with: [...currentShared, newEntry] })
        .eq('id', input.digestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflectionDigest'] });
      toast.success('Digest shared');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useRevokeDigestShare = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { digestId: string; role: string; userId: string }) => {
      const { data: digest, error: fetchErr } = await supabase
        .from('reflection_digests')
        .select('shared_with')
        .eq('id', input.digestId)
        .eq('student_id', user!.id)
        .single();
      if (fetchErr) throw fetchErr;

      const currentShared = (digest.shared_with ?? []) as DigestShareEntry[];
      const filtered = currentShared.filter(
        (s) => !(s.role === input.role && s.userId === input.userId),
      );

      const { error } = await supabase
        .from('reflection_digests')
        .update({ shared_with: filtered })
        .eq('id', input.digestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflectionDigest'] });
      toast.success('Sharing revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

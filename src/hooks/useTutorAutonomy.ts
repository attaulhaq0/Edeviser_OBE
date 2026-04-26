import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { AutonomyLevel } from '@/lib/tutorSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AssignmentAutonomy {
  assignment_id: string;
  tutor_autonomy_level: AutonomyLevel;
}

interface CLOAutonomy {
  clo_id: string;
  tutor_autonomy_level: AutonomyLevel;
}

// ─── Read Hooks ─────────────────────────────────────────────────────────────

/**
 * Fetches the autonomy level configured for a specific assignment.
 */
export const useAssignmentAutonomy = (assignmentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.tutorAutonomy.assignment(assignmentId ?? ''),
    queryFn: async (): Promise<AssignmentAutonomy | null> => {
      if (!assignmentId) return null;

      const { data, error } = await supabase
        .from('assignments')
        .select('id, tutor_autonomy_level')
        .eq('id', assignmentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        assignment_id: data.id as string,
        tutor_autonomy_level: (data.tutor_autonomy_level as AutonomyLevel) ?? 'L1',
      };
    },
    enabled: !!assignmentId,
  });
};

/**
 * Fetches the autonomy level configured for a specific CLO.
 */
export const useCLOAutonomy = (cloId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.tutorAutonomy.clo(cloId ?? ''),
    queryFn: async (): Promise<CLOAutonomy | null> => {
      if (!cloId) return null;

      const { data, error } = await supabase
        .from('clos')
        .select('id, tutor_autonomy_level')
        .eq('id', cloId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        clo_id: data.id as string,
        tutor_autonomy_level: (data.tutor_autonomy_level as AutonomyLevel) ?? 'L2',
      };
    },
    enabled: !!cloId,
  });
};

// ─── Mutation Hooks ─────────────────────────────────────────────────────────

/**
 * Teacher mutation to update the autonomy level on an assignment.
 */
export const useUpdateAssignmentAutonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignment_id,
      autonomy_level,
    }: {
      assignment_id: string;
      autonomy_level: AutonomyLevel;
    }) => {
      const { data, error } = await supabase
        .from('assignments')
        .update({ tutor_autonomy_level: autonomy_level })
        .eq('id', assignment_id)
        .select('id, tutor_autonomy_level')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorAutonomy.assignment(variables.assignment_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.lists(),
      });
    },
  });
};

/**
 * Teacher mutation to update the autonomy level on a CLO.
 */
export const useUpdateCLOAutonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clo_id,
      autonomy_level,
    }: {
      clo_id: string;
      autonomy_level: AutonomyLevel;
    }) => {
      const { data, error } = await supabase
        .from('clos')
        .update({ tutor_autonomy_level: autonomy_level })
        .eq('id', clo_id)
        .select('id, tutor_autonomy_level')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorAutonomy.clo(variables.clo_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clos.lists(),
      });
    },
  });
};

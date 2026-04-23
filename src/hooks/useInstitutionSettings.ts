// =============================================================================
// useInstitutionSettings — TanStack Query hooks for institution settings & accreditations
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  InstitutionSettings,
  ProgramAccreditation,
} from '@/types/app';
import type { InstitutionSettingsFormData } from '@/lib/schemas/institutionSettings';

// ─── useInstitutionSettings — fetch current institution settings ─────────────

export const useInstitutionSettings = () => {
  const { institutionId } = useAuth();

  return useQuery({
    queryKey: queryKeys.institutionSettings.list({ institutionId }),
    queryFn: async (): Promise<InstitutionSettings | null> => {
      if (!institutionId) return null;

      const { data, error } = await supabase
        .from('institution_settings')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as InstitutionSettings | null;
    },
    enabled: !!institutionId,
  });
};


// ─── useUpsertInstitutionSettings — create or update settings ────────────────

export const useUpsertInstitutionSettings = () => {
  const qc = useQueryClient();
  const { user, institutionId } = useAuth();

  return useMutation({
    mutationFn: async (input: InstitutionSettingsFormData): Promise<InstitutionSettings> => {
      if (!institutionId) throw new Error('No institution context');

      // Check if settings already exist
      const { data: existing } = await supabase
        .from('institution_settings')
        .select('id')
        .eq('institution_id', institutionId)
        .maybeSingle();

      const payload = {
        institution_id: institutionId,
        attainment_thresholds: input.attainment_thresholds,
        success_threshold: input.success_threshold,
        accreditation_body: input.accreditation_body,
        grade_scales: input.grade_scales,
        streak_sabbatical_enabled: input.streak_sabbatical_enabled ?? false,
        league_thresholds: input.league_thresholds ?? undefined,
        default_language: input.default_language ?? 'en',
      };

      let result: InstitutionSettings;

      if (existing) {
        const { data, error } = await supabase
          .from('institution_settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        result = data as unknown as InstitutionSettings;
      } else {
        const { data, error } = await supabase
          .from('institution_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data as unknown as InstitutionSettings;
      }

      await logAuditEvent({
        action: existing ? 'update' : 'create',
        entity_type: 'institution_settings',
        entity_id: result.id,
        changes: payload as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.institutionSettings.all });
      toast.success('Institution settings saved');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save settings'),
  });
};

// ─── useProgramAccreditations — list accreditations for a program ────────────

export const useProgramAccreditations = (programId?: string) => {
  return useQuery({
    queryKey: queryKeys.programAccreditations.list({ programId }),
    queryFn: async (): Promise<ProgramAccreditation[]> => {
      if (!programId) return [];

      const { data, error } = await supabase
        .from('program_accreditations')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as ProgramAccreditation[];
    },
    enabled: !!programId,
  });
};

// ─── useAllProgramAccreditations — list all accreditations (admin view) ──────

export const useAllProgramAccreditations = () => {
  return useQuery({
    queryKey: queryKeys.programAccreditations.lists(),
    queryFn: async (): Promise<(ProgramAccreditation & { program_name?: string; program_code?: string })[]> => {
      const { data, error } = await supabase
        .from('program_accreditations')
        .select('*, programs(name, code)')
        .order('next_review_date', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        const programs = row.programs as { name: string; code: string } | null;
        return {
          ...(row as unknown as ProgramAccreditation),
          program_name: programs?.name,
          program_code: programs?.code,
        };
      });
    },
  });
};

// ─── useCreateProgramAccreditation ───────────────────────────────────────────

export interface CreateProgramAccreditationInput {
  program_id: string;
  accreditation_body: string;
  framework_version?: string;
  accreditation_date?: string;
  next_review_date?: string;
  status: 'active' | 'expired' | 'pending';
}

export const useCreateProgramAccreditation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProgramAccreditationInput): Promise<ProgramAccreditation> => {
      const { data, error } = await supabase
        .from('program_accreditations')
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'create',
        entity_type: 'program_accreditation',
        entity_id: data.id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return data as ProgramAccreditation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.programAccreditations.all });
      toast.success('Accreditation record created');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to create accreditation'),
  });
};

// ─── useUpdateProgramAccreditation ───────────────────────────────────────────

export const useUpdateProgramAccreditation = (id: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<CreateProgramAccreditationInput>): Promise<ProgramAccreditation> => {
      const { data, error } = await supabase
        .from('program_accreditations')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'program_accreditation',
        entity_id: id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return data as ProgramAccreditation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.programAccreditations.all });
      toast.success('Accreditation record updated');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update accreditation'),
  });
};

// ─── useDeleteProgramAccreditation ───────────────────────────────────────────

export const useDeleteProgramAccreditation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('program_accreditations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'program_accreditation',
        entity_id: id,
        changes: null,
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.programAccreditations.all });
      toast.success('Accreditation record deleted');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete accreditation'),
  });
};

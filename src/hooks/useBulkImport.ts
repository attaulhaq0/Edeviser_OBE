import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';

export interface BulkImportResult {
  created: number;
  errors: Array<{ row: number; message: string }>;
}

interface BulkImportRow {
  email: string;
  full_name: string;
  role: string;
  program_id?: string;
}

export const useBulkImportUsers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rows: BulkImportRow[]): Promise<BulkImportResult> => {
      const { data, error } = await supabase.functions.invoke('bulk-import-users', {
        body: { rows },
      });

      if (error) throw error;

      const result = data as BulkImportResult;

      if (result.created > 0) {
        await logAuditEvent({
          action: 'bulk_import',
          entity_type: 'user',
          entity_id: 'bulk',
          changes: { count: result.created, errors: result.errors.length },
          performed_by: user?.id ?? 'unknown',
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
};

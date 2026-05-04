import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';

export interface FeeStructure {
  id: string;
  program_id: string;
  semester_id: string;
  fee_type: string;
  amount: number;
  currency: string;
  due_date: string;
  created_at: string;
}

export interface FeePayment {
  id: string;
  fee_structure_id: string;
  student_id: string;
  amount_paid: number;
  payment_method: string | null;
  receipt_number: string | null;
  status: string;
  payment_date: string;
  created_at: string;
}

export const useFeeStructures = (programId?: string) => {
  return useQuery({
    queryKey: queryKeys.feeStructures.list({ programId }),
    queryFn: async (): Promise<FeeStructure[]> => {
      let q = supabase.from('fee_structures').select('*').order('due_date', { ascending: false });
      if (programId) q = q.eq('program_id', programId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FeeStructure[];
    },
  });
};

export const useFeePayments = (feeStructureId?: string) => {
  return useQuery({
    queryKey: queryKeys.feePayments.list({ feeStructureId }),
    queryFn: async (): Promise<FeePayment[]> => {
      let q = supabase.from('fee_payments').select('*').order('paid_at', { ascending: false });
      if (feeStructureId) q = q.eq('fee_structure_id', feeStructureId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FeePayment[];
    },
    enabled: !!feeStructureId,
  });
};

export const useStudentFees = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.studentFees.list({ studentId }),
    queryFn: async (): Promise<FeePayment[]> => {
      const { data, error } = await supabase.from('fee_payments').select('*').eq('student_id', studentId!);
      if (error) throw error;
      return (data ?? []) as FeePayment[];
    },
    enabled: !!studentId,
  });
};

export const useCreateFeeStructure = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<FeeStructure, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('fee_structures').insert(input).select().single();
      if (error) throw error;
      await logAuditEvent({ action: 'create', entity_type: 'fee_structure', entity_id: data.id, changes: input, performed_by: user?.id ?? '' });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.feeStructures.lists() }),
  });
};

export const useRecordPayment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { fee_structure_id: string; student_id: string; amount_paid: number; payment_method: string; receipt_number?: string }) => {
      const { data, error } = await supabase.from('fee_payments').insert({
        ...input,
        status: 'paid',
        payment_date: new Date().toISOString().slice(0, 10),
      }).select().single();
      if (error) throw error;
      await logAuditEvent({ action: 'create', entity_type: 'fee_payment', entity_id: data.id, changes: input, performed_by: user?.id ?? '' });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.feePayments.lists() }),
  });
};

export const useGenerateFeeReceipt = () => {
  return useMutation({
    mutationFn: async (paymentId: string): Promise<{ download_url: string; file_name: string }> => {
      const { data, error } = await supabase.functions.invoke('generate-fee-receipt', {
        body: { payment_id: paymentId },
      });
      if (error) throw error;
      return data as { download_url: string; file_name: string };
    },
  });
};

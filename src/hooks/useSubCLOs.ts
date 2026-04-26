import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";
import type { SubCLOFormData } from "@/lib/schemas/subCLO";
import type { Database } from "@/types/database";

type SubCLO = Database["public"]["Tables"]["sub_clos"]["Row"];

// Sub-CLOs live in their own table with FK clo_id → learning_outcomes(id).
// The live schema does not yet persist `code` or `weight`; they remain in the
// form schema for forward-compatibility but are stripped on write.

// ─── useSubCLOs — list Sub-CLOs for a parent CLO ───────────────────────────

export const useSubCLOs = (cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.subCLOs.list({ cloId: cloId ?? "" }),
    queryFn: async (): Promise<SubCLO[]> => {
      const { data, error } = await supabase
        .from("sub_clos")
        .select("*")
        .eq("clo_id", cloId!)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!cloId,
  });
};

// ─── useCreateSubCLO ────────────────────────────────────────────────────────

export const useCreateSubCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: SubCLOFormData): Promise<SubCLO> => {
      const { data: result, error } = await supabase
        .from("sub_clos")
        .insert({
          title: data.title,
          description: data.description ?? null,
          clo_id: data.parent_outcome_id,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "create",
        entity_type: "sub_clo",
        entity_id: result.id,
        changes: data,
        performed_by: user?.id ?? "unknown",
      });

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subCLOs.list({
          cloId: variables.parent_outcome_id,
        }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useUpdateSubCLO ────────────────────────────────────────────────────────

export const useUpdateSubCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      parentCloId: string;
      data: Partial<SubCLOFormData>;
    }): Promise<SubCLO> => {
      const { id, data } = params;

      const update: Database["public"]["Tables"]["sub_clos"]["Update"] = {};
      if (data.title !== undefined) update.title = data.title;
      if (data.description !== undefined) update.description = data.description;

      const { data: result, error } = await supabase
        .from("sub_clos")
        .update(update)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "update",
        entity_type: "sub_clo",
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? "unknown",
      });

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subCLOs.list({ cloId: variables.parentCloId }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useDeleteSubCLO — blocks deletion if evidence exists ───────────────────

export const useDeleteSubCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      parentCloId: string;
    }): Promise<void> => {
      const { id, parentCloId } = params;

      // Evidence is tied to the parent CLO (no direct sub_clo FK exists).
      // Check for evidence linked to the parent CLO as a defensive guard.
      const { count, error: evidenceError } = await supabase
        .from("evidence")
        .select("id", { count: "exact", head: true })
        .eq("clo_id", parentCloId);

      if (evidenceError) throw evidenceError;

      if (count && count > 0) {
        throw new Error(
          `Cannot delete Sub-CLO: ${count} evidence record(s) are linked to its parent CLO. Remove or reassign evidence first.`
        );
      }

      const { error } = await supabase.from("sub_clos").delete().eq("id", id);

      if (error) throw error;

      await logAuditEvent({
        action: "delete",
        entity_type: "sub_clo",
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? "unknown",
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subCLOs.list({ cloId: variables.parentCloId }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

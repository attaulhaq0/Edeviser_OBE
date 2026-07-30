import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";
import type { Database, Json } from "@/types/database";

export type BadgeDefinition =
  Database["public"]["Tables"]["badge_definitions"]["Row"];

export interface BadgeDefinitionInput {
  badge_key: string;
  name: string;
  description: string;
  emoji: string;
  category: string | null;
  tier_conditions: Json;
}

const invalidateDefinitions = (
  queryClient: ReturnType<typeof useQueryClient>
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.badgeDefinitions.lists(),
  });

export const useBadgeDefinitions = (institutionId?: string) =>
  useQuery({
    queryKey: queryKeys.badgeDefinitions.list({ institutionId }),
    queryFn: async (): Promise<BadgeDefinition[]> => {
      const { data, error } = await supabase
        .from("badge_definitions")
        .select("*")
        .eq("institution_id", institutionId!)
        .order("is_archived")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!institutionId,
  });

export const useCreateBadgeDefinition = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      institutionId,
      input,
    }: {
      institutionId: string;
      input: BadgeDefinitionInput;
    }) => {
      const { data, error } = await supabase
        .from("badge_definitions")
        .insert({ ...input, institution_id: institutionId })
        .select()
        .single();

      if (error) throw error;
      await logAuditEvent({
        action: "create",
        entity_type: "badge_definition",
        entity_id: data.id,
        changes: { ...input },
        performed_by: user?.id ?? "",
      });
      return data;
    },
    onSuccess: () => invalidateDefinitions(queryClient),
  });
};

export const useUpdateBadgeDefinition = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<BadgeDefinitionInput> & { is_archived?: boolean };
    }) => {
      const { data, error } = await supabase
        .from("badge_definitions")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      await logAuditEvent({
        action: "update",
        entity_type: "badge_definition",
        entity_id: id,
        changes: input,
        performed_by: user?.id ?? "",
      });
      return data;
    },
    onSuccess: () => invalidateDefinitions(queryClient),
  });
};

export const useDeleteBadgeDefinition = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("badge_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "badge_definition",
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? "",
      });
    },
    onSuccess: () => invalidateDefinitions(queryClient),
  });
};

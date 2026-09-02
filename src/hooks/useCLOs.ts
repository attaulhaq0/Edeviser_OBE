import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { fetchUserInstitutionId } from "@/lib/userInstitution";
import { useAuth } from "@/hooks/useAuth";
import type { CreateCLOFormData } from "@/lib/schemas/clo";
import type { LearningOutcome } from "@/types/app";
import type { PaginatedResult } from "@/types/pagination";
import { getPaginationRange } from "@/types/pagination";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OutcomeMapping {
  id: string;
  source_outcome_id: string;
  target_outcome_id: string;
  weight: number;
  created_at: string;
}

/** A PLO mapped to a CLO, with its title resolved in the same round trip. */
export interface CLOMappedPLO {
  mapping_id: string;
  plo_id: string;
  title: string | null;
  weight: number;
}

/** An assignment that assesses a CLO via its `clo_weights` array. */
export interface CLOLinkedAssignment {
  id: string;
  title: string;
  due_date: string;
  weight: number;
}

/** Read-only attainment headline for a single CLO. */
export interface CLOAttainmentSummary {
  percent: number | null;
  sampleCount: number;
}

/**
 * A CLO list row with its parent course embedded via the
 * `learning_outcomes_course_id_fkey` to-one join (Req 5.2). Resolved in the
 * same round trip as the list query (no N+1, Req 5.5); the column renders the
 * course name through `resolveName` (Req 5.6).
 */
export interface CLOWithRelations extends LearningOutcome {
  courses: { name: string } | null;
}

// ─── useCLOs — list CLOs, optionally filtered by course_id ──────────────────

export const useCLOs = (
  courseId?: string,
  pagination?: { page?: number; pageSize?: number }
) => {
  const { page, pageSize, from, to } = getPaginationRange(
    pagination?.page,
    pagination?.pageSize
  );

  return useQuery({
    queryKey: queryKeys.clos.list({ courseId, page, pageSize }),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PaginatedResult<CLOWithRelations>> => {
      let query = supabase
        .from("learning_outcomes")
        .select("*, courses!learning_outcomes_course_id_fkey(name)", {
          count: "exact",
        })
        .eq("type", "CLO")
        .order("sort_order", { ascending: true })
        .range(from, to);

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return {
        data: (data ?? []) as unknown as CLOWithRelations[],
        count: count ?? 0,
        page,
        pageSize,
      };
    },
  });
};

// ─── useSetCLOReviewStatus — E2.B review workflow (draft → in_review → confirmed) ──

export type CLOReviewStatus = "draft" | "in_review" | "confirmed";

export interface SetCLOReviewStatusInput {
  cloId: string;
  status: CLOReviewStatus;
}

export const useSetCLOReviewStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ cloId, status }: SetCLOReviewStatusInput) => {
      const reviewing = status !== "draft";
      const { data, error } = await supabase
        .from("learning_outcomes")
        .update({
          review_status: status,
          reviewed_at: reviewing ? new Date().toISOString() : null,
          reviewed_by: reviewing ? (user?.id ?? null) : null,
        })
        .eq("id", cloId)
        .eq("type", "CLO")
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      void logAuditEvent({
        action: "update",
        entity_type: "clo",
        entity_id: variables.cloId,
        changes: { review_status: variables.status },
        performed_by: user?.id ?? "unknown",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.details() });
      // T18 (E2.B) approval propagation: coordinator/attainment surfaces
      // consume confirmed CLOs — refresh the matrix, attainment rollups and
      // CQI queries so a confirmation is visible platform-wide immediately
      // (E3.B: auto-refresh on teacher publish).
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeMappings.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeAttainment.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.cqiPlans.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cqiInstitutional.all });
    },
  });
};

// ─── useCLOReviewCounts — E2.B readiness: confirmed/total for one course ────
//
// Two head-count queries (no row transfer) so the readiness banner stays cheap
// regardless of how many CLOs the course has.

export const useCLOReviewCounts = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.clos.list({ courseId, view: "review-counts" }),
    enabled: !!courseId,
    queryFn: async (): Promise<{
      confirmed: number;
      inReview: number;
      total: number;
    }> => {
      const base = () =>
        supabase
          .from("learning_outcomes")
          .select("id", { count: "exact", head: true })
          .eq("type", "CLO")
          .eq("course_id", courseId!);

      const [
        { count: total, error: totalErr },
        { count: confirmed, error: confirmedErr },
        { count: inReview, error: inReviewErr },
      ] = await Promise.all([
        base(),
        base().eq("review_status", "confirmed"),
        base().eq("review_status", "in_review"),
      ]);

      if (totalErr) throw totalErr;
      if (confirmedErr) throw confirmedErr;
      if (inReviewErr) throw inReviewErr;
      return {
        confirmed: confirmed ?? 0,
        inReview: inReview ?? 0,
        total: total ?? 0,
      };
    },
  });
};

// ─── useCLO — single CLO detail ────────────────────────────────────────────

export const useCLO = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.clos.detail(id ?? ""),
    queryFn: async (): Promise<LearningOutcome | null> => {
      const { data, error } = await supabase
        .from("learning_outcomes")
        .select("*")
        .eq("id", id!)
        .eq("type", "CLO")
        .maybeSingle();

      if (error) throw error;
      return data as LearningOutcome | null;
    },
    enabled: !!id,
  });
};

// ─── useCreateCLO — insert CLO + optional PLO mappings ──────────────────────

export const useCreateCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCLOFormData): Promise<LearningOutcome> => {
      const { plo_mappings, ...cloFields } = data;

      // RLS requires institution_id = auth_institution_id() on INSERT and the
      // form schema doesn't carry it — enrich from the profile (fail-closed).
      const institutionId = await fetchUserInstitutionId();
      if (!institutionId) {
        throw new Error(
          "Your profile is not linked to an institution — unable to create a CLO."
        );
      }
      const { data: result, error } = await supabase
        .from("learning_outcomes")
        .insert({
          ...cloFields,
          type: "CLO",
          institution_id: institutionId,
        } as never)
        .select()
        .single();

      if (error) throw error;

      const clo = result as LearningOutcome;

      // Insert PLO mappings if provided
      if (plo_mappings && plo_mappings.length > 0) {
        const rows = plo_mappings.map((m) => ({
          source_outcome_id: m.plo_id,
          target_outcome_id: clo.id,
          weight: m.weight,
        }));

        const { error: mappingError } = await supabase
          .from("outcome_mappings")
          .insert(rows);

        if (mappingError) throw mappingError;
      }

      await logAuditEvent({
        action: "create",
        entity_type: "clo",
        entity_id: clo.id,
        changes: data,
        performed_by: user?.id ?? "unknown",
      });

      return clo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeMappings.lists(),
      });
    },
  });
};

// ─── useUpdateCLO — update CLO fields + optional PLO mapping replacement ────

export const useUpdateCLO = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      data: Partial<CreateCLOFormData>
    ): Promise<LearningOutcome> => {
      const { plo_mappings, ...cloFields } = data;

      const { data: result, error } = await supabase
        .from("learning_outcomes")
        .update(cloFields)
        .eq("id", id)
        .eq("type", "CLO")
        .select()
        .single();

      if (error) throw error;

      // Replace PLO mappings if provided
      if (plo_mappings !== undefined) {
        const { error: deleteError } = await supabase
          .from("outcome_mappings")
          .delete()
          .eq("target_outcome_id", id);

        if (deleteError) throw deleteError;

        if (plo_mappings.length > 0) {
          const rows = plo_mappings.map((m) => ({
            source_outcome_id: m.plo_id,
            target_outcome_id: id,
            weight: m.weight,
          }));

          const { error: insertError } = await supabase
            .from("outcome_mappings")
            .insert(rows);

          if (insertError) throw insertError;
        }
      }

      await logAuditEvent({
        action: "update",
        entity_type: "clo",
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? "unknown",
      });

      return result as LearningOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.detail(id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeMappings.lists(),
      });
    },
  });
};

// ─── useDeleteCLO — delete mappings then CLO ────────────────────────────────

export const useDeleteCLO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error: cloError } = await supabase
        .from("learning_outcomes")
        .select("id")
        .eq("id", id)
        .eq("type", "CLO")
        .single();

      if (cloError) throw cloError;

      // Validate the mapping lookup before removing this CLO's parent edges.
      const { error: depsError } = await supabase
        .from("outcome_mappings")
        .select("id")
        .eq("target_outcome_id", id);

      if (depsError) throw depsError;

      // Remove outcome_mappings where this CLO is the child
      const { error: deleteMappingsError } = await supabase
        .from("outcome_mappings")
        .delete()
        .eq("target_outcome_id", id);

      if (deleteMappingsError) throw deleteMappingsError;

      // Delete the CLO itself
      const { error } = await supabase
        .from("learning_outcomes")
        .delete()
        .eq("id", id)
        .eq("type", "CLO")
        .select("id")
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "delete",
        entity_type: "clo",
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? "unknown",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeMappings.lists(),
      });
    },
  });
};

// ─── useReorderCLOs — batch update sort_order ───────────────────────────────

export const useReorderCLOs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      items: Array<{ id: string; sort_order: number }>;
    }): Promise<void> => {
      await Promise.all(
        data.items.map(async (item, index) => {
          const { error } = await supabase
            .from("learning_outcomes")
            .update({ sort_order: index })
            .eq("id", item.id)
            .eq("type", "CLO")
            .select("id")
            .single();

          if (error) throw error;
        })
      );

      // Req 13.5 — admin mutation must write an audit log row. Mirrors the
      // pattern in useILOs.useReorderILOs. Batch ID is 'batch' because the
      // changes payload carries the full item list for traceability.
      await logAuditEvent({
        action: "reorder",
        entity_type: "clo",
        entity_id: "batch",
        changes: { items: data.items },
        performed_by: user?.id ?? "unknown",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useCLOMappings — fetch PLO mappings for a CLO ──────────────────────────

export const useCLOMappings = (cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({ cloId }),
    queryFn: async (): Promise<OutcomeMapping[]> => {
      const { data, error } = await supabase
        .from("outcome_mappings")
        .select("*")
        .eq("target_outcome_id", cloId!);

      if (error) throw error;
      return data as OutcomeMapping[];
    },
    enabled: !!cloId,
  });
};

// ─── useUpdateCLOMappings — replace parent PLO → child CLO mappings ─────────

export const useUpdateCLOMappings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      cloId: string;
      mappings: Array<{ source_outcome_id: string; weight: number }>;
    }): Promise<void> => {
      // Delete existing mappings for this CLO
      const { error: deleteError } = await supabase
        .from("outcome_mappings")
        .delete()
        .eq("target_outcome_id", data.cloId);

      if (deleteError) throw deleteError;

      // Insert new mappings
      if (data.mappings.length > 0) {
        const rows = data.mappings.map((m) => ({
          source_outcome_id: m.source_outcome_id,
          target_outcome_id: data.cloId,
          weight: m.weight,
        }));

        const { error: insertError } = await supabase
          .from("outcome_mappings")
          .insert(rows);

        if (insertError) throw insertError;
      }

      // Req 13.5 — admin mutation writes an audit_logs row. The entity is
      // the CLO whose mappings changed; `changes` captures the new mapping
      // set so reviewers can reconstruct before/after without a DB query.
      await logAuditEvent({
        action: "update",
        entity_type: "clo_mappings",
        entity_id: data.cloId,
        changes: { mappings: data.mappings },
        performed_by: user?.id ?? "unknown",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.outcomeMappings.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clos.lists() });
    },
  });
};

// ─── useCLOMappedPLOs — read-only: PLOs mapped to a CLO with titles ─────────
//
// Resolves the PLO (source) title in the same round trip via the
// `outcome_mappings_source_outcome_id_fkey` to-one join (no N+1). Used by the
// read-only CLODetailPage (Req 14.1).

export const useCLOMappedPLOs = (cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({ cloId, view: "mapped-plos" }),
    queryFn: async (): Promise<CLOMappedPLO[]> => {
      const { data, error } = await supabase
        .from("outcome_mappings")
        .select(
          "id, source_outcome_id, weight, plo:learning_outcomes!outcome_mappings_source_outcome_id_fkey(title)"
        )
        .eq("target_outcome_id", cloId!);

      if (error) throw error;

      type Row = {
        id: string;
        source_outcome_id: string;
        weight: number;
        plo: { title: string | null } | null;
      };

      return ((data ?? []) as unknown as Row[]).map((row) => ({
        mapping_id: row.id,
        plo_id: row.source_outcome_id,
        title: row.plo?.title ?? null,
        weight: row.weight,
      }));
    },
    enabled: !!cloId,
  });
};

// ─── useCLOLinkedAssignments — read-only: assignments assessing a CLO ───────
//
// Assignments reference CLOs through the `clo_weights` jsonb array
// (`[{ clo_id, weight }]`), which cannot be filtered server-side. We fetch the
// course's assignments in one query (scoped by `course_id`) and filter in
// memory for those whose `clo_weights` include this CLO — no per-row N+1.

export const useCLOLinkedAssignments = (cloId?: string, courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.assignments.list({ cloId, courseId, view: "by-clo" }),
    queryFn: async (): Promise<CLOLinkedAssignment[]> => {
      let query = supabase
        .from("assignments")
        .select("id, title, due_date, clo_weights")
        .order("due_date", { ascending: true });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      type Row = {
        id: string;
        title: string;
        due_date: string;
        clo_weights: Array<{ clo_id: string; weight: number }> | null;
      };

      return ((data ?? []) as unknown as Row[])
        .map((row) => {
          const match = (row.clo_weights ?? []).find((w) => w.clo_id === cloId);
          if (!match) return null;
          return {
            id: row.id,
            title: row.title,
            due_date: row.due_date,
            weight: match.weight,
          };
        })
        .filter((a): a is CLOLinkedAssignment => a !== null);
    },
    enabled: !!cloId,
  });
};

// ─── useCLOAttainment — read-only: attainment for a CLO ─────────────────────
//
// Reads `outcome_attainment` rows for this CLO at `scope = 'student_course'`
// (the scope at which the attainment rollup trigger writes per-student CLO
// attainment) and returns the mean attainment percent plus the number of
// contributing rows. Returns a null percent when no rows exist so the UI can
// distinguish "no data" from a real 0%.
// (Scope verified against live data 2026-06: CLO rows exist at student_course,
// not course.)

export const useCLOAttainment = (cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.outcomeAttainment.detail(cloId ?? ""),
    queryFn: async (): Promise<CLOAttainmentSummary> => {
      const { data, error } = await supabase
        .from("outcome_attainment")
        .select("attainment_percent")
        .eq("outcome_id", cloId!)
        .eq("scope", "student_course");

      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) {
        return { percent: null, sampleCount: 0 };
      }

      const total = rows.reduce((sum, r) => sum + r.attainment_percent, 0);
      return {
        percent: total / rows.length,
        sampleCount: rows.length,
      };
    },
    enabled: !!cloId,
  });
};

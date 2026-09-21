// =============================================================================
// useCoordinatorAccreditation — real accreditation readiness + approval chain
// =============================================================================
//
// • useCoordinatorAccreditationReadiness reads the RPC's course coverage and
//   declared pack checklist. Null data is distinct from query/contract errors;
//   the UI must not portray either as a completed or empty checklist.
// • useAccreditationApprovals — reads the accreditation_approvals chain
//   (migration 20260823000005) for the institution; returns [] when the table
//   is absent/empty so the screen renders the default four-stage chain.
//
// No client writes here — the approval chain is read-only in this view (advancing
// a stage needs a program-scoped action, a follow-up once approver roles exist).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

import { accreditationReadinessSchema } from "@/lib/accreditationReadiness";
import type { AccreditationReadiness } from "@/lib/accreditationReadiness";
export type {
  AccreditationReadiness,
  AccreditationCourse,
  AccreditationPackItem,
  EvidenceStatus,
} from "@/lib/accreditationReadiness";

export const useCoordinatorAccreditationReadiness = (
  institutionId?: string | null
) => {
  return useQuery({
    queryKey: queryKeys.accreditationReports.list({
      view: "readiness",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AccreditationReadiness | null> => {
      const { data, error } = await supabase.rpc(
        "get_coordinator_accreditation_readiness" as never
      );
      if (error) throw error;
      if (data == null) return null;
      return accreditationReadinessSchema.parse(data);
    },
  });
};

export type ApprovalStageStatus = "done" | "current" | "pending";

export interface AccreditationApprovalRow {
  stage: string;
  status: ApprovalStageStatus;
  sort_order: number;
}

export const useAccreditationApprovals = (institutionId?: string | null) => {
  return useQuery({
    queryKey: queryKeys.accreditationReports.list({
      view: "approvals",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId,
    retry: false,
    queryFn: async (): Promise<AccreditationApprovalRow[]> => {
      try {
        // Table not in generated types yet (migration 20260823000005).
        const { data, error } = await supabase
          .from("accreditation_approvals" as never)
          .select("stage, status, sort_order")
          .eq("institution_id", institutionId ?? "")
          .returns<AccreditationApprovalRow[]>();
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
  });
};

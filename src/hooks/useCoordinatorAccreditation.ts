// =============================================================================
// useCoordinatorAccreditation — real accreditation readiness + approval chain
// =============================================================================
//
// • useCoordinatorAccreditationReadiness — calls the
//   get_coordinator_accreditation_readiness RPC (migration 20260823000004),
//   which derives evidence-coverage readiness + per-course statuses + a pack
//   checklist from REAL data. Returns null on any error (RPC not deployed yet)
//   so the screen falls back to a neutral state.
// • useAccreditationApprovals — reads the accreditation_approvals chain
//   (migration 20260823000005) for the institution; returns [] when the table
//   is absent/empty so the screen renders the default four-stage chain.
//
// Both fail soft against the current prod DB (migrations not applied yet). No
// client writes here — the approval chain is read-only in this view (advancing
// a stage needs a program-scoped action, a follow-up once approver roles exist).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export type EvidenceStatus =
  | "documented"
  | "partial"
  | "blocked"
  | "not_started";

export interface AccreditationCourse {
  code: string;
  name: string;
  status: EvidenceStatus;
}

export interface AccreditationPackItem {
  key: string;
  state: "done" | "prog" | "pending";
}

export interface AccreditationReadiness {
  readinessPercent: number;
  documented: number;
  partial: number;
  blocked: number;
  notStarted: number;
  courses: AccreditationCourse[];
  pack: AccreditationPackItem[];
}

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
      try {
        // RPC not in generated types yet (migration 20260823000004).
        const { data, error } = await supabase.rpc(
          "get_coordinator_accreditation_readiness" as never
        );
        if (error || !data) return null;
        return data as unknown as AccreditationReadiness;
      } catch {
        return null;
      }
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

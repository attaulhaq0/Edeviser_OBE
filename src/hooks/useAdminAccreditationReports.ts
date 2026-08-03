// =============================================================================
// useAdminAccreditationReports — Real Supabase Backend Hook for Accreditation
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ReportTemplate = "ABET" | "HEC" | "Generic";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ProgramOption {
  id: string;
  code: string;
  name: string;
  institution_id: string;
}

export interface SemesterOption {
  id: string;
  name: string;
  academic_year: string;
  is_active: boolean;
}

export interface CourseFileItem {
  id: string;
  code: string;
  name: string;
  status: "documented" | "partial" | "blocked" | "not_started";
  subtitle: string;
  clo_count: number;
}

export interface ApprovalStageItem {
  id: string;
  stage: "coordinator" | "hod" | "qa" | "office";
  label: string;
  sort_order: number;
  status: "done" | "current" | "pending";
  approver_name?: string | null;
  decided_at?: string | null;
}

export interface CQIPlanItem {
  id: string;
  action_title: string;
  target_outcome: string;
  status: "completed" | "in_progress" | "planned";
  impact_note?: string;
}

export interface ReportHistoryItem {
  id: string;
  job_id: string;
  program_name: string;
  template: ReportTemplate;
  created_at: string;
  storage_path: string;
  file_size_bytes?: number;
  status: JobStatus;
}

export interface GenerateReportJobInput {
  program_id: string;
  semester_id?: string;
  template: ReportTemplate;
  email_to?: string;
}

export interface GenerateReportJobResult {
  job_id: string;
  status: JobStatus;
  storage_path: string;
  download_url: string;
}

// ─── Program & Semester Selection Hooks ─────────────────────────────────────

export const useAdminPrograms = () => {
  return useQuery({
    queryKey: ["admin", "programs"],
    queryFn: async (): Promise<ProgramOption[]> => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const { data: profile } = await supabase
        .from("profiles")
        .select("institution_id, role")
        .eq("id", userId)
        .single();

      if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden: Admin access required");
      }

      const { data, error } = await supabase
        .from("programs")
        .select("id, code, name, institution_id")
        .eq("institution_id", profile.institution_id)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProgramOption[];
    },
  });
};

export const useAdminSemesters = () => {
  return useQuery({
    queryKey: ["admin", "semesters"],
    queryFn: async (): Promise<SemesterOption[]> => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("Unauthorized");
      const { data: profile } = await supabase
        .from("profiles")
        .select("institution_id, role")
        .eq("id", userId)
        .single();
      if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden: Admin access required");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("semesters")
        .select("id, name, academic_year, is_active")
        .eq("institution_id", profile.institution_id)
        .order("start_date", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        academic_year: String(s.academic_year ?? "2026-2027"),
        is_active: Boolean(s.is_active),
      }));
    },
  });
};

// ─── Summary & Course Files Hook ────────────────────────────────────────────

export const useAdminAccreditationSummary = (programId?: string) => {
  return useQuery({
    queryKey: ["admin", "accreditationSummary", programId],
    queryFn: async () => {
      // Execute RPC get_coordinator_accreditation_readiness if available
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "get_coordinator_accreditation_readiness" as never
      );

      let summaryData = {
        readinessPercent: 0,
        documented: 0,
        partial: 0,
        blocked: 0,
        notStarted: 0,
        courses: [] as CourseFileItem[],
        packChecklist: [] as Array<{ label: string; ready: boolean }>,
      };

      if (rpcErr) throw rpcErr;
      if (rpcData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = rpcData as any;
        summaryData = {
          readinessPercent: Number(raw.readinessPercent ?? 0),
          documented: Number(raw.documented ?? 0),
          partial: Number(raw.partial ?? 0),
          blocked: Number(raw.blocked ?? 0),
          notStarted: Number(raw.notStarted ?? 0),
          courses: Array.isArray(raw.courses) ? raw.courses : [],
          packChecklist: Array.isArray(raw.pack)
            ? raw.pack.map((item: { key?: string; state?: string }) => ({
                label: item.key ?? "Evidence item",
                ready: item.state === "done",
              }))
            : [],
        };
      }

      // Query live Noor courses for selected program
      let courseQuery = supabase
        .from("courses")
        .select("id, code, name, learning_outcomes(id)");

      if (programId) {
        courseQuery = courseQuery.eq("program_id", programId);
      }

      const { data: coursesData, error: coursesError } = await courseQuery;
      if (coursesError) throw coursesError;

      const courseFiles: CourseFileItem[] = (coursesData ?? []).map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const los = (c as any).learning_outcomes;
        const cloCount = Array.isArray(los) ? los.length : 0;
        const persisted = summaryData.courses.find(
          (course) => course.id === c.id
        );
        const status = persisted?.status ?? "not_started";
        const subtitles: Record<CourseFileItem["status"], string> = {
          documented: "Persisted evidence is complete",
          partial: "Persisted evidence is incomplete",
          blocked: "Persisted evidence has a blocking gap",
          not_started: "No persisted evidence status",
        };

        return {
          id: c.id,
          code: c.code,
          name: c.name,
          status,
          subtitle: subtitles[status],
          clo_count: cloCount,
        };
      });

      if (courseFiles.length > 0) {
        summaryData.courses = courseFiles;
      }

      return summaryData;
    },
    enabled: true,
  });
};

// ─── Approval Workflow Hook ─────────────────────────────────────────────────

export const useAccreditationApprovalStages = (programId?: string) => {
  return useQuery({
    queryKey: ["admin", "approvalStages", programId],
    queryFn: async (): Promise<ApprovalStageItem[]> => {
      if (!programId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("accreditation_approvals")
        .select("*")
        .eq("program_id", programId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const stageLabels: Record<string, string> = {
        coordinator: "Coordinator",
        hod: "HOD",
        qa: "QA",
        office: "Accred. Office",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((row) => ({
        id: row.id,
        stage: row.stage,
        label: stageLabels[row.stage] ?? row.stage,
        sort_order: row.sort_order ?? 1,
        status:
          row.status === "done"
            ? "done"
            : row.status === "current"
            ? "current"
            : "pending",
        approver_name: row.notes,
        decided_at: row.decided_at,
      }));
    },
    enabled: true,
  });
};

// ─── CQI Action Plans Hook ──────────────────────────────────────────────────

export const useAccreditationCQIPlans = (programId?: string) => {
  return useQuery({
    queryKey: ["admin", "cqiPlans", programId],
    queryFn: async (): Promise<CQIPlanItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cqiQuery = (supabase as any)
        .from("cqi_action_plans")
        .select(
          "id, action_description, status, outcome_id, target_attainment, result_attainment, evidence_of_improvement, learning_outcomes(title)"
        );
      if (programId) cqiQuery = cqiQuery.eq("program_id", programId);
      const { data, error } = await cqiQuery.limit(5);
      if (error) throw error;

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data as any[]).map((row) => ({
          id: row.id,
          action_title: row.action_description,
          target_outcome:
            row.learning_outcomes?.title ??
            row.outcome_id ??
            "Unlinked outcome",
          status:
            row.status === "completed"
              ? "completed"
              : row.status === "in_progress"
              ? "in_progress"
              : "planned",
          impact_note:
            row.evidence_of_improvement ??
            (row.result_attainment != null
              ? `Result attainment: ${row.result_attainment}%`
              : undefined),
        }));
      }

      // Empty means no persisted CQI plan exists. Do not manufacture plans for
      // the accreditation screen.
      return [];
    },
  });
};

// ─── Report History & Download Hook ──────────────────────────────────────────

export const useAccreditationReportHistory = () => {
  return useQuery({
    queryKey: ["admin", "reportHistory"],
    queryFn: async (): Promise<ReportHistoryItem[]> => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const { data: profile } = await supabase
        .from("profiles")
        .select("institution_id, role")
        .eq("id", userId)
        .single();

      if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden: Admin access required");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: jobs, error: jobsError } = await (supabase as any)
        .from("accreditation_report_jobs")
        .select(
          "id, program_id, template, created_at, status, storage_path, programs(name)"
        )
        .eq("institution_id", profile.institution_id)
        .not("storage_path", "is", null)
        .order("created_at", { ascending: false });
      if (jobsError) throw jobsError;

      if (!jobs || jobs.length === 0) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (jobs as any[])
        .filter((j) => typeof j.storage_path === "string")
        .map((j) => ({
          id: j.id,
          job_id: j.id,
          program_name: j.programs?.name ?? "Unnamed program",
          template: (j.template as ReportTemplate) ?? "ABET",
          created_at: j.created_at,
          storage_path: j.storage_path,
          status: (j.status as JobStatus) ?? "completed",
        }));
    },
  });
};

// ─── Generate Report Job Worker Mutation ─────────────────────────────────────

export const useGenerateAdminAccreditationReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: GenerateReportJobInput
    ): Promise<GenerateReportJobResult> => {
      const { data, error } = await supabase.functions.invoke(
        "generate-accreditation-report",
        { body: input }
      );
      if (error) throw error;

      const result = data as Partial<GenerateReportJobResult> & {
        success?: boolean;
        error?: string;
      };
      if (
        !result?.success ||
        !result.job_id ||
        !result.storage_path ||
        !result.download_url
      ) {
        throw new Error(result?.error ?? "Report generation failed");
      }

      return {
        job_id: result.job_id,
        status: "completed",
        storage_path: result.storage_path,
        download_url: result.download_url,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reportHistory"] });
    },
  });
};

// ─── Signed URL Resolution Helper ───────────────────────────────────────────

export const getSignedReportDownloadUrl = async (
  storagePath: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return `https://cdlgtbvxlxjpcddjazzx.supabase.co/storage/v1/object/public/reports/${storagePath}`;
  }

  return data.signedUrl;
};

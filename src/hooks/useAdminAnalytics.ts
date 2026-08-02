// =============================================================================
// useAdminAnalytics — Institution-scoped Admin Analytics Hook
// Requirements: 1, 2, 3, 4, 5
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface WeeklyActiveLearnersPoint {
  week: string;
  activeLearners: number;
  eligibleLearners: number;
  activePercent: number;
}

export interface MasteryDistributionData {
  excellentPercent: number;
  satisfactoryPercent: number;
  developingPercent: number;
  notYetPercent: number;
  unmeasuredPercent: number;
}

export interface RetentionRiskData {
  onTrack: number;
  watch: number;
  atRisk: number;
  total: number;
}

export interface DepartmentAnalyticsRow {
  departmentName: string;
  learners: number;
  activePercent: number;
  masteryPercent: number;
  trend: "up" | "down" | "stable";
}

export interface AICopilotPerformanceData {
  hasSufficientData: boolean;
  suggestionAcceptanceRate: number;
  suggestionTotal: number;
  predictionAccuracyRate: number;
  predictionTotal: number;
  draftAcceptanceRate: number;
  draftTotal: number;
}

export interface PLOHeatmapCard {
  ploId: string;
  ploCodeTitle: string;
  meanAttainment: number; // -1 for unmeasured
  derivationLabel: string;
  statusBand:
    | "excellent"
    | "satisfactory"
    | "developing"
    | "notYet"
    | "unmeasured";
}

export interface AdminAnalyticsData {
  weeklyActiveLearners: WeeklyActiveLearnersPoint[];
  masteryDistribution: MasteryDistributionData;
  retentionRisk: RetentionRiskData;
  departments: DepartmentAnalyticsRow[];
  aiCopilotPerformance: AICopilotPerformanceData;
  ploAttainment: PLOHeatmapCard[];
  calculatedAt: string;
}

interface DepartmentProgramRecord {
  courses?: Array<{
    student_courses?: Array<{ student_id: string }>;
  }>;
}

interface DepartmentRecord {
  name: string;
  programs?: DepartmentProgramRecord[];
}

/** Minimum cohort size threshold for privacy protection (Req 4). */
export const MIN_COHORT_THRESHOLD = 3;

export const useAdminAnalytics = (
  dateFrom?: string,
  dateTo?: string,
  options?: { enabled?: boolean }
) => {
  const { user, profile, institutionId } = useAuth();
  const isAdmin = profile?.role === "admin";

  return useQuery({
    queryKey: [
      "admin",
      "analytics",
      institutionId ?? "",
      dateFrom ?? "",
      dateTo ?? "",
    ],
    enabled: !!user && isAdmin && !!institutionId && (options?.enabled ?? true),
    queryFn: async (): Promise<AdminAnalyticsData> => {
      if (!institutionId || !isAdmin) {
        throw new Error("Forbidden: Caller is not an active Admin");
      }

      // Try RPC first
      // Let PostgreSQL apply the function defaults for the normal dashboard
      // view. Sending explicit nulls makes PostgREST attempt to coerce a null
      // date argument on some deployed schemas and returns a 400 before the
      // function runs. Only send parameters when the caller selected a range.
      const rpcArgs =
        dateFrom || dateTo
          ? {
              p_date_from: dateFrom ?? null,
              p_date_to: dateTo ?? null,
            }
          : {};
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "get_admin_analytics" as never,
        rpcArgs as never
      );

      if (!rpcErr && rpcData) {
        return rpcData as unknown as AdminAnalyticsData;
      }

      // ─── Institution-Scoped Direct Query Fallback ─────────────────────────

      // 1. Total Students in Institution
      const { count: studentCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("role", "student");

      const totalStudents = studentCount ?? 0;

      // 2. Weekly Active Learners (last 5 weeks)
      const now = new Date();
      const weeklyActiveLearners: WeeklyActiveLearnersPoint[] = [];

      // Weekly activity is based on dated activity events, never on active
      // enrolments or fabricated ratios.
      const { data: studentsInInstitution } = await supabase
        .from("profiles")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("role", "student");
      const institutionStudentIds = (studentsInInstitution ?? []).map(
        (student) => student.id
      );
      const { data: activityEvents } = institutionStudentIds.length
        ? await supabase
            .from("student_activity_log")
            .select("student_id, created_at")
            .in("student_id", institutionStudentIds)
            .gte(
              "created_at",
              new Date(now.getTime() - 35 * 86400000).toISOString()
            )
        : { data: [] };

      const activeStudentSetPerWeek: Array<Set<string>> = [
        new Set(),
        new Set(),
        new Set(),
        new Set(),
        new Set(),
      ];

      (activityEvents ?? []).forEach((sess) => {
        if (sess.created_at && sess.student_id) {
          const sessDate = new Date(sess.created_at);
          const diffDays =
            (now.getTime() - sessDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays >= 0 && diffDays <= 35) {
            const weekIdx = 4 - Math.floor(diffDays / 7);
            if (weekIdx >= 0 && weekIdx < 5) {
              const weekSet = activeStudentSetPerWeek[weekIdx];
              if (weekSet) weekSet.add(sess.student_id);
            }
          }
        }
      });

      const weekLabels = ["W1", "W2", "W3", "W4", "Now"];
      for (let w = 0; w < 5; w++) {
        const weekSet = activeStudentSetPerWeek[w];
        const activeCount = weekSet?.size ?? 0;
        const pct =
          totalStudents > 0
            ? Math.round((activeCount / totalStudents) * 100)
            : 0;

        weeklyActiveLearners.push({
          week: weekLabels[w] ?? `W${w + 1}`,
          activeLearners: activeCount,
          eligibleLearners: totalStudents,
          activePercent: pct,
        });
      }

      // 3. Mastery Distribution & Outcome Attainment
      const { data: attainments } = await supabase
        .from("outcome_attainment")
        .select("student_id, outcome_id, attainment_percent");

      const studentMasteryMap: Record<string, number[]> = {};
      (attainments ?? []).forEach((a) => {
        if (a.student_id && a.attainment_percent != null) {
          if (!studentMasteryMap[a.student_id])
            studentMasteryMap[a.student_id] = [];
          studentMasteryMap[a.student_id]!.push(a.attainment_percent);
        }
      });

      let excellent = 0;
      let satisfactory = 0;
      let developing = 0;
      let notYet = 0;
      let unmeasured = 0;

      const { data: allStudents } = await supabase
        .from("profiles")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("role", "student");

      (allStudents ?? []).forEach((s) => {
        const scores = studentMasteryMap[s.id];
        if (!scores || scores.length === 0) {
          unmeasured++;
        } else {
          const avg = scores.reduce((sum, v) => sum + v, 0) / scores.length;
          if (avg >= 90) excellent++;
          else if (avg >= 80) satisfactory++;
          else if (avg >= 70) developing++;
          else notYet++;
        }
      });

      const measuredTotal = totalStudents || 1;
      const masteryDistribution: MasteryDistributionData = {
        excellentPercent: Math.round((excellent / measuredTotal) * 100),
        satisfactoryPercent: Math.round((satisfactory / measuredTotal) * 100),
        developingPercent: Math.round((developing / measuredTotal) * 100),
        notYetPercent: Math.round((notYet / measuredTotal) * 100),
        unmeasuredPercent: Math.round((unmeasured / measuredTotal) * 100),
      };

      // 4. Retention Risk (sums strictly to total student count)
      const recentActivity = new Set(
        (activityEvents ?? [])
          .filter(
            (event) =>
              new Date(event.created_at).getTime() >=
              now.getTime() - 14 * 86400000
          )
          .map((event) => event.student_id)
      );
      const studentAverages = new Map<string, number>();
      for (const [studentId, scores] of Object.entries(studentMasteryMap)) {
        studentAverages.set(
          studentId,
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
      }
      let onTrackCount = 0;
      let watchCount = 0;
      let atRiskCount = 0;
      for (const studentId of institutionStudentIds) {
        const average = studentAverages.get(studentId);
        if (average == null) continue;
        if (average < 50 || !recentActivity.has(studentId)) atRiskCount++;
        else if (average < 70) watchCount++;
        else onTrackCount++;
      }

      const retentionRisk: RetentionRiskData = {
        onTrack: onTrackCount,
        watch: watchCount,
        atRisk: atRiskCount,
        total: totalStudents,
      };

      // 5. Departments
      const { data: departmentsData } = await supabase
        .from("departments")
        .select(
          "id, name, programs:programs(id, name, courses:courses(id, name, student_courses(student_id)))"
        )
        .eq("institution_id", institutionId);

      const departmentRecords = (departmentsData ??
        []) as unknown as DepartmentRecord[];
      const departments: DepartmentAnalyticsRow[] = departmentRecords.map(
        (d) => {
          const studentSet = new Set<string>();
          d.programs?.forEach((p) => {
            p.courses?.forEach(
              (c: { student_courses?: Array<{ student_id: string }> }) => {
                c.student_courses?.forEach((sc) =>
                  studentSet.add(sc.student_id)
                );
              }
            );
          });

          const learnerCount = studentSet.size;
          const isSuppressed =
            learnerCount > 0 && learnerCount < MIN_COHORT_THRESHOLD;

          return {
            departmentName: d.name,
            learners: isSuppressed ? 0 : learnerCount,
            activePercent:
              learnerCount > 0
                ? Math.round(
                    ([
                      ...new Set(
                        (activityEvents ?? [])
                          .filter((event) => studentSet.has(event.student_id))
                          .map((event) => event.student_id)
                      ),
                    ].length /
                      learnerCount) *
                      100
                  )
                : 0,
            masteryPercent: 0,
            trend: "stable",
          };
        }
      );

      // 6. AI Co-Pilot Governance Performance
      const { data: aiFeedback, error: aiFeedbackError } = await supabase
        .from("ai_feedback")
        .select("suggestion_type, feedback, validated_outcome, student_id");
      if (aiFeedbackError) throw aiFeedbackError;

      const suggestions = (aiFeedback ?? []).filter(
        (event) => event.suggestion_type === "module_suggestion"
      );
      const predictions = (aiFeedback ?? []).filter(
        (event) =>
          event.suggestion_type === "at_risk_prediction" &&
          event.validated_outcome !== null
      );
      const drafts = (aiFeedback ?? []).filter(
        (event) => event.suggestion_type === "feedback_draft"
      );
      const aiCopilotPerformance: AICopilotPerformanceData = {
        hasSufficientData:
          suggestions.length >= 5 ||
          predictions.length >= 5 ||
          drafts.length >= 5,
        suggestionAcceptanceRate: suggestions.length
          ? Math.round(
              (suggestions.filter((event) => event.feedback === "thumbs_up")
                .length /
                suggestions.length) *
                100
            )
          : 0,
        suggestionTotal: suggestions.length,
        predictionAccuracyRate: predictions.length
          ? Math.round(
              (predictions.filter(
                (event) => event.validated_outcome === "correct"
              ).length /
                predictions.length) *
                100
            )
          : 0,
        predictionTotal: predictions.length,
        draftAcceptanceRate: drafts.length
          ? Math.round(
              (drafts.filter((event) => event.feedback === "thumbs_up").length /
                drafts.length) *
                100
            )
          : 0,
        draftTotal: drafts.length,
      };

      // 7. PLO Attainment Heatmap
      const { data: plos } = await supabase
        .from("learning_outcomes")
        .select("id, title, program_id")
        .eq("institution_id", institutionId)
        .eq("type", "PLO")
        .order("title", { ascending: true });

      const ploAttainment: PLOHeatmapCard[] = (plos ?? []).map((plo) => {
        const ploScores = (attainments ?? [])
          .filter((a) => a.student_id && a.outcome_id === plo.id)
          .map((a) => a.attainment_percent)
          .filter((v): v is number => v != null);

        const hasScores = ploScores.length > 0;
        const meanAtt = hasScores
          ? Math.round(ploScores.reduce((a, b) => a + b, 0) / ploScores.length)
          : -1;

        let statusBand: PLOHeatmapCard["statusBand"] = "unmeasured";
        if (meanAtt >= 85) statusBand = "excellent";
        else if (meanAtt >= 70) statusBand = "satisfactory";
        else if (meanAtt >= 50) statusBand = "developing";
        else if (meanAtt >= 0) statusBand = "notYet";

        return {
          ploId: plo.id,
          ploCodeTitle: plo.title,
          meanAttainment: meanAtt,
          derivationLabel: hasScores
            ? "live attainment evidence"
            : "unmeasured",
          statusBand,
        };
      });

      return {
        weeklyActiveLearners,
        masteryDistribution,
        retentionRisk,
        departments,
        aiCopilotPerformance,
        ploAttainment,
        calculatedAt: new Date().toISOString(),
      };
    },
  });
};

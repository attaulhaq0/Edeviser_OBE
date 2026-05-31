// Task 49: Student Learning Portfolio hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  parsePortfolioAccessStatus,
  type PortfolioAccessStatus,
} from "@/lib/portfolioAccess";
import type { BloomsLevel, AttainmentLevel } from "@/types/app";

export interface PortfolioCLO {
  clo_id: string;
  clo_title: string;
  blooms_level: BloomsLevel;
  attainment_percent: number;
  attainment_level: AttainmentLevel;
  course_name: string;
}

export interface PortfolioBadge {
  badge_key: string;
  badge_name: string;
  emoji: string;
  awarded_at: string;
}

export interface PortfolioJournal {
  id: string;
  content_preview: string;
  created_at: string;
  course_name: string | null;
}

export interface XPTimelinePoint {
  date: string;
  cumulative_xp: number;
}

export interface SemesterAttainment {
  semester_name: string;
  average_attainment: number;
}

export interface PortfolioData {
  clos: PortfolioCLO[];
  badges: PortfolioBadge[];
  journals: PortfolioJournal[];
  xpTimeline: XPTimelinePoint[];
  semesterAttainments: SemesterAttainment[];
  totalXP: number;
  level: number;
}

export interface PublicPortfolioData {
  full_name: string;
  badges: PortfolioBadge[];
  clos: Array<{ clo_title: string; attainment_level: AttainmentLevel }>;
  totalXP: number;
  level: number;
}

function classifyAttainment(p: number): AttainmentLevel {
  if (p >= 85) return "Excellent";
  if (p >= 70) return "Satisfactory";
  if (p >= 50) return "Developing";
  return "Not_Yet";
}

export const usePortfolio = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({
      scope: "portfolio",
      studentId,
    }),
    queryFn: async (): Promise<PortfolioData> => {
      if (!studentId) throw new Error("studentId required");

      // CLO mastery
      const { data: attainments } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent, course_id")
        .eq("student_id", studentId)
        .eq("scope", "student_course");

      const outcomeIds = (attainments ?? []).map((a) => a.outcome_id);
      const courseIds = [
        ...new Set(
          (attainments ?? [])
            .map((a) => a.course_id)
            .filter((id): id is string => id != null)
        ),
      ];

      const { data: outcomes } =
        outcomeIds.length > 0
          ? await supabase
              .from("learning_outcomes")
              .select("id, title, blooms_level, course_id")
              .in("id", outcomeIds)
          : { data: [] };

      const { data: courses } =
        courseIds.length > 0
          ? await supabase
              .from("courses")
              .select("id, name, semester_id")
              .in("id", courseIds)
          : { data: [] };

      const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
      const outcomeMap = new Map((outcomes ?? []).map((o) => [o.id, o]));

      const clos: PortfolioCLO[] = (attainments ?? []).map((a) => {
        const o = outcomeMap.get(a.outcome_id);
        const c = courseMap.get(a.course_id ?? "");
        return {
          clo_id: a.outcome_id,
          clo_title: o?.title ?? "Unknown",
          blooms_level: (o?.blooms_level ?? "remembering") as BloomsLevel,
          attainment_percent: a.attainment_percent,
          attainment_level: classifyAttainment(a.attainment_percent),
          course_name: c?.name ?? "Unknown",
        };
      });

      // Badges
      const { data: badges } = await supabase
        .from("badges")
        .select("badge_key, badge_name, emoji, awarded_at")
        .eq("student_id", studentId)
        .order("awarded_at", { ascending: false });

      // Journals
      const { data: journalRows } = await supabase
        .from("journal_entries")
        .select("id, content, created_at, course_id")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);

      const journalCourseIds = [
        ...new Set(
          (journalRows ?? [])
            .map((j) => j.course_id)
            .filter((id): id is string => id != null)
        ),
      ];
      const { data: jCourses } =
        journalCourseIds.length > 0
          ? await supabase
              .from("courses")
              .select("id, name")
              .in("id", journalCourseIds)
          : { data: [] };
      const jCourseMap = new Map((jCourses ?? []).map((c) => [c.id, c.name]));

      const journals: PortfolioJournal[] = (journalRows ?? []).map((j) => ({
        id: j.id,
        content_preview: j.content
          ? j.content.slice(0, 80) + (j.content.length > 80 ? "..." : "")
          : "",
        created_at: j.created_at,
        course_name: jCourseMap.get(j.course_id) ?? null,
      }));

      // XP timeline
      const { data: xpRows } = await supabase
        .from("xp_transactions")
        .select("xp_amount, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      let cumulative = 0;
      const dateMap = new Map<string, number>();
      for (const row of xpRows ?? []) {
        cumulative += row.xp_amount;
        const date = (row.created_at as string).slice(0, 10);
        dateMap.set(date, cumulative);
      }
      const xpTimeline: XPTimelinePoint[] = Array.from(dateMap.entries()).map(
        ([date, xp]) => ({
          date,
          cumulative_xp: xp,
        })
      );

      // Semester-over-semester attainment averages
      const semesterIds = [
        ...new Set(
          (courses ?? [])
            .map((c) => c.semester_id)
            .filter((id): id is string => id != null)
        ),
      ];
      const { data: semesters } =
        semesterIds.length > 0
          ? await supabase
              .from("semesters")
              .select("id, name")
              .in("id", semesterIds)
          : { data: [] };
      const semesterMap = new Map((semesters ?? []).map((s) => [s.id, s.name]));

      const semesterTotals = new Map<
        string,
        { sum: number; count: number; name: string }
      >();
      for (const a of attainments ?? []) {
        const c = courseMap.get(a.course_id ?? "");
        const semId = c?.semester_id;
        if (!semId) continue;
        const existing = semesterTotals.get(semId) ?? {
          sum: 0,
          count: 0,
          name: semesterMap.get(semId) ?? semId,
        };
        existing.sum += a.attainment_percent;
        existing.count += 1;
        semesterTotals.set(semId, existing);
      }
      const semesterAttainments: SemesterAttainment[] = Array.from(
        semesterTotals.entries()
      ).map(([, v]) => ({
        semester_name: v.name,
        average_attainment: Math.round(v.sum / v.count),
      }));

      // Gamification
      const { data: gam } = await supabase
        .from("student_gamification")
        .select("xp_total, level")
        .eq("student_id", studentId)
        .maybeSingle();

      return {
        clos,
        badges: (badges ?? []) as PortfolioBadge[],
        journals,
        xpTimeline,
        semesterAttainments,
        totalXP: gam?.xp_total ?? 0,
        level: gam?.level ?? 1,
      };
    },
    enabled: !!studentId,
  });
};

/**
 * Reads the current user's admin-granted `portfolio_sharing_permitted` flag.
 *
 * This permission is granted only by an administrator (the privileged-column
 * preservation trigger blocks non-admin self-grants), so a student cannot turn
 * it on themselves. Public portfolio sharing is gated on this flag.
 */
export const usePortfolioSharingPermission = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.profiles.list({
      scope: "sharing-permission",
      userId,
    }),
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("portfolio_sharing_permitted")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.portfolio_sharing_permitted ?? false;
    },
    enabled: !!userId,
  });
};

export interface TogglePortfolioPublicVariables {
  userId: string;
  isPublic: boolean;
}

export interface TogglePortfolioPublicResult {
  /** Whether the user has admin-granted permission to share publicly. */
  permitted: boolean;
  /** The `portfolio_public` value actually persisted after the toggle. */
  isPublic: boolean;
}

/**
 * Toggle `portfolio_public` on the profiles table.
 *
 * Enabling public sharing is only effective when the user has been granted
 * `portfolio_sharing_permitted` by an administrator. When permission is absent,
 * the portfolio is kept private (persisted as `false`) and the result reports
 * `permitted: false` so the UI can explain that school permission is required.
 * Disabling public sharing is always honored.
 */
export const useTogglePortfolioPublic = () => {
  const queryClient = useQueryClient();
  return useMutation<
    TogglePortfolioPublicResult,
    Error,
    TogglePortfolioPublicVariables
  >({
    mutationFn: async ({ userId, isPublic }) => {
      // Re-check the admin-granted permission at the data layer so the toggle is
      // never the sole gatekeeper. The flag cannot be self-granted (protected by
      // the privileged-column preservation trigger).
      const { data: profile, error: readError } = await supabase
        .from("profiles")
        .select("portfolio_sharing_permitted")
        .eq("id", userId)
        .maybeSingle();
      if (readError) throw readError;

      const permitted = profile?.portfolio_sharing_permitted ?? false;
      // Public sharing only takes effect with permission; otherwise stay private.
      const effectivePublic = isPublic && permitted;

      const { error } = await supabase
        .from("profiles")
        .update({ portfolio_public: effectivePublic })
        .eq("id", userId);
      if (error) throw error;

      return { permitted, isPublic: effectivePublic };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentGamification.lists(),
      });
    },
  });
};

/**
 * Public-portfolio access discriminator (R24.3 / R24.3a / R24.4).
 *
 * Calls the `portfolio_public_access` SECURITY DEFINER RPC, which returns an
 * authorization token (`authorized | forbidden | not_found`) WITHOUT leaking
 * any portfolio content. The route maps this status to render / 403 / 404 via
 * `mapPortfolioAccessToRoute`, so an existing-but-unauthorized portfolio is a
 * 403 (never collapsed into a 404) and a missing one is a 404.
 *
 * The actual portfolio content is fetched separately and always runs under RLS
 * (see `usePublicPortfolio`), so unauthorized content is never returned even if
 * this discriminator were bypassed. The raw RPC value crosses the network as
 * `text`; `parsePortfolioAccessStatus` narrows it conservatively (any
 * unexpected value becomes `forbidden`, which maps to 403 and never renders).
 */
export const usePortfolioAccess = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({
      scope: "public-portfolio-access",
      studentId,
    }),
    queryFn: async (): Promise<PortfolioAccessStatus> => {
      if (!studentId) return "not_found";
      const { data, error } = await supabase.rpc("portfolio_public_access", {
        p_student_id: studentId,
      });
      if (error) throw error;
      return parsePortfolioAccessStatus(data);
    },
    enabled: !!studentId,
  });
};

/**
 * Public portfolio query — no auth required, reads only non-sensitive data.
 *
 * Gated by `enabled` so the content query only runs once the access
 * discriminator has authorized the request; content nonetheless always runs
 * under RLS as defense-in-depth.
 */
export const usePublicPortfolio = (
  studentId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.list({
      scope: "public-portfolio",
      studentId,
    }),
    queryFn: async (): Promise<PublicPortfolioData | null> => {
      if (!studentId) return null;

      // Check if portfolio is public
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, portfolio_public")
        .eq("id", studentId)
        .maybeSingle();

      if (!profile?.portfolio_public) return null;

      // Badges
      const { data: badges } = await supabase
        .from("badges")
        .select("badge_key, badge_name, emoji, awarded_at")
        .eq("student_id", studentId)
        .order("awarded_at", { ascending: false });

      // CLO attainment levels (non-sensitive: just titles + levels, no percentages)
      const { data: attainments } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent")
        .eq("student_id", studentId)
        .eq("scope", "student_course");

      const outcomeIds = (attainments ?? []).map((a) => a.outcome_id);
      const { data: outcomes } =
        outcomeIds.length > 0
          ? await supabase
              .from("learning_outcomes")
              .select("id, title")
              .in("id", outcomeIds)
          : { data: [] };
      const outcomeMap = new Map((outcomes ?? []).map((o) => [o.id, o.title]));

      const clos = (attainments ?? []).map((a) => ({
        clo_title: outcomeMap.get(a.outcome_id) ?? "Unknown",
        attainment_level: classifyAttainment(a.attainment_percent),
      }));

      // Gamification totals
      const { data: gam } = await supabase
        .from("student_gamification")
        .select("xp_total, level")
        .eq("student_id", studentId)
        .maybeSingle();

      return {
        full_name: profile.full_name ?? "",
        badges: (badges ?? []) as PortfolioBadge[],
        clos,
        totalXP: gam?.xp_total ?? 0,
        level: gam?.level ?? 1,
      };
    },
    enabled: !!studentId && (options?.enabled ?? true),
  });
};

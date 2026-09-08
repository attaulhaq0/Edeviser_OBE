// =============================================================================
// useCLOFormSuggestions — 7.8 in-form CLO suggestions (teacher CLOForm)
// =============================================================================
// Surfaces CLO candidates from the coordinator's APPROVED curriculum-ingest
// proposals as one-click suggestion chips in the teacher's CLO creation form.
// Reads agent_action_proposals strictly through the sanctioned orchestrator
// channel is not needed here — the teacher reads the executed proposal via
// the ingest result stored in `agent_action_executions.result` (sanctioned
// service path is the orchestrator; the client reads only via RLS-scoped
// joins executed by the RPC at execution time). Instead, the suggestions come
// from the most recently executed ingest for the course, exposed by the
// sanctioned `get_curriculum_ingest_suggestions_v1` RPC (RLS + coordinator/
// teacher scoping enforced server-side).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CLOSuggestion {
  readonly titleEn: string;
  readonly titleAr: string | null;
  readonly descriptionEn: string | null;
  readonly blooms: number;
}

const bounded = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, max)
    : null;

const parseSuggestions = (value: unknown): CLOSuggestion[] => {
  if (!Array.isArray(value)) return [];
  const out: CLOSuggestion[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const c = entry as Record<string, unknown>;
    const titleEn = bounded(c.title_en, 300);
    if (!titleEn) continue;
    out.push({
      titleEn,
      titleAr: bounded(c.title_ar, 300),
      descriptionEn: bounded(c.description_en, 1000),
      blooms:
        typeof c.blooms === "number" && c.blooms >= 1 && c.blooms <= 6
          ? c.blooms
          : 3,
    });
    if (out.length >= 15) break;
  }
  return out;
};

export const useCLOSuggestions = (
  courseId: string | undefined,
  enabled: boolean
) => {
  return useQuery({
    // Identity is embedded by RLS server-side; cache key is course-scoped so
    // suggestions can never leak across courses.
    queryKey: ["curriculum-ingest-suggestions", courseId],
    queryFn: async (): Promise<CLOSuggestion[]> => {
      if (!courseId) return [];
      const { data, error } = await supabase.rpc(
        "get_curriculum_ingest_suggestions_v1",
        { p_course_id: courseId }
      );
      if (error) throw error;
      return parseSuggestions(data);
    },
    enabled: enabled && !!courseId,
    staleTime: 60_000,
    retry: false,
  });
};
// =============================================================================
// useCurriculumIngest — 7.8 curriculum ingestion client (coordinator)
// =============================================================================
// Invokes the bounded `curriculum-ingest` edge function: paste-in syllabus →
// DeepSeek extraction of candidate CLOs grounded in the program's real
// PLO/ILO ids → DRY-RUN coordinator-approval proposal. The response is
// untrusted — every field passes a guard before it reaches the UI.
// =============================================================================

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CurriculumCandidate {
  readonly titleEn: string;
  readonly titleAr: string | null;
  readonly descriptionEn: string | null;
  readonly blooms: number;
  readonly ploId: string | null;
  readonly ploWeight: number | null;
  readonly iloId: string | null;
  readonly iloWeight: number | null;
}

export interface CurriculumIngestResult {
  readonly runId: string;
  readonly proposalId: string;
  readonly candidateCount: number;
  readonly candidates: readonly CurriculumCandidate[];
  readonly summary: string;
  readonly model: string;
}

const boundedString = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, max)
    : null;

const parseResult = (value: unknown): CurriculumIngestResult | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.runId !== "string" ||
    typeof record.proposalId !== "string" ||
    !Array.isArray(record.candidates)
  ) {
    return null;
  }
  const candidates: CurriculumCandidate[] = [];
  for (const entry of record.candidates) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const c = entry as Record<string, unknown>;
    const titleEn = boundedString(c.title_en ?? c.titleEn, 300);
    if (!titleEn) continue;
    candidates.push({
      titleEn,
      titleAr: boundedString(c.title_ar ?? c.titleAr, 300),
      descriptionEn: boundedString(c.description_en ?? c.descriptionEn, 1000),
      blooms:
        typeof c.blooms === "number" && Number.isInteger(c.blooms) && c.blooms >= 1 && c.blooms <= 6
          ? c.blooms
          : 3,
      ploId: boundedString(c.plo_id ?? c.ploId, 64),
      ploWeight:
        typeof c.plo_weight === "number"
          ? c.plo_weight
          : typeof c.ploWeight === "number"
            ? c.ploWeight
            : null,
      iloId: boundedString(c.ilo_id ?? c.iloId, 64),
      iloWeight:
        typeof c.ilo_weight === "number"
          ? c.ilo_weight
          : typeof c.iloWeight === "number"
            ? c.iloWeight
            : null,
    });
  }
  if (candidates.length === 0) return null;
  return {
    runId: record.runId,
    proposalId: record.proposalId,
    candidateCount: candidates.length,
    candidates,
    summary: boundedString(record.summary, 500) ?? "",
    model: boundedString(record.model, 100) ?? "unknown",
  };
};

export interface CurriculumIngestInput {
  courseId: string;
  syllabusName: string;
  syllabusText: string;
}

export const useCurriculumIngest = () => {
  return useMutation({
    mutationKey: ["agent", "curriculum-ingest"],
    mutationFn: async (
      input: CurriculumIngestInput
    ): Promise<CurriculumIngestResult> => {
      const { data, error } = await supabase.functions.invoke(
        "curriculum-ingest",
        {
          body: {
            course_id: input.courseId,
            syllabus_name: input.syllabusName,
            syllabus_text: input.syllabusText,
          },
        }
      );
      if (error) throw new Error("ingestion_unavailable");
      const parsed = parseResult(data);
      if (!parsed) throw new Error("ingestion_malformed");
      return parsed;
    },
  });
};
// =============================================================================
// gradebookExport — Class-average computation + CSV builder for the gradebook
//
// Req 13.2/13.3/13.6: the class-average row and the CSV export are both derived
// from the *displayed* grade matrix. The CSV is produced with the existing
// shared CSV primitive `escapeCsvField` and is downloaded via the existing
// `downloadCsv` utility (see `src/lib/exportCurriculumMatrixCsv.ts`) — this file
// adds no new download/blob implementation, only the gradebook-specific
// row/column shaping (Req 13.6, reuse the established export pattern).
// =============================================================================

import { escapeCsvField } from "@/lib/exportCurriculumMatrixCsv";

// ─── Structural input shapes ─────────────────────────────────────────────────
// Declared locally (not imported from the `useGradebook` hook) so this business
// logic stays in the `lib` layer with no dependency on the hooks layer. The
// hook's `GradebookEntry` is structurally compatible with these shapes.

export interface GradebookCsvAssessment {
  id: string;
  title: string;
  score: number | null;
  max_score: number;
}

export interface GradebookCsvCategory {
  category_id: string;
  category_name: string;
  subtotal_percent: number;
  assessments: GradebookCsvAssessment[];
}

export interface GradebookCsvEntry {
  student_name: string;
  final_weighted_grade: number;
  letter_grade: string;
  categories: GradebookCsvCategory[];
}

/** Aggregated class averages computed from the displayed matrix (Req 13.3). */
export interface ClassAverages {
  /** assessment id → mean of non-null scores, or null when none are graded */
  assessmentAvg: Map<string, number | null>;
  /** category id → mean of displayed subtotal percentages */
  categoryAvg: Map<string, number>;
  /** mean of displayed final weighted grades */
  finalAvg: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const mean = (values: number[]): number =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

/**
 * Computes class averages from the displayed gradebook matrix.
 *
 * - Per assessment: mean of the non-null scores across students (null when no
 *   student has a score for that assessment so the cell stays empty).
 * - Per category: mean of the displayed subtotal percentages across students.
 * - Final: mean of the displayed final weighted grades across students.
 *
 * The first entry defines the (uniform) column structure used for lookups.
 */
export function computeClassAverages(data: GradebookCsvEntry[]): ClassAverages {
  const assessmentAvg = new Map<string, number | null>();
  const categoryAvg = new Map<string, number>();

  const template = data[0];
  if (!template) {
    return { assessmentAvg, categoryAvg, finalAvg: 0 };
  }

  for (const cat of template.categories) {
    for (const assessment of cat.assessments) {
      const scores: number[] = [];
      for (const student of data) {
        const score = student.categories
          .find((c) => c.category_id === cat.category_id)
          ?.assessments.find((a) => a.id === assessment.id)?.score;
        if (score !== null && score !== undefined) {
          scores.push(score);
        }
      }
      assessmentAvg.set(
        assessment.id,
        scores.length > 0 ? round2(mean(scores)) : null
      );
    }

    const subtotals = data.map(
      (student) =>
        student.categories.find((c) => c.category_id === cat.category_id)
          ?.subtotal_percent ?? 0
    );
    categoryAvg.set(cat.category_id, round2(mean(subtotals)));
  }

  const finalAvg = round2(
    mean(data.map((student) => student.final_weighted_grade))
  );

  return { assessmentAvg, categoryAvg, finalAvg };
}

/**
 * Builds the gradebook CSV from the displayed matrix (Req 13.2). The trailing
 * row is the class average (Req 13.3) so the export mirrors exactly what the
 * teacher sees on screen. Pair with `downloadCsv` to trigger the file download.
 */
export function buildGradebookCsv(
  data: GradebookCsvEntry[],
  classAverages: ClassAverages,
  classAverageLetter: string
): string {
  const template = data[0];
  if (!template) return "";

  // Header: Student, [<cat> - <assessment> (/max)..., <cat> Subtotal %]*, Final %, Grade
  const header: string[] = ["Student"];
  for (const cat of template.categories) {
    for (const assessment of cat.assessments) {
      header.push(
        `${cat.category_name} - ${assessment.title} (/${assessment.max_score})`
      );
    }
    header.push(`${cat.category_name} Subtotal %`);
  }
  header.push("Final %", "Grade");

  const lines: string[] = [header.map(escapeCsvField).join(",")];

  // One row per student
  for (const student of data) {
    const cells: string[] = [escapeCsvField(student.student_name)];
    for (const cat of student.categories) {
      for (const assessment of cat.assessments) {
        cells.push(assessment.score !== null ? String(assessment.score) : "");
      }
      cells.push(cat.subtotal_percent.toFixed(1));
    }
    cells.push(student.final_weighted_grade.toFixed(1), student.letter_grade);
    lines.push(cells.join(","));
  }

  // Trailing class-average row (Req 13.3)
  const avgCells: string[] = [escapeCsvField("Class Average")];
  for (const cat of template.categories) {
    for (const assessment of cat.assessments) {
      const avg = classAverages.assessmentAvg.get(assessment.id);
      avgCells.push(avg !== null && avg !== undefined ? String(avg) : "");
    }
    avgCells.push(
      (classAverages.categoryAvg.get(cat.category_id) ?? 0).toFixed(1)
    );
  }
  avgCells.push(classAverages.finalAvg.toFixed(1), classAverageLetter);
  lines.push(avgCells.join(","));

  return lines.join("\n");
}

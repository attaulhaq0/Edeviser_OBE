// =============================================================================
// outcomeChain — pure assembler for the end-to-end OBE outcome chain
// Feature: qa-partner-review-remediation, Req 16
// =============================================================================
//
// This module contains the *pure* graph-walking / assembly logic behind
// `useOutcomeChain` (src/hooks/useOutcomeChain.ts). Keeping it side-effect free
// lets it be unit-tested directly (task 26.3) without mocking Supabase.
//
// Mapping-direction convention (confirmed against the existing hooks —
// useILOs.useDeleteILO, usePLOs.useDeletePLO, useCLOs.useCreateCLO):
//   outcome_mappings.source_outcome_id = PARENT (higher level)
//   outcome_mappings.target_outcome_id = CHILD  (lower level)
// so PLOs under an ILO are the `target`s of rows whose `source` is the ILO, and
// CLOs under a PLO are the `target`s of rows whose `source` is that PLO.
//
// The assembled chain is: ILO → GA → PLO → CLO → Assessment → Rubric →
// Student → Attainment (Req 16.1). Graduate Attributes are placed as a level
// between the ILO and the PLOs (Req 16.3).

// ─── Raw input row shapes (column-explicit; mirror the hook's selects) ───────

export interface RawChainOutcome {
  id: string;
  title: string;
  type: "ILO" | "PLO" | "CLO" | "SUB_CLO";
  blooms_level: string | null;
  course_id: string | null;
}

export interface RawGraduateAttributeMapping {
  graduate_attribute_id: string;
  outcome_id: string;
  weight: number | null;
}

export interface RawGraduateAttribute {
  id: string;
  name: string;
}

export interface RawOutcomeMapping {
  source_outcome_id: string;
  target_outcome_id: string;
  weight: number;
}

export interface RawChainRubric {
  id: string;
  title: string;
  clo_id: string | null;
}

export interface RawCloWeight {
  clo_id: string;
  weight: number;
}

export interface RawChainAssignment {
  id: string;
  title: string;
  course_id: string;
  rubric_id: string | null;
  clo_weights: RawCloWeight[];
}

export interface RawChainAttainment {
  outcome_id: string;
  attainment_percent: number;
  scope: "student_course" | "course" | "program" | "institution";
  student_id: string | null;
}

export interface RawChainProfile {
  id: string;
  full_name: string;
}

export interface AssembleOutcomeChainInput {
  start: RawChainOutcome | null;
  gaMappings: RawGraduateAttributeMapping[];
  graduateAttributes: RawGraduateAttribute[];
  ploMappings: RawOutcomeMapping[];
  plos: RawChainOutcome[];
  cloMappings: RawOutcomeMapping[];
  clos: RawChainOutcome[];
  rubrics: RawChainRubric[];
  assignments: RawChainAssignment[];
  attainment: RawChainAttainment[];
  students: RawChainProfile[];
}

// ─── Assembled (nested) output shapes ────────────────────────────────────────

export interface RubricNode {
  id: string;
  title: string;
}

export interface AssessmentNode {
  id: string;
  title: string;
  /** This assessment's contribution weight toward the parent CLO. */
  weight: number;
  /** The assessment's own rubric (assignments.rubric_id), when present. */
  rubric: RubricNode | null;
}

export interface StudentAttainmentNode {
  studentId: string;
  studentName: string;
  /** Student-level attainment for the parent CLO (scope = student_course). */
  attainmentPercent: number;
}

export interface CloNode {
  id: string;
  title: string;
  bloomsLevel: string | null;
  /** Aggregate (non-student) attainment for this CLO, or null when none. */
  attainmentPercent: number | null;
  /** Weight of this CLO under the parent PLO mapping. */
  weight: number;
  assessments: AssessmentNode[];
  /** Rubrics attached to this CLO via rubrics.clo_id. */
  rubrics: RubricNode[];
  /** Student → Attainment leaves for this CLO. */
  students: StudentAttainmentNode[];
}

export interface PloNode {
  id: string;
  title: string;
  attainmentPercent: number | null;
  /** Weight of this PLO under the start ILO mapping. */
  weight: number;
  clos: CloNode[];
}

export interface GraduateAttributeNode {
  id: string;
  name: string;
  /** Weight of the GA↔ILO mapping for the start outcome. */
  weight: number | null;
  /**
   * Attainment shown at the GA node within this chain: the start ILO's
   * aggregate attainment (the outcome that feeds this GA here), or null.
   */
  attainmentPercent: number | null;
}

export interface OutcomeChainStartNode {
  id: string;
  title: string;
  type: "ILO" | "PLO" | "CLO" | "SUB_CLO";
  attainmentPercent: number | null;
}

export interface OutcomeChain {
  start: OutcomeChainStartNode;
  graduateAttributes: GraduateAttributeNode[];
  plos: PloNode[];
  /**
   * True when no level of the chain has any linked record for the selected
   * start (Req 16.4) — drives a single unified empty state rather than
   * per-level zeros.
   */
  isEmpty: boolean;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Build an attainment index for a set of outcome ids:
 *   outcome_id → { aggregate, students }
 * where `aggregate` is the mean of non-student rows (scope course/program/
 * institution) and `students` are the per-student rows (scope student_course).
 */
const buildAttainmentIndex = (
  rows: RawChainAttainment[]
): Map<
  string,
  { aggregate: number | null; students: RawChainAttainment[] }
> => {
  const sums = new Map<string, { total: number; count: number }>();
  const students = new Map<string, RawChainAttainment[]>();

  for (const row of rows) {
    if (row.student_id) {
      const list = students.get(row.outcome_id) ?? [];
      list.push(row);
      students.set(row.outcome_id, list);
    } else {
      const acc = sums.get(row.outcome_id) ?? { total: 0, count: 0 };
      acc.total += row.attainment_percent;
      acc.count += 1;
      sums.set(row.outcome_id, acc);
    }
  }

  const index = new Map<
    string,
    { aggregate: number | null; students: RawChainAttainment[] }
  >();
  const ids = new Set<string>([...sums.keys(), ...students.keys()]);
  for (const id of ids) {
    const acc = sums.get(id);
    index.set(id, {
      aggregate: acc && acc.count > 0 ? acc.total / acc.count : null,
      students: students.get(id) ?? [],
    });
  }
  return index;
};

// ─── Assembler ───────────────────────────────────────────────────────────────

/**
 * Assemble the nested outcome chain from already-fetched rows. Pure: it does
 * not mutate inputs and performs no I/O.
 */
export const assembleOutcomeChain = (
  input: AssembleOutcomeChainInput
): OutcomeChain | null => {
  const { start } = input;
  if (!start) return null;

  const attainmentIndex = buildAttainmentIndex(input.attainment);
  const studentNameById = new Map(
    input.students.map((s) => [s.id, s.full_name])
  );

  // ── Rubrics grouped by CLO (rubrics.clo_id) ──────────────────────────────
  const rubricsByClo = new Map<string, RubricNode[]>();
  const rubricById = new Map<string, RubricNode>();
  for (const r of input.rubrics) {
    const node: RubricNode = { id: r.id, title: r.title };
    rubricById.set(r.id, node);
    if (r.clo_id) {
      const list = rubricsByClo.get(r.clo_id) ?? [];
      list.push(node);
      rubricsByClo.set(r.clo_id, list);
    }
  }

  // ── Assessments grouped by CLO (assignments.clo_weights[].clo_id) ─────────
  const assessmentsByClo = new Map<string, AssessmentNode[]>();
  for (const a of input.assignments) {
    for (const cw of a.clo_weights) {
      const list = assessmentsByClo.get(cw.clo_id) ?? [];
      list.push({
        id: a.id,
        title: a.title,
        weight: cw.weight,
        rubric: a.rubric_id ? rubricById.get(a.rubric_id) ?? null : null,
      });
      assessmentsByClo.set(cw.clo_id, list);
    }
  }

  // ── CLOs grouped by their parent PLO (cloMappings: source = PLO) ──────────
  const cloById = new Map(input.clos.map((c) => [c.id, c]));
  const closByPlo = new Map<string, CloNode[]>();
  for (const m of input.cloMappings) {
    const clo = cloById.get(m.target_outcome_id);
    if (!clo) continue;
    const att = attainmentIndex.get(clo.id);
    const node: CloNode = {
      id: clo.id,
      title: clo.title,
      bloomsLevel: clo.blooms_level,
      attainmentPercent: att?.aggregate ?? null,
      weight: m.weight,
      assessments: assessmentsByClo.get(clo.id) ?? [],
      rubrics: rubricsByClo.get(clo.id) ?? [],
      students: (att?.students ?? []).map((row) => ({
        studentId: row.student_id as string,
        studentName: studentNameById.get(row.student_id as string) ?? "—",
        attainmentPercent: row.attainment_percent,
      })),
    };
    const list = closByPlo.get(m.source_outcome_id) ?? [];
    list.push(node);
    closByPlo.set(m.source_outcome_id, list);
  }

  // ── PLOs under the start ILO (ploMappings: source = start ILO) ────────────
  const ploById = new Map(input.plos.map((p) => [p.id, p]));
  const plos: PloNode[] = [];
  for (const m of input.ploMappings) {
    const plo = ploById.get(m.target_outcome_id);
    if (!plo) continue;
    plos.push({
      id: plo.id,
      title: plo.title,
      attainmentPercent: attainmentIndex.get(plo.id)?.aggregate ?? null,
      weight: m.weight,
      clos: closByPlo.get(plo.id) ?? [],
    });
  }

  // ── Graduate Attributes mapped to the start ILO (level between ILO/PLO) ───
  const startAttainment = attainmentIndex.get(start.id)?.aggregate ?? null;
  const gaById = new Map(input.graduateAttributes.map((g) => [g.id, g]));
  const graduateAttributes: GraduateAttributeNode[] = [];
  for (const m of input.gaMappings) {
    const ga = gaById.get(m.graduate_attribute_id);
    if (!ga) continue;
    graduateAttributes.push({
      id: ga.id,
      name: ga.name,
      weight: m.weight,
      // Within this chain the GA connects to the start ILO, so the ILO's
      // aggregate attainment is the meaningful figure to surface at the node.
      attainmentPercent: startAttainment,
    });
  }

  const isEmpty = graduateAttributes.length === 0 && plos.length === 0;

  return {
    start: {
      id: start.id,
      title: start.title,
      type: start.type,
      attainmentPercent: startAttainment,
    },
    graduateAttributes,
    plos,
    isEmpty,
  };
};

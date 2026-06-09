import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { BloomsLevel } from "@/lib/schemas/clo";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LearningPathNode {
  assignment_id: string;
  title: string;
  blooms_level: BloomsLevel;
  status: "locked" | "available" | "submitted" | "graded";
  attainment_percent: number | null;
  prerequisite?: {
    clo_id: string;
    clo_title: string;
    required_attainment: number;
    current_attainment: number;
  };
}

// ─── Bloom's level ordering (lowest → highest cognitive complexity) ──────────

const BLOOMS_ORDER: Record<BloomsLevel, number> = {
  remembering: 0,
  understanding: 1,
  applying: 2,
  analyzing: 3,
  evaluating: 4,
  creating: 5,
};

// ─── Pure logic: build nodes from raw data ──────────────────────────────────

export interface RawAssignment {
  id: string;
  title: string;
  prerequisites: Array<{ clo_id: string; required_attainment: number }> | null;
  clo_weights: Array<{ clo_id: string; weight: number }>;
}

export interface RawCLO {
  id: string;
  title: string;
  blooms_level: BloomsLevel | null;
}

export interface RawAttainment {
  outcome_id: string;
  attainment_percent: number;
}

export interface RawSubmission {
  assignment_id: string;
  status: string;
}

export interface RawGrade {
  submission_id: string;
  assignment_id: string;
}

export function buildLearningPathNodes(
  assignments: RawAssignment[],
  clos: RawCLO[],
  attainments: RawAttainment[],
  submissions: RawSubmission[],
  grades: RawGrade[]
): LearningPathNode[] {
  const cloMap = new Map(clos.map((c) => [c.id, c]));
  const attainmentMap = new Map(
    attainments.map((a) => [a.outcome_id, a.attainment_percent])
  );
  const submittedAssignments = new Set(submissions.map((s) => s.assignment_id));
  const gradedAssignments = new Set(grades.map((g) => g.assignment_id));

  const nodes: LearningPathNode[] = assignments.map((assignment) => {
    // Determine Bloom's level from ALL linked CLOs, not just the first.
    // The learning path orders Remembering → Creating, so the representative
    // level for an assignment is the lowest (min) Bloom level across its CLOs:
    // the assignment becomes available as soon as the easiest cognitive demand
    // is reachable. Falls back to "remembering" when no CLO carries a level.
    const cloLevels = assignment.clo_weights
      .map(({ clo_id }) => cloMap.get(clo_id)?.blooms_level)
      .filter((level): level is BloomsLevel => !!level);
    const bloomsLevel: BloomsLevel =
      cloLevels.length > 0
        ? cloLevels.reduce((lowest, level) =>
            BLOOMS_ORDER[level] < BLOOMS_ORDER[lowest] ? level : lowest
          )
        : "remembering";

    // Retain the first linked CLO for attainment display (behavior preserved).
    const primaryCloId = assignment.clo_weights[0]?.clo_id;

    // Check prerequisite status
    let isLocked = false;
    let prerequisite: LearningPathNode["prerequisite"] = undefined;

    if (assignment.prerequisites && assignment.prerequisites.length > 0) {
      const prereq = assignment.prerequisites[0];
      if (prereq) {
        const prereqClo = cloMap.get(prereq.clo_id);
        const currentAttainment = attainmentMap.get(prereq.clo_id) ?? 0;

        if (currentAttainment < prereq.required_attainment) {
          isLocked = true;
          prerequisite = {
            clo_id: prereq.clo_id,
            clo_title: prereqClo?.title ?? "Unknown CLO",
            required_attainment: prereq.required_attainment,
            current_attainment: currentAttainment,
          };
        }
      }
    }

    // Determine status
    let status: LearningPathNode["status"];
    if (isLocked) {
      status = "locked";
    } else if (gradedAssignments.has(assignment.id)) {
      status = "graded";
    } else if (submittedAssignments.has(assignment.id)) {
      status = "submitted";
    } else {
      status = "available";
    }

    // Get attainment for the primary CLO
    const attainmentPercent = primaryCloId
      ? attainmentMap.get(primaryCloId) ?? null
      : null;

    return {
      assignment_id: assignment.id,
      title: assignment.title,
      blooms_level: bloomsLevel,
      status,
      attainment_percent: attainmentPercent,
      prerequisite,
    };
  });

  // Sort by Bloom's level order, then by title for stability
  nodes.sort((a, b) => {
    const levelDiff =
      BLOOMS_ORDER[a.blooms_level] - BLOOMS_ORDER[b.blooms_level];
    if (levelDiff !== 0) return levelDiff;
    return a.title.localeCompare(b.title);
  });

  return nodes;
}

// ─── useLearningPath — fetch and build learning path for a course ───────────

export const useLearningPath = (
  courseId: string | undefined,
  studentId: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.assignments.list({
      courseId,
      studentId,
      view: "learningPath",
    }),
    queryFn: async (): Promise<LearningPathNode[]> => {
      if (!courseId || !studentId) return [];

      // Fetch assignments for the course
      const { data: assignments, error: assignErr } = await supabase
        .from("assignments")
        .select("id, title, prerequisites, clo_weights")
        .eq("course_id", courseId);

      if (assignErr) throw assignErr;

      // Fetch CLOs for the course
      const { data: clos, error: cloErr } = await supabase
        .from("learning_outcomes")
        .select("id, title, blooms_level")
        .eq("type", "CLO")
        .eq("course_id", courseId);

      if (cloErr) throw cloErr;

      // Fetch student's outcome attainment for prerequisite checking
      const { data: attainments, error: attErr } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent")
        .eq("student_id", studentId)
        .eq("scope", "student_course");

      if (attErr) throw attErr;

      // Fetch student's submissions for this course's assignments
      const assignmentIds = (assignments ?? []).map((a) => a.id);
      let submissions: RawSubmission[] = [];
      let grades: RawGrade[] = [];

      if (assignmentIds.length > 0) {
        const { data: subs, error: subErr } = await supabase
          .from("submissions")
          .select("assignment_id, status")
          .eq("student_id", studentId)
          .in("assignment_id", assignmentIds);

        if (subErr) throw subErr;
        submissions = subs ?? [];

        const { data: gradeData, error: gradeErr } = await supabase
          .from("grades")
          .select("submission_id, submissions!inner(assignment_id)")
          .in("submissions.assignment_id", assignmentIds);

        if (gradeErr) throw gradeErr;

        grades = (gradeData ?? []).map((g) => ({
          submission_id: g.submission_id,
          assignment_id: (g.submissions as unknown as { assignment_id: string })
            .assignment_id,
        }));
      }

      return buildLearningPathNodes(
        (assignments ?? []) as RawAssignment[],
        (clos ?? []) as RawCLO[],
        (attainments ?? []) as RawAttainment[],
        submissions,
        grades
      );
    },
    enabled: !!courseId && !!studentId,
    staleTime: 30_000,
  });
};

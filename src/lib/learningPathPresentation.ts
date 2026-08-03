import type { LearningPathNode } from "@/hooks/useLearningPath";
import type { BloomsLevel } from "@/lib/schemas/clo";

export type LearningStageStatus = "done" | "current" | "locked";

export interface BloomStageSummary {
  key: BloomsLevel;
  nodes: LearningPathNode[];
  status: LearningStageStatus;
  attainment: number;
}

const BLOOM_ORDER: readonly BloomsLevel[] = [
  "remembering",
  "understanding",
  "applying",
  "analyzing",
  "evaluating",
  "creating",
] as const;

export const averagePercentage = (values: number[]): number =>
  values.length === 0
    ? 0
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/**
 * Converts backend learning-path nodes into the six-stage Bloom journey.
 * Components only decide how these summaries look; progression logic stays in
 * lib so Journey and Knowledge Tree can never disagree.
 */
export const buildBloomStageSummaries = (
  nodes: LearningPathNode[]
): BloomStageSummary[] =>
  BLOOM_ORDER.map((key) => {
    const stageNodes = nodes.filter((node) => node.blooms_level === key);
    const graded =
      stageNodes.length > 0 &&
      stageNodes.every((node) => node.status === "graded");
    const active = stageNodes.some(
      (node) => node.status === "available" || node.status === "submitted"
    );

    return {
      key,
      nodes: stageNodes,
      status: graded ? "done" : active ? "current" : "locked",
      attainment: averagePercentage(
        stageNodes.flatMap((node) =>
          node.attainment_percent === null ? [] : [node.attainment_percent]
        )
      ),
    };
  });

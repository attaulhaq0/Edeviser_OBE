// Task 117.1: Sankey data transformation utility

export interface SankeyNode {
  name: string;
  id: string;
  type: "ILO" | "PLO" | "CLO";
  attainment: number;
  color: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  weight: number;
}

interface OutcomeMapping {
  /** Canonical parent outcome (ILO or PLO). */
  parent_id: string;
  /** Canonical child outcome (PLO or CLO). */
  child_id: string;
  weight: number;
}

interface OutcomeAttainment {
  outcome_id: string;
  score_percent: number;
}

interface Outcome {
  id: string;
  type: "ILO" | "PLO" | "CLO";
  title: string;
}

const getAttainmentColor = (score: number): string => {
  if (score >= 85) return "#22c55e"; // green — Excellent
  if (score >= 70) return "#3b82f6"; // blue — Satisfactory
  if (score >= 50) return "#f59e0b"; // yellow — Developing
  if (score > 0) return "#ef4444"; // red — Not Yet
  return "#94a3b8"; // gray — Unmapped
};

export const transformToSankey = (
  outcomes: Outcome[],
  mappings: OutcomeMapping[],
  attainments: OutcomeAttainment[]
): { nodes: SankeyNode[]; links: SankeyLink[] } => {
  const attMap = new Map(
    attainments.map((a) => [a.outcome_id, a.score_percent])
  );

  const nodes: SankeyNode[] = outcomes.map((o) => {
    const att = attMap.get(o.id) ?? 0;
    return {
      name: o.title,
      id: o.id,
      type: o.type,
      attainment: att,
      color: getAttainmentColor(att),
    };
  });

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  const links: SankeyLink[] = mappings
    .filter((m) => nodeIndex.has(m.parent_id) && nodeIndex.has(m.child_id))
    .map((m) => ({
      // Recharts flows from source to target. The persisted OBE direction is
      // parent → child, so keep the visual flow aligned with ILO → PLO → CLO.
      source: nodeIndex.get(m.parent_id)!,
      target: nodeIndex.get(m.child_id)!,
      value: m.weight,
      weight: m.weight,
    }));

  return { nodes, links };
};

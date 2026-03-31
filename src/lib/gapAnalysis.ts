// Task 117.2: Gap Analysis classification utility

export type GapStatus = 'fully_mapped' | 'partially_mapped' | 'unmapped' | 'no_evidence';
export type GapFlag = 'under_mapped' | 'unassessed' | null;

export interface GapResult {
  outcome_id: string;
  outcome_title: string;
  outcome_type: 'ILO' | 'PLO' | 'CLO';
  status: GapStatus;
  flag: GapFlag;
  mapped_children: number;
  evidence_count: number;
  recommendation: string | null;
}

interface OutcomeWithMappings {
  id: string;
  title: string;
  type: 'ILO' | 'PLO' | 'CLO';
  mapped_children_count: number;
  evidence_count: number;
  has_assessments: boolean;
}

export const classifyGapStatus = (outcome: OutcomeWithMappings): GapStatus => {
  if (outcome.mapped_children_count === 0 && outcome.type !== 'CLO') return 'unmapped';
  if (outcome.evidence_count === 0) return 'no_evidence';
  if (outcome.type === 'PLO' && outcome.mapped_children_count < 2) return 'partially_mapped';
  return 'fully_mapped';
};

export const classifyGapFlag = (outcome: OutcomeWithMappings): GapFlag => {
  if (outcome.type === 'PLO' && outcome.mapped_children_count < 2) return 'under_mapped';
  if (outcome.type === 'CLO' && !outcome.has_assessments) return 'unassessed';
  return null;
};

export const generateRecommendation = (status: GapStatus, flag: GapFlag, type: string): string | null => {
  if (status === 'unmapped') return `Map this ${type} to child outcomes to establish assessment coverage.`;
  if (flag === 'under_mapped') return 'Add more CLO mappings to ensure adequate coverage (minimum 2 recommended).';
  if (flag === 'unassessed') return 'Link at least one assessment to this CLO in the current semester.';
  if (status === 'no_evidence') return 'No student evidence exists yet. Ensure assessments are graded.';
  return null;
};

export const analyzeGaps = (outcomes: OutcomeWithMappings[]): GapResult[] => {
  return outcomes.map((o) => {
    const status = classifyGapStatus(o);
    const flag = classifyGapFlag(o);
    return {
      outcome_id: o.id,
      outcome_title: o.title,
      outcome_type: o.type,
      status,
      flag,
      mapped_children: o.mapped_children_count,
      evidence_count: o.evidence_count,
      recommendation: generateRecommendation(status, flag, o.type),
    };
  });
};

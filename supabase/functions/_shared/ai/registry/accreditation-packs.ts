import type { AccreditationProfile } from "./curriculum-registry.ts";

export const QNSA_ACCREDITATION: AccreditationProfile = {
  id: "accred-qnsa",
  code: "QNSA",
  name: "Qatar National School Accreditation",
  jurisdiction: "qa",
  schoolLevel: "k12",
  evidenceRequirements: [
    {
      id: "qnsa-outcomes",
      indicator: "Student learning outcomes evidence",
      evidenceTypes: ["attainment", "assessment"],
      acceptableSources: ["outcome_attainment", "evidence", "grades"],
    },
    {
      id: "qnsa-improvement",
      indicator: "Continuous improvement evidence",
      evidenceTypes: ["intervention", "measurement", "cqi"],
      acceptableSources: [
        "learning_interventions",
        "intervention_measurements",
        "cqi_action_plans",
      ],
    },
    {
      id: "qnsa-attributes",
      indicator: "Learner attribute development",
      evidenceTypes: ["learner_dimension", "habit"],
      acceptableSources: [
        "learner_signals",
        "habit_tracking",
        "competency_items",
      ],
    },
  ],
  reportingPolicies: [
    {
      reportType: "self_study",
      sections: [
        "outcome_attainment",
        "learner_attributes",
        "improvement_actions",
        "evidence_summary",
      ],
      requiredEvidenceTypes: [
        "attainment",
        "intervention",
        "learner_dimension",
      ],
      language: "bilingual",
    },
  ],
};

export const IB_ACCREDITATION: AccreditationProfile = {
  id: "accred-ib",
  code: "IB",
  name: "IB Authorization / Programme Evaluation",
  jurisdiction: "international",
  schoolLevel: "k12",
  evidenceRequirements: [
    {
      id: "ib-criterion",
      indicator: "Criterion-related assessment evidence",
      evidenceTypes: ["criterion", "assessment"],
      acceptableSources: ["evidence", "grades"],
    },
    {
      id: "ib-atl",
      indicator: "ATL skill development evidence",
      evidenceTypes: ["learner_dimension"],
      acceptableSources: ["learner_signals", "habit_tracking"],
    },
  ],
  reportingPolicies: [
    {
      reportType: "programme_evaluation",
      sections: [
        "criterion_attainment",
        "atl_development",
        "moderation_evidence",
      ],
      requiredEvidenceTypes: ["criterion", "learner_dimension"],
      language: "en",
    },
  ],
};

export const BSO_ACCREDITATION: AccreditationProfile = {
  id: "accred-bso",
  code: "BSO",
  name: "British Schools Overseas Inspection",
  jurisdiction: "international",
  schoolLevel: "k12",
  evidenceRequirements: [
    {
      id: "bso-attainment",
      indicator: "Student attainment and progress",
      evidenceTypes: ["attainment", "assessment"],
      acceptableSources: ["outcome_attainment", "evidence"],
    },
  ],
  reportingPolicies: [
    {
      reportType: "inspection_evidence",
      sections: ["attainment", "curriculum", "teaching_quality"],
      requiredEvidenceTypes: ["attainment"],
      language: "en",
    },
  ],
};

export const ACCREDITATION_REGISTRY: ReadonlyMap<string, AccreditationProfile> =
  new Map([
    ["QNSA", QNSA_ACCREDITATION],
    ["IB", IB_ACCREDITATION],
    ["BSO", BSO_ACCREDITATION],
  ]);

export const getAccreditation = (
  code: string
): AccreditationProfile | undefined => ACCREDITATION_REGISTRY.get(code);

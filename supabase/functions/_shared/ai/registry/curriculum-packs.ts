import type { CurriculumProfile } from "./curriculum-registry.ts";

export const QATAR_NATIONAL: CurriculumProfile = {
  id: "curriculum-qatar-national",
  code: "MOEHE",
  name: "Qatar Ministry of Education National Curriculum",
  region: "qa",
  assessmentModels: ["percent", "component"],
  gradeScales: [
    {
      id: "gs-qatar-af",
      name: "A-F",
      model: "percent",
      bands: [
        { label: "A", minPercent: 85, maxPercent: 100, gpaPoints: 4.0 },
        { label: "B", minPercent: 70, maxPercent: 85, gpaPoints: 3.0 },
        { label: "C", minPercent: 55, maxPercent: 70, gpaPoints: 2.0 },
        { label: "D", minPercent: 50, maxPercent: 55, gpaPoints: 1.0 },
        { label: "F", minPercent: 0, maxPercent: 50, gpaPoints: 0.0 },
      ],
    },
  ],
  outcomeModel: {
    outcomeTypes: ["ILO", "PLO", "CLO", "SUB_CLO"],
    canonicalMapping: "source_is_parent",
  },
  learnerDimensions: [
    {
      code: "critical_thinking",
      name: "Critical Thinking",
      category: "learner_attribute",
    },
    {
      code: "collaboration",
      name: "Collaboration",
      category: "learner_attribute",
    },
    {
      code: "communication",
      name: "Communication",
      category: "learner_attribute",
    },
    {
      code: "creativity",
      name: "Creativity and Innovation",
      category: "learner_attribute",
    },
    {
      code: "qatari_identity",
      name: "Qatari Identity and Heritage",
      category: "learner_attribute",
    },
  ],
  defaultLanguage: "ar",
  requiredSubjects: ["Arabic", "Islamic Studies", "Qatar History"],
};

export const IB_MYP: CurriculumProfile = {
  id: "curriculum-ib-myp",
  code: "IB_MYP",
  name: "IB Middle Years Programme",
  region: "international",
  assessmentModels: ["criterion"],
  gradeScales: [
    {
      id: "gs-ib-myp",
      name: "MYP 1-7",
      model: "criterion",
      bands: [
        { label: "7", minPercent: 88, maxPercent: 100, gpaPoints: 4.0 },
        { label: "6", minPercent: 75, maxPercent: 88, gpaPoints: 3.7 },
        { label: "5", minPercent: 62, maxPercent: 75, gpaPoints: 3.0 },
        { label: "4", minPercent: 50, maxPercent: 62, gpaPoints: 2.3 },
        { label: "3", minPercent: 37, maxPercent: 50, gpaPoints: 1.7 },
        { label: "2", minPercent: 25, maxPercent: 37, gpaPoints: 1.0 },
        { label: "1", minPercent: 0, maxPercent: 25, gpaPoints: 0.0 },
      ],
    },
  ],
  outcomeModel: {
    outcomeTypes: ["ILO", "PLO", "CLO", "SUB_CLO"],
    canonicalMapping: "source_is_parent",
  },
  learnerDimensions: [
    {
      code: "atl_self_mgmt",
      name: "Self-Management",
      category: "ATL",
      habitMappings: { planning: "atl_self_mgmt", reflection: "atl_self_mgmt" },
    },
    {
      code: "atl_research",
      name: "Research",
      category: "ATL",
      habitMappings: { research_workflow: "atl_research" },
    },
    { code: "atl_communication", name: "Communication", category: "ATL" },
    { code: "atl_thinking", name: "Thinking", category: "ATL" },
    { code: "atl_social", name: "Social", category: "ATL" },
  ],
  defaultLanguage: "en",
};

export const BRITISH_IGCSE: CurriculumProfile = {
  id: "curriculum-british-igcse",
  code: "IGCSE",
  name: "Cambridge IGCSE / British Curriculum",
  region: "international",
  assessmentModels: ["band_grade", "percent"],
  gradeScales: [
    {
      id: "gs-igcse",
      name: "IGCSE 9-1/A*-G",
      model: "band_grade",
      bands: [
        { label: "9/A*", minPercent: 90, maxPercent: 100, gpaPoints: 4.0 },
        { label: "8/A*", minPercent: 80, maxPercent: 90, gpaPoints: 4.0 },
        { label: "7/A", minPercent: 70, maxPercent: 80, gpaPoints: 3.7 },
        { label: "6/B", minPercent: 60, maxPercent: 70, gpaPoints: 3.3 },
        { label: "5/C", minPercent: 50, maxPercent: 60, gpaPoints: 3.0 },
        { label: "4/D", minPercent: 40, maxPercent: 50, gpaPoints: 2.3 },
        { label: "3/E", minPercent: 30, maxPercent: 40, gpaPoints: 1.7 },
        { label: "2/F", minPercent: 20, maxPercent: 30, gpaPoints: 1.0 },
        { label: "1/G", minPercent: 0, maxPercent: 20, gpaPoints: 0.0 },
      ],
    },
  ],
  outcomeModel: {
    outcomeTypes: ["ILO", "PLO", "CLO", "SUB_CLO"],
    canonicalMapping: "source_is_parent",
  },
  learnerDimensions: [
    {
      code: "ao1_knowledge",
      name: "AO1: Knowledge",
      category: "assessment_objective",
    },
    {
      code: "ao2_application",
      name: "AO2: Application",
      category: "assessment_objective",
    },
    {
      code: "ao3_analysis",
      name: "AO3: Analysis",
      category: "assessment_objective",
    },
  ],
  defaultLanguage: "en",
};

export const GENERIC_OBE: CurriculumProfile = {
  id: "curriculum-generic",
  code: "GENERIC",
  name: "Generic Outcome-Based Education",
  assessmentModels: ["percent"],
  gradeScales: [
    {
      id: "gs-generic",
      name: "A-F",
      model: "percent",
      bands: [
        { label: "A", minPercent: 85, maxPercent: 100, gpaPoints: 4.0 },
        { label: "B", minPercent: 70, maxPercent: 85, gpaPoints: 3.0 },
        { label: "C", minPercent: 55, maxPercent: 70, gpaPoints: 2.0 },
        { label: "D", minPercent: 50, maxPercent: 55, gpaPoints: 1.0 },
        { label: "F", minPercent: 0, maxPercent: 50, gpaPoints: 0.0 },
      ],
    },
  ],
  outcomeModel: {
    outcomeTypes: ["ILO", "PLO", "CLO", "SUB_CLO"],
    canonicalMapping: "source_is_parent",
  },
  defaultLanguage: "en",
};

export const CURRICULUM_REGISTRY: ReadonlyMap<string, CurriculumProfile> =
  new Map([
    ["MOEHE", QATAR_NATIONAL],
    ["IB_MYP", IB_MYP],
    ["IGCSE", BRITISH_IGCSE],
    ["GENERIC", GENERIC_OBE],
  ]);

export const getCurriculum = (code: string): CurriculumProfile =>
  CURRICULUM_REGISTRY.get(code) ?? GENERIC_OBE;

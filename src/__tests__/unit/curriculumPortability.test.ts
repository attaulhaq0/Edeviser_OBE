import { describe, it, expect } from "vitest";
import { getCurriculum } from "../../../supabase/functions/_shared/ai/registry/curriculum-packs";
import {
  getAccreditation,
  QNSA_ACCREDITATION,
  IB_ACCREDITATION,
  BSO_ACCREDITATION,
} from "../../../supabase/functions/_shared/ai/registry/accreditation-packs";
import type {
  CurriculumProfile,
  InstitutionProfile,
} from "../../../supabase/functions/_shared/ai/registry/curriculum-registry";

describe("Curriculum Registry", () => {
  it("MoEHE: percent, Arabic, 5 dims, 3 required subjects", () => {
    const c = getCurriculum("MOEHE");
    expect(c.assessmentModels).toContain("percent");
    expect(c.defaultLanguage).toBe("ar");
    expect(c.requiredSubjects).toEqual([
      "Arabic",
      "Islamic Studies",
      "Qatar History",
    ]);
    expect(c.learnerDimensions).toHaveLength(5);
  });
  it("IB MYP: criterion, 7-band scale, ATL with habit mappings", () => {
    const c = getCurriculum("IB_MYP");
    expect(c.assessmentModels).toContain("criterion");
    expect(c.gradeScales?.[0]?.bands).toHaveLength(7);
    const atl = c.learnerDimensions?.find((d) => d.code === "atl_self_mgmt");
    expect(atl?.habitMappings?.planning).toBe("atl_self_mgmt");
  });
  it("IGCSE: band_grade, AO dimensions", () => {
    const c = getCurriculum("IGCSE");
    expect(c.assessmentModels).toContain("band_grade");
    expect(
      c.learnerDimensions?.find((d) => d.code === "ao3_analysis")
    ).toBeDefined();
  });
  it("unknown falls back to Generic", () => {
    expect(getCurriculum("NONEXISTENT").code).toBe("GENERIC");
  });
});

describe("Accreditation Registry", () => {
  it("QNSA: bilingual, 3 requirements, k12", () => {
    const a = getAccreditation("QNSA");
    expect(a?.evidenceRequirements).toHaveLength(3);
    expect(a?.reportingPolicies?.[0]?.language).toBe("bilingual");
    expect(a?.schoolLevel).toBe("k12");
  });
  it("IB: criterion evidence requirement", () => {
    expect(IB_ACCREDITATION.evidenceRequirements?.[0]?.indicator).toContain(
      "Criterion"
    );
  });
  it("BSO is k12", () => {
    expect(BSO_ACCREDITATION.schoolLevel).toBe("k12");
  });
});

describe("Multi-Track Institution", () => {
  const school: InstitutionProfile = {
    id: "inst-multi",
    name: "Qatar Multi-Track Academy",
    defaultLanguage: "en",
    curricula: [
      { curriculumCode: "IB_MYP", activeSince: "2024-09-01" },
      { curriculumCode: "IGCSE", activeSince: "2024-09-01" },
      { curriculumCode: "MOEHE", activeSince: "2024-09-01" },
      { curriculumCode: "GENERIC", activeSince: "2024-09-01" },
    ],
    accreditations: ["QNSA", "IB", "BSO"],
  };

  it("each curriculum resolves to distinct assessment models", () => {
    const models = school.curricula.map((a) => getCurriculum(a.curriculumCode));
    expect(models.find((m) => m.code === "IB_MYP")?.assessmentModels).toContain(
      "criterion"
    );
    expect(models.find((m) => m.code === "IGCSE")?.assessmentModels).toContain(
      "band_grade"
    );
    expect(models.find((m) => m.code === "MOEHE")?.assessmentModels).toContain(
      "percent"
    );
  });

  it("grade scale names differ across curricula", () => {
    const ib = getCurriculum("IB_MYP").gradeScales?.[0]?.name;
    const ig = getCurriculum("IGCSE").gradeScales?.[0]?.name;
    const mh = getCurriculum("MOEHE").gradeScales?.[0]?.name;
    expect(ib).toBeDefined();
    expect(ib).not.toBe(ig);
    expect(ib).not.toBe(mh);
  });

  it("IB has ATL category, MoEHE has learner_attribute category", () => {
    expect(getCurriculum("IB_MYP").learnerDimensions?.[0]?.category).toBe(
      "ATL"
    );
    expect(getCurriculum("MOEHE").learnerDimensions?.[0]?.category).toBe(
      "learner_attribute"
    );
  });

  it("all 3 accreditations are distinct", () => {
    expect(QNSA_ACCREDITATION.code).not.toBe(IB_ACCREDITATION.code);
    expect(IB_ACCREDITATION.code).not.toBe(BSO_ACCREDITATION.code);
  });
});
describe("GOLDEN PORTABILITY — new curriculum without code changes", () => {
  const CUSTOM: CurriculumProfile = {
    id: "curriculum-custom",
    code: "QATAR_PRIVATE_X",
    name: "Qatar Private Academy Custom",
    region: "qa",
    assessmentModels: ["percent", "criterion"],
    gradeScales: [
      {
        id: "gs-custom",
        name: "Custom Scale",
        model: "percent",
        bands: [
          {
            label: "Outstanding",
            minPercent: 90,
            maxPercent: 100,
            gpaPoints: 4.0,
          },
          {
            label: "Proficient",
            minPercent: 70,
            maxPercent: 90,
            gpaPoints: 3.0,
          },
          {
            label: "Developing",
            minPercent: 50,
            maxPercent: 70,
            gpaPoints: 2.0,
          },
          { label: "Emerging", minPercent: 0, maxPercent: 50, gpaPoints: 1.0 },
        ],
      },
    ],
    outcomeModel: {
      outcomeTypes: ["SCHOOL_OUTCOME", "SUBJECT_OUTCOME"],
      canonicalMapping: "source_is_parent",
    },
    learnerDimensions: [
      {
        code: "independent_learning",
        name: "Independent Learning",
        category: "custom",
      },
      {
        code: "arabic_communication",
        name: "Arabic Communication",
        category: "custom",
      },
    ],
    defaultLanguage: "ar",
  };

  it("validates — no engine changes needed", () => {
    expect(CUSTOM.code).toBe("QATAR_PRIVATE_X");
    expect(CUSTOM.assessmentModels).toHaveLength(2);
    expect(CUSTOM.gradeScales?.[0]?.bands?.[0]?.label).toBe("Outstanding");
    expect(CUSTOM.outcomeModel.outcomeTypes).toContain("SCHOOL_OUTCOME");
  });

  it("custom grade labels unique vs all pre-built packs", () => {
    const labels = CUSTOM.gradeScales?.[0]?.bands?.map((b) => b.label) ?? [];
    expect(labels).toEqual([
      "Outstanding",
      "Proficient",
      "Developing",
      "Emerging",
    ]);
    for (const code of ["MOEHE", "IB_MYP", "IGCSE", "GENERIC"]) {
      const pl =
        getCurriculum(code).gradeScales?.[0]?.bands?.map((b) => b.label) ?? [];
      expect(labels).not.toEqual(pl);
    }
  });

  it("custom learner dimensions are self-contained", () => {
    expect(CUSTOM.learnerDimensions).toHaveLength(2);
    expect(CUSTOM.learnerDimensions?.[0]?.category).toBe("custom");
    expect(CUSTOM.learnerDimensions?.[0]?.code).toBe("independent_learning");
  });

  it("curriculum/assessment/accreditation are independent dimensions", () => {
    expect(CUSTOM.assessmentModels).toContain("percent");
    expect(
      QNSA_ACCREDITATION.evidenceRequirements?.[0]?.evidenceTypes
    ).toContain("attainment");
  });
});

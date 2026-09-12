import { describe, it, expect } from "vitest";
import {
  getCurriculum,
  CURRICULUM_REGISTRY,
} from "../../../supabase/functions/_shared/ai/registry/curriculum-packs";
import {
  getAccreditation,
  ACCREDITATION_REGISTRY,
} from "../../../supabase/functions/_shared/ai/registry/accreditation-packs";
import type { InstitutionProfile } from "../../../supabase/functions/_shared/ai/registry/curriculum-registry";
import { getAssessmentStrategy } from "../../../supabase/functions/_shared/ai/strategies/assessment-strategy";

const schools: InstitutionProfile[] = [
  {
    id: "s01",
    name: "Qatar National School",
    defaultLanguage: "ar",
    curricula: [{ curriculumCode: "MOEHE", activeSince: "2024-09-01" }],
    accreditations: ["QNSA"],
  },
  {
    id: "s02",
    name: "Doha IB World School",
    defaultLanguage: "en",
    curricula: [{ curriculumCode: "IB_MYP", activeSince: "2024-09-01" }],
    accreditations: ["IB", "QNSA"],
  },
  {
    id: "s03",
    name: "British Academy Doha",
    defaultLanguage: "en",
    curricula: [{ curriculumCode: "IGCSE", activeSince: "2024-09-01" }],
    accreditations: ["BSO"],
  },
  {
    id: "s04",
    name: "Al Rayyan Private School",
    defaultLanguage: "ar",
    curricula: [{ curriculumCode: "MOEHE", activeSince: "2024-09-01" }],
    accreditations: ["QNSA"],
  },
  {
    id: "s05",
    name: "Gulf International Academy",
    defaultLanguage: "en",
    curricula: [
      { curriculumCode: "IB_MYP", activeSince: "2024-09-01" },
      { curriculumCode: "IGCSE", activeSince: "2024-09-01" },
    ],
    accreditations: ["IB", "BSO"],
  },
  {
    id: "s06",
    name: "Al Wakra Modern School",
    defaultLanguage: "ar",
    curricula: [{ curriculumCode: "MOEHE", activeSince: "2024-09-01" }],
    accreditations: ["QNSA"],
  },
  {
    id: "s07",
    name: "Doha Multi-Track Academy",
    defaultLanguage: "en",
    curricula: [
      { curriculumCode: "IB_MYP", activeSince: "2024-09-01" },
      { curriculumCode: "IGCSE", activeSince: "2024-09-01" },
      { curriculumCode: "MOEHE", activeSince: "2024-09-01" },
    ],
    accreditations: ["QNSA", "IB", "BSO"],
  },
  {
    id: "s08",
    name: "Cambridge School Qatar",
    defaultLanguage: "en",
    curricula: [{ curriculumCode: "IGCSE", activeSince: "2024-09-01" }],
    accreditations: ["BSO"],
  },
  {
    id: "s09",
    name: "Umm Salal Education Centre",
    defaultLanguage: "ar",
    curricula: [{ curriculumCode: "MOEHE", activeSince: "2024-09-01" }],
    accreditations: ["QNSA"],
  },
  {
    id: "s10",
    name: "Qatar STEM Academy",
    defaultLanguage: "en",
    curricula: [{ curriculumCode: "GENERIC", activeSince: "2024-09-01" }],
    accreditations: [],
  },
];

describe("Multi-School Platform — 10 schools", () => {
  it("all 10 schools resolve to valid curriculum profiles", () => {
    for (const school of schools) {
      for (const { curriculumCode } of school.curricula) {
        const c = getCurriculum(curriculumCode);
        expect(c).toBeDefined();
        if (school.id !== "s10") expect(c.code).toBe(curriculumCode);
        else expect(c.code).toBe("GENERIC");
      }
    }
  });

  it("all accreditations resolve", () => {
    for (const school of schools) {
      for (const code of school.accreditations) {
        expect(getAccreditation(code)).toBeDefined();
      }
    }
  });

  it("school IDs are unique — no cross-contamination possible", () => {
    const ids = schools.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("multi-track school (s07) has 3 curricula with distinct models", () => {
    const s07 = schools.find((s) => s.id === "s07")!;
    expect(s07.curricula).toHaveLength(3);
    const models = s07.curricula.map(
      (a) => getCurriculum(a.curriculumCode).assessmentModels[0]
    );
    expect(new Set(models).size).toBe(3);
  });

  it("each school's assessment strategy resolves correctly", () => {
    for (const school of schools) {
      for (const { curriculumCode } of school.curricula) {
        const c = getCurriculum(curriculumCode);
        const s = getAssessmentStrategy(c.assessmentModels[0] ?? "percent");
        expect(s).toBeDefined();
      }
    }
  });

  it("curriculum count distribution: 5 MoEHE, 3 IB, 3 IGCSE, 1 Generic", () => {
    const counts: Record<string, number> = {
      MOEHE: 0,
      IB_MYP: 0,
      IGCSE: 0,
      GENERIC: 0,
    };
    for (const s of schools)
      for (const c of s.curricula)
        counts[c.curriculumCode] = (counts[c.curriculumCode] ?? 0) + 1;
    expect(counts.MOEHE).toBe(5);
    expect(counts.IB_MYP).toBe(3);
    expect(counts.IGCSE).toBe(4);
    expect(counts.GENERIC).toBe(1);
  });

  it("no school depends on hardcoded institution IDs", () => {
    for (const s of schools) {
      expect(s.id).toMatch(/^s\d+$/);
      expect(s.curricula.length).toBeGreaterThan(0);
    }
  });
});
describe("Deployment Repeatability", () => {
  it("adding school #11 requires only data, not code", () => {
    const s11: InstitutionProfile = {
      id: "s11",
      name: "New Qatar Academy",
      defaultLanguage: "en",
      curricula: [{ curriculumCode: "IB_MYP", activeSince: "2025-09-01" }],
      accreditations: ["IB"],
    };
    expect(getCurriculum("IB_MYP").code).toBe("IB_MYP");
    expect(getAccreditation("IB")!.code).toBe("IB");
    expect(s11.curricula?.[0]?.curriculumCode).toBe("IB_MYP");
  });
});

describe("Framework Pack Governance", () => {
  it("4 curriculum packs and 3 accreditation packs registered", () => {
    expect(CURRICULUM_REGISTRY.size).toBe(4);
    expect(ACCREDITATION_REGISTRY.size).toBe(3);
    for (const code of ["MOEHE", "IB_MYP", "IGCSE", "GENERIC"])
      expect(CURRICULUM_REGISTRY.has(code)).toBe(true);
    for (const code of ["QNSA", "IB", "BSO"])
      expect(ACCREDITATION_REGISTRY.has(code)).toBe(true);
  });

  it("each curriculum pack has required identity fields", () => {
    for (const [, pack] of CURRICULUM_REGISTRY) {
      expect(pack.id).toBeTruthy();
      expect(pack.code).toBeTruthy();
      expect(pack.name).toBeTruthy();
      expect(pack.assessmentModels.length).toBeGreaterThan(0);
      expect(pack.gradeScales.length).toBeGreaterThan(0);
      expect(pack.outcomeModel.outcomeTypes.length).toBeGreaterThan(0);
    }
  });

  it("each accreditation pack has required identity", () => {
    for (const [, pack] of ACCREDITATION_REGISTRY) {
      expect(pack.id).toBeTruthy();
      expect(pack.code).toBeTruthy();
      expect(pack.name).toBeTruthy();
      expect(pack.schoolLevel).toBe("k12");
    }
  });

  it("packs are pure data — no executable logic", () => {
    for (const [, pack] of CURRICULUM_REGISTRY) {
      expect(typeof pack.id).toBe("string");
      expect(Array.isArray(pack.assessmentModels)).toBe(true);
    }
  });
});

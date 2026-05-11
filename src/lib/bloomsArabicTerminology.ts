/**
 * Standardized Arabic educational terminology for Bloom's Taxonomy.
 * These terms align with established Arabic pedagogical vocabulary
 * used in Gulf Cooperation Council (GCC) educational standards.
 */
export const BLOOMS_ARABIC_STANDARD: Record<
  string,
  { term: string; verbs: string[] }
> = {
  remembering: {
    term: "التذكر",
    verbs: ["يُعرِّف", "يُسمِّي", "يَسرُد", "يَصِف", "يُحدِّد", "يَذكُر"],
  },
  understanding: {
    term: "الفهم",
    verbs: ["يُفسِّر", "يُلخِّص", "يَشرَح", "يُوضِّح", "يُقارِن", "يُصنِّف"],
  },
  applying: {
    term: "التطبيق",
    verbs: ["يُطبِّق", "يَستخدِم", "يُنفِّذ", "يَحُل", "يُوظِّف", "يُجرِّب"],
  },
  analyzing: {
    term: "التحليل",
    verbs: ["يُحلِّل", "يُقارِن", "يُميِّز", "يَفحَص", "يَستنتِج", "يُنظِّم"],
  },
  evaluating: {
    term: "التقييم",
    verbs: ["يُقيِّم", "يَنقُد", "يُبرِّر", "يَحكُم", "يُراجِع", "يُدافِع"],
  },
  creating: {
    term: "الإبداع",
    verbs: ["يُصمِّم", "يَبتكِر", "يُؤلِّف", "يُخطِّط", "يَبنِي", "يُنتِج"],
  },
};

/**
 * Standardized Arabic OBE terminology for the Qatar education context.
 */
export const OBE_ARABIC_TERMS: Record<string, string> = {
  ILO: "مخرجات التعلم المؤسسية",
  PLO: "مخرجات التعلم البرنامجية",
  CLO: "مخرجات التعلم للمقرر",
  attainment: "التحصيل",
  excellent: "ممتاز",
  satisfactory: "مُرضٍ",
  developing: "قيد التطوير",
  notYet: "لم يتحقق بعد",
  curriculumMatrix: "مصفوفة المنهج",
  CQI: "التحسين المستمر للجودة",
  courseFile: "ملف المقرر",
  outcomeMapping: "ربط المخرجات",
};

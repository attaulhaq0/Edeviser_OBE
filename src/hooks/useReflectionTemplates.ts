import { useState, useCallback, useMemo } from "react";
import type {
  ReflectionTemplateType,
  SimpleReflectionValues,
  GibbsReflectionValues,
} from "@/types/planner";
import { concatenateReflectionTemplate, countWords } from "@/lib/plannerUtils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UseReflectionTemplatesReturn {
  templateType: ReflectionTemplateType;
  setTemplateType: (type: ReflectionTemplateType) => void;
  simpleValues: SimpleReflectionValues;
  gibbsValues: GibbsReflectionValues;
  updateSimpleField: (
    field: keyof SimpleReflectionValues,
    value: string
  ) => void;
  updateGibbsField: (field: keyof GibbsReflectionValues, value: string) => void;
  freeFormContent: string;
  setFreeFormContent: (content: string) => void;
  getContent: () => string;
  wordCount: number;
  reset: () => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_SIMPLE_VALUES: SimpleReflectionValues = {
  whatWentWell: "",
  whatWasChallenging: "",
  whatWillChange: "",
};

const DEFAULT_GIBBS_VALUES: GibbsReflectionValues = {
  description: "",
  feelings: "",
  evaluation: "",
  analysis: "",
  conclusion: "",
  actionPlan: "",
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useReflectionTemplates = (): UseReflectionTemplatesReturn => {
  const [templateType, setTemplateType] =
    useState<ReflectionTemplateType>("free_form");
  const [freeFormContent, setFreeFormContent] = useState("");
  const [simpleValues, setSimpleValues] = useState<SimpleReflectionValues>(
    DEFAULT_SIMPLE_VALUES
  );
  const [gibbsValues, setGibbsValues] =
    useState<GibbsReflectionValues>(DEFAULT_GIBBS_VALUES);

  const updateSimpleField = useCallback(
    (field: keyof SimpleReflectionValues, value: string) => {
      setSimpleValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateGibbsField = useCallback(
    (field: keyof GibbsReflectionValues, value: string) => {
      setGibbsValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const getContent = useCallback((): string => {
    switch (templateType) {
      case "free_form":
        return freeFormContent;
      case "simple":
        return concatenateReflectionTemplate("simple", simpleValues);
      case "gibbs":
        return concatenateReflectionTemplate("gibbs", gibbsValues);
    }
  }, [templateType, freeFormContent, simpleValues, gibbsValues]);

  const wordCount = useMemo(() => countWords(getContent()), [getContent]);

  const reset = useCallback(() => {
    setTemplateType("free_form");
    setFreeFormContent("");
    setSimpleValues(DEFAULT_SIMPLE_VALUES);
    setGibbsValues(DEFAULT_GIBBS_VALUES);
  }, []);

  return {
    templateType,
    setTemplateType,
    simpleValues,
    gibbsValues,
    updateSimpleField,
    updateGibbsField,
    freeFormContent,
    setFreeFormContent,
    getContent,
    wordCount,
    reset,
  };
};

import { useState, useCallback } from 'react';
import { concatenateReflectionTemplate, countWords } from '@/lib/plannerUtils';
import type {
  ReflectionTemplateType,
  SimpleReflectionValues,
  GibbsReflectionValues,
} from '@/types/planner';

const EMPTY_SIMPLE: SimpleReflectionValues = {
  whatWentWell: '',
  whatWasChallenging: '',
  whatWillChange: '',
};

const EMPTY_GIBBS: GibbsReflectionValues = {
  description: '',
  feelings: '',
  evaluation: '',
  analysis: '',
  conclusion: '',
  actionPlan: '',
};

export const useReflectionTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReflectionTemplateType>('free_form');
  const [freeFormContent, setFreeFormContent] = useState('');
  const [simpleValues, setSimpleValues] = useState<SimpleReflectionValues>(EMPTY_SIMPLE);
  const [gibbsValues, setGibbsValues] = useState<GibbsReflectionValues>(EMPTY_GIBBS);

  const getConcatenatedText = useCallback((): string => {
    if (selectedTemplate === 'free_form') return freeFormContent;
    if (selectedTemplate === 'simple') return concatenateReflectionTemplate('simple', simpleValues);
    return concatenateReflectionTemplate('gibbs', gibbsValues);
  }, [selectedTemplate, freeFormContent, simpleValues, gibbsValues]);

  const getWordCount = useCallback((): number => {
    return countWords(getConcatenatedText());
  }, [getConcatenatedText]);

  const reset = useCallback(() => {
    setSelectedTemplate('free_form');
    setFreeFormContent('');
    setSimpleValues(EMPTY_SIMPLE);
    setGibbsValues(EMPTY_GIBBS);
  }, []);

  return {
    selectedTemplate,
    setSelectedTemplate,
    freeFormContent,
    setFreeFormContent,
    simpleValues,
    setSimpleValues,
    gibbsValues,
    setGibbsValues,
    getConcatenatedText,
    getWordCount,
    reset,
  };
};

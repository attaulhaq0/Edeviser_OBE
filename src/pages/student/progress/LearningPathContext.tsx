import { createContext, useContext } from "react";
import type { BloomStage } from "./LearningPath";

export interface LearningPathContextValue {
  selectedCourseId: string;
  setSelectedCourseId: (id: string) => void;
  selectedStageKey: string;
  setSelectedStageKey: (key: string) => void;
  stages: BloomStage[];
  currentStage: BloomStage | undefined;
  view: "journey" | "tree";
  setView: (view: "journey" | "tree") => void;
  isLoading?: boolean;
}

export const LearningPathContext =
  createContext<LearningPathContextValue | null>(null);

export const useLearningPathContext = () => {
  return useContext(LearningPathContext);
};

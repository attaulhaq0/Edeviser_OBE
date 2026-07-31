// =============================================================================
// StudentLearningPathRail — right rail for the student Learning Path page
//   Level detail card · Bloom's Mastery Summary.
// =============================================================================

import { useTranslation } from "react-i18next";
import { useLearningPathContext } from "@/pages/student/progress/LearningPathContext";
import {
  StageDetail,
  BloomOverviewCard,
} from "@/pages/student/progress/LearningPath";

const StudentLearningPathRail = () => {
  const { t } = useTranslation("student");
  const ctx = useLearningPathContext();

  if (!ctx || !ctx.currentStage) return null;

  return (
    <aside
      aria-label={t("learningPath.rail.label", "Level Details")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block space-y-4"
    >
      <StageDetail stage={ctx.currentStage} />
      <BloomOverviewCard stages={ctx.stages} />
    </aside>
  );
};

export default StudentLearningPathRail;

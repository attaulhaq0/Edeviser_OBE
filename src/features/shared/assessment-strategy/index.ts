// Assessment Strategy Feature — Phase 16
// Barrel export for strategy-aware assessment input components
export { AssessmentStrategyInput } from "./AssessmentStrategyInput";
export { PercentStrategyInput } from "./components/PercentStrategyInput";
export { CriterionStrategyInput } from "./components/CriterionStrategyInput";
export { BandGradeStrategyInput } from "./components/BandGradeStrategyInput";
export { ComponentStrategyInput } from "./components/ComponentStrategyInput";
export { resolvePolicy, FRAMEWORK_STRATEGY_MAP, IB_MYP_GRADE_SCALE, IGCSE_9_1_GRADE_SCALE, type ResolvedPolicy } from "@/lib/canonicalPolicyResolver";
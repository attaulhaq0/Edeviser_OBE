// =============================================================================
// aiCostPolicy.ts — AI Cost Control & Environment Configuration (Phase 15)
// Safe AI enablement with cost-conscious guardrails
// =============================================================================

export type AIEnvironment =
  | "AI_DISABLED"
  | "AI_SHADOW"
  | "AI_ENABLED_QA"
  | "AI_ENABLED_PILOT";

export interface AICostPolicy {
  environment: AIEnvironment;
  /** DeepSeek is the primary LLM (per product constitution) */
  provider: "deepseek";
  /** Model selection per environment */
  model: string;
  /** Maximum tokens per request */
  maxTokensPerRequest: number;
  /** Maximum context length */
  maxContextTokens: number;
  /** Maximum requests per student per day */
  maxRequestsPerStudentPerDay: number;
  /** Maximum monthly cost per institution (USD) */
  maxMonthlyCostPerInstitution: number;
  /** Whether responses can be cached (deterministic outputs only) */
  enableResponseCaching: boolean;
  /** Cache TTL in seconds */
  cacheTTLSeconds: number;
  /** Whether to batch background AI jobs */
  enableBackgroundBatching: boolean;
  /** AI only when deterministic signals justify it */
  requireDeterministicSignalForAI: boolean;
  /** Rate limit window in seconds */
  rateLimitWindowSeconds: number;
  /** Maximum concurrent AI requests */
  maxConcurrentRequests: number;
  /** Whether AI shadow evaluation is enabled (log LLM output without showing to user) */
  enableShadowEvaluation: boolean;
}

export const AI_COST_POLICIES: Record<AIEnvironment, AICostPolicy> = {
  AI_DISABLED: {
    environment: "AI_DISABLED",
    provider: "deepseek",
    model: "deepseek-chat",
    maxTokensPerRequest: 0,
    maxContextTokens: 0,
    maxRequestsPerStudentPerDay: 0,
    maxMonthlyCostPerInstitution: 0,
    enableResponseCaching: false,
    cacheTTLSeconds: 0,
    enableBackgroundBatching: false,
    requireDeterministicSignalForAI: true,
    rateLimitWindowSeconds: 3600,
    maxConcurrentRequests: 0,
    enableShadowEvaluation: false,
  },
  AI_SHADOW: {
    environment: "AI_SHADOW",
    provider: "deepseek",
    model: "deepseek-chat",
    maxTokensPerRequest: 1000,
    maxContextTokens: 4000,
    maxRequestsPerStudentPerDay: 5,
    maxMonthlyCostPerInstitution: 10,
    enableResponseCaching: true,
    cacheTTLSeconds: 3600,
    enableBackgroundBatching: true,
    requireDeterministicSignalForAI: true,
    rateLimitWindowSeconds: 60,
    maxConcurrentRequests: 5,
    enableShadowEvaluation: true,
  },
  AI_ENABLED_QA: {
    environment: "AI_ENABLED_QA",
    provider: "deepseek",
    model: "deepseek-chat",
    maxTokensPerRequest: 2000,
    maxContextTokens: 8000,
    maxRequestsPerStudentPerDay: 20,
    maxMonthlyCostPerInstitution: 50,
    enableResponseCaching: true,
    cacheTTLSeconds: 1800,
    enableBackgroundBatching: true,
    requireDeterministicSignalForAI: false,
    rateLimitWindowSeconds: 30,
    maxConcurrentRequests: 10,
    enableShadowEvaluation: false,
  },
  AI_ENABLED_PILOT: {
    environment: "AI_ENABLED_PILOT",
    provider: "deepseek",
    model: "deepseek-chat",
    maxTokensPerRequest: 4000,
    maxContextTokens: 16000,
    maxRequestsPerStudentPerDay: 50,
    maxMonthlyCostPerInstitution: 200,
    enableResponseCaching: true,
    cacheTTLSeconds: 900,
    enableBackgroundBatching: true,
    requireDeterministicSignalForAI: false,
    rateLimitWindowSeconds: 10,
    maxConcurrentRequests: 20,
    enableShadowEvaluation: false,
  },
};

/** Resolve effective AI policy from environment variable */
export function resolveAIPolicy(): AICostPolicy {
  const env =
    (import.meta.env.VITE_AI_ENVIRONMENT as AIEnvironment) ?? "AI_DISABLED";
  return AI_COST_POLICIES[env] ?? AI_COST_POLICIES.AI_DISABLED;
}

/** Deterministic systems that should NEVER use AI */
export const DETERMINISTIC_ONLY_SYSTEMS = [
  "grade_calculation",
  "attainment_computation",
  "evidence_creation",
  "authorization",
  "state_transitions",
  "policy_enforcement",
  "attendance_recording",
] as const;

/** Systems where AI adds value */
export const AI_APPROPRIATE_SYSTEMS = [
  "tutor_conversation",
  "feedback_drafting",
  "quiz_generation",
  "intervention_recommendation",
  "habit_analysis",
  "risk_explanation",
  "mastery_explanation",
  "curriculum_suggestion",
  "reflection_scoring",
  "goal_suggestion",
] as const;

/** Compute estimated cost for a request */
export function estimateCost(
  _policy: AICostPolicy,
  tokensUsed: number
): number {
  // DeepSeek pricing (approximate as of 2026): ~$0.14/1M input tokens, ~$0.28/1M output tokens
  const avgCostPer1K = 0.0002;
  return Math.round(tokensUsed * avgCostPer1K * 100) / 100;
}

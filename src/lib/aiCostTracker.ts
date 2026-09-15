// =============================================================================
// aiCostTracker.ts — Phase 18: AI cost tracking & PostHog instrumentation
// Tracks requests, tokens, latency, errors, cost by school/workflow/agent/model
// Safe: never logs prompt/response content or sensitive educational data
// =============================================================================

import { resolveAIPolicy, type AIEnvironment } from "./aiCostPolicy";
import type { AICapability } from "./aiFeatureFlags";

export interface AICostEvent {
  timestamp: string;
  environment: AIEnvironment;
  capability: AICapability;
  provider: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  institutionId?: string;
  studentId?: string;
  workflow: string;
  estimatedCost: number;
}

/** In-memory accumulator for session cost tracking */
const sessionCosts: AICostEvent[] = [];
const MAX_SESSION_EVENTS = 500;

/** DeepSeek approximate pricing per 1K tokens */
const PRICING_PER_1K = 0.0002;

/** Track an AI request completion */
export function trackAIRequest(params: {
  capability: AICapability;
  tokensUsed: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  institutionId?: string;
  studentId?: string;
  workflow: string;
}): AICostEvent {
  const policy = resolveAIPolicy();
  const event: AICostEvent = {
    timestamp: new Date().toISOString(),
    environment: policy.environment,
    capability: params.capability,
    provider: policy.provider,
    model: policy.model,
    tokensUsed: params.tokensUsed,
    latencyMs: params.latencyMs,
    success: params.success,
    errorType: params.errorType,
    institutionId: params.institutionId,
    studentId: params.studentId,
    workflow: params.workflow,
    estimatedCost: Math.round(params.tokensUsed * PRICING_PER_1K * 100) / 100,
  };

  sessionCosts.push(event);
  if (sessionCosts.length > MAX_SESSION_EVENTS) sessionCosts.shift();

  // PostHog instrumentation (safe: no prompt/response content)
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).posthog) {
    const ph = (window as unknown as Record<string, { capture: (e: string, p: Record<string, unknown>) => void }>).posthog;
    ph?.capture("ai_request_completed", {
      capability: params.capability,
      success: params.success,
      latency_ms: params.latencyMs,
      tokens_used: params.tokensUsed,
      estimated_cost: event.estimatedCost,
      provider: policy.provider,
      environment: policy.environment,
      workflow: params.workflow,
    });
  }

  return event;
}

/** Get session cost summary */
export function getSessionCostSummary(): {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  failedRequests: number;
  avgLatencyMs: number;
  byCapability: Record<string, { count: number; tokens: number; cost: number }>;
  byWorkflow: Record<string, { count: number; tokens: number; cost: number }>;
} {
  const total = sessionCosts.length;
  const succeeded = sessionCosts.filter((e) => e.success);
  const failed = total - succeeded.length;

  const byCapability: Record<string, { count: number; tokens: number; cost: number }> = {};
  const byWorkflow: Record<string, { count: number; tokens: number; cost: number }> = {};
  for (const e of sessionCosts) {
    const capEntry = byCapability[e.capability] ?? (byCapability[e.capability] = { count: 0, tokens: 0, cost: 0 });
    capEntry.count++; capEntry.tokens += e.tokensUsed; capEntry.cost += e.estimatedCost;
    const wfEntry = byWorkflow[e.workflow] ?? (byWorkflow[e.workflow] = { count: 0, tokens: 0, cost: 0 });
    wfEntry.count++; wfEntry.tokens += e.tokensUsed; wfEntry.cost += e.estimatedCost;
  }

  return {
    totalRequests: total,
    totalTokens: sessionCosts.reduce((s, e) => s + e.tokensUsed, 0),
    totalCost: Math.round(sessionCosts.reduce((s, e) => s + e.estimatedCost, 0) * 100) / 100,
    failedRequests: failed,
    avgLatencyMs: succeeded.length > 0 ? Math.round(succeeded.reduce((s, e) => s + e.latencyMs, 0) / succeeded.length) : 0,
    byCapability,
    byWorkflow,
  };
}

/** Check if budget is at risk */
export function isBudgetAtRisk(context: {
  monthlyBudget?: number;
  currentMonthCost?: number;
  warningThreshold?: number;
}): { atRisk: boolean; percentUsed: number; message: string } {
  const budget = context.monthlyBudget ?? resolveAIPolicy().maxMonthlyCostPerInstitution;
  const cost = context.currentMonthCost ?? 0;
  const threshold = context.warningThreshold ?? 0.8;

  // Zero budget means unlimited (no cost tracking) — never at risk
  if (budget <= 0) return { atRisk: false, percentUsed: 0, message: "Budget: unlimited (no tracking)" };

  const pct = (cost / budget) * 100;
  const atRisk = cost >= budget * threshold;
  return {
    atRisk,
    percentUsed: Math.round(pct * 100) / 100,
    message: atRisk ? `Budget at ${pct.toFixed(0)}% of monthly maximum ($${cost}/$${budget})` : `Budget OK: $${cost}/$${budget}`,
  };
}

/** Reset session tracking */
export function resetSessionCosts(): void { sessionCosts.length = 0; }
import type { OperationalAutonomy } from "./contracts.ts";

export interface EnvironmentReader {
  get(name: string): string | undefined;
}

export type AIProviderName = "deepseek";
export type EmbeddingProviderName = "supabase_gte_small";
export type DeepSeekModel = "deepseek-v4-flash" | "deepseek-v4-pro";

export interface AgenticConfig {
  enabled: boolean;
  proactiveEnabled: boolean;
  autoLowRiskEnabled: boolean;
  provider: AIProviderName;
  embeddingProvider: EmbeddingProviderName;
  deepSeek: {
    baseUrl: "https://api.deepseek.com";
    primaryModel: DeepSeekModel;
    complexModel: DeepSeekModel;
    timeoutMs: number;
    maxRetries: number;
    maxOutputTokens: number;
  };
  limits: {
    maxToolSteps: number;
    maxToolCalls: number;
    maxAgentTransfers: number;
    dailyBudgetUsd: number;
  };
  maximumAutonomy: OperationalAutonomy;
}

export class AgenticConfigurationError extends Error {
  constructor(readonly field: string, message: string) {
    super(message);
    this.name = "AgenticConfigurationError";
  }
}

const integer = (
  env: EnvironmentReader,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const raw = env.get(name);
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new AgenticConfigurationError(
      name,
      `${name} must be an integer from ${minimum} to ${maximum}`
    );
  }
  return parsed;
};

const decimal = (
  env: EnvironmentReader,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const raw = env.get(name);
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new AgenticConfigurationError(
      name,
      `${name} must be a number from ${minimum} to ${maximum}`
    );
  }
  return parsed;
};

const enabled = (env: EnvironmentReader, name: string): boolean =>
  env.get(name)?.trim().toLowerCase() === "true";

const model = (
  env: EnvironmentReader,
  name: string,
  fallback: DeepSeekModel
): DeepSeekModel => {
  const value = env.get(name) ?? fallback;
  if (value !== "deepseek-v4-flash" && value !== "deepseek-v4-pro") {
    throw new AgenticConfigurationError(
      name,
      `${name} must be deepseek-v4-flash or deepseek-v4-pro`
    );
  }
  return value;
};

export const getAgenticConfig = (env: EnvironmentReader): AgenticConfig => {
  const featureEnabled = enabled(env, "AI_FEATURE_ENABLED");
  const provider = env.get("AI_PROVIDER") ?? "deepseek";
  if (provider !== "deepseek") {
    throw new AgenticConfigurationError(
      "AI_PROVIDER",
      "AI_PROVIDER must be deepseek"
    );
  }
  const embeddingProvider =
    env.get("EMBEDDING_PROVIDER") ?? "supabase_gte_small";
  if (embeddingProvider !== "supabase_gte_small") {
    throw new AgenticConfigurationError(
      "EMBEDDING_PROVIDER",
      "Unsupported embedding provider"
    );
  }
  const baseUrl = env.get("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com";
  if (baseUrl.replace(/\/$/, "") !== "https://api.deepseek.com") {
    throw new AgenticConfigurationError(
      "DEEPSEEK_BASE_URL",
      "DEEPSEEK_BASE_URL must use the official HTTPS API origin"
    );
  }

  const dailyBudgetUsd = decimal(env, "AI_DAILY_BUDGET_USD", 0, 0, 100_000);
  if (featureEnabled && dailyBudgetUsd <= 0) {
    throw new AgenticConfigurationError(
      "AI_DAILY_BUDGET_USD",
      "AI_DAILY_BUDGET_USD must be greater than zero when AI is enabled"
    );
  }

  return {
    enabled: featureEnabled,
    proactiveEnabled: enabled(env, "AI_PROACTIVE_AGENTS_ENABLED"),
    autoLowRiskEnabled: enabled(env, "AI_AUTO_LOW_RISK_ENABLED"),
    provider,
    embeddingProvider,
    deepSeek: {
      baseUrl: "https://api.deepseek.com",
      primaryModel: model(env, "DEEPSEEK_PRIMARY_MODEL", "deepseek-v4-flash"),
      complexModel: model(env, "DEEPSEEK_COMPLEX_MODEL", "deepseek-v4-pro"),
      timeoutMs: integer(env, "AI_REQUEST_TIMEOUT_MS", 15_000, 1_000, 120_000),
      maxRetries: integer(env, "AI_MAX_RETRIES", 2, 0, 3),
      maxOutputTokens: integer(env, "AI_MAX_OUTPUT_TOKENS", 2_048, 64, 32_768),
    },
    limits: {
      maxToolSteps: integer(env, "AI_MAX_TOOL_STEPS", 4, 1, 10),
      maxToolCalls: integer(env, "AI_MAX_TOOL_CALLS", 6, 1, 20),
      maxAgentTransfers: integer(env, "AI_MAX_AGENT_TRANSFERS", 2, 0, 5),
      dailyBudgetUsd,
    },
    maximumAutonomy: "A2",
  };
};

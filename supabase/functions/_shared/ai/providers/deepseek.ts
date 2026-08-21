/**
 * Server-only DeepSeek boundary.
 *
 * This module is intentionally not wired into product features yet. Keep the
 * secret lookup here so future callers cannot accidentally accept credentials
 * or provider URLs from a request payload or from the browser.
 */

export const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";
export const DEEPSEEK_LEGACY_MODELS = ["deepseek-chat", "deepseek-reasoner"] as const;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_OUTPUT_TOKENS = 512;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 2;

type DenoRuntime = {
  env: { get(name: string): string | undefined };
};

const getDenoEnv = (name: string): string | undefined => {
  const runtime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
  return runtime?.env.get(name);
};

export type DeepSeekRole = "system" | "user" | "assistant" | "tool";

export interface DeepSeekMessage {
  role: DeepSeekRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: readonly DeepSeekToolCall[];
}

export interface DeepSeekToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface DeepSeekTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface DeepSeekChatRequest {
  messages: readonly DeepSeekMessage[];
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  thinking?: { type: "enabled" | "disabled" };
  tools?: readonly DeepSeekTool[];
  toolChoice?: "none" | "auto";
  signal?: AbortSignal;
}

export interface DeepSeekUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface DeepSeekChatResult {
  content: string;
  model: string;
  finishReason: string | null;
  toolCalls: readonly DeepSeekToolCall[];
  usage?: DeepSeekUsage;
}

export interface DeepSeekConfig {
  provider: "deepseek";
  baseUrl: string;
  primaryModel: typeof DEEPSEEK_DEFAULT_MODEL;
  complexModel: typeof DEEPSEEK_DEFAULT_MODEL;
  timeoutMs: number;
  maxRetries: number;
  maxOutputTokens: number;
  maxConcurrentRequests: number;
}

export class DeepSeekProviderError extends Error {
  readonly code: "missing_api_key" | "invalid_config" | "timeout" | "http" | "invalid_response";
  readonly status?: number;

  constructor(
    code: DeepSeekProviderError["code"],
    message: string,
    status?: number
  ) {
    super(message);
    this.name = "DeepSeekProviderError";
    this.code = code;
    this.status = status;
  }
}

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const ensureSupportedModel = (model: string): typeof DEEPSEEK_DEFAULT_MODEL => {
  if (model !== DEEPSEEK_DEFAULT_MODEL) {
    throw new DeepSeekProviderError(
      "invalid_config",
      `Unsupported DeepSeek model configured: ${model}`
    );
  }
  return DEEPSEEK_DEFAULT_MODEL;
};

export const getDeepSeekConfig = (): DeepSeekConfig => {
  const baseUrl = (getDenoEnv("DEEPSEEK_BASE_URL") ?? DEEPSEEK_DEFAULT_BASE_URL).replace(/\/$/, "");
  const primaryModel = getDenoEnv("DEEPSEEK_PRIMARY_MODEL") ?? DEEPSEEK_DEFAULT_MODEL;
  const complexModel = getDenoEnv("DEEPSEEK_COMPLEX_MODEL") ?? DEEPSEEK_DEFAULT_MODEL;

  if (baseUrl !== DEEPSEEK_DEFAULT_BASE_URL) {
    throw new DeepSeekProviderError(
      "invalid_config",
      `DeepSeek base URL must be ${DEEPSEEK_DEFAULT_BASE_URL}`
    );
  }
  const resolvedPrimaryModel = ensureSupportedModel(primaryModel);
  const resolvedComplexModel = ensureSupportedModel(complexModel);

  return {
    provider: "deepseek",
    baseUrl,
    primaryModel: resolvedPrimaryModel,
    complexModel: resolvedComplexModel,
    timeoutMs: positiveInteger(getDenoEnv("DEEPSEEK_TIMEOUT_MS"), DEFAULT_TIMEOUT_MS),
    maxRetries: Math.min(3, positiveInteger(getDenoEnv("DEEPSEEK_MAX_RETRIES"), DEFAULT_MAX_RETRIES)),
    maxOutputTokens: Math.min(
      2048,
      positiveInteger(getDenoEnv("DEEPSEEK_MAX_OUTPUT_TOKENS"), DEFAULT_MAX_OUTPUT_TOKENS)
    ),
    maxConcurrentRequests: Math.min(
      4,
      positiveInteger(
        getDenoEnv("DEEPSEEK_MAX_CONCURRENT_REQUESTS"),
        DEFAULT_MAX_CONCURRENT_REQUESTS
      )
    ),
  };
};

const retryableStatus = (status: number): boolean => status === 408 || status === 429 || status >= 500;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const parseUsage = (value: unknown): DeepSeekUsage | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const usage = value as Record<string, unknown>;
  const promptTokens = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined;
  const completionTokens = typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;
  return promptTokens === undefined && completionTokens === undefined && totalTokens === undefined
    ? undefined
    : { promptTokens, completionTokens, totalTokens };
};

export const createDeepSeekProvider = () => {
  const config = getDeepSeekConfig();
  let activeRequests = 0;
  const waiting: Array<() => void> = [];

  const acquire = async (): Promise<() => void> => {
    if (activeRequests < config.maxConcurrentRequests) {
      activeRequests += 1;
    } else {
      await new Promise<void>((resolve) => waiting.push(resolve));
      activeRequests += 1;
    }
    return () => {
      activeRequests -= 1;
      waiting.shift()?.();
    };
  };

  const complete = async (request: DeepSeekChatRequest): Promise<DeepSeekChatResult> => {
    const apiKey = getDenoEnv("DEEPSEEK_API_KEY");
    if (!apiKey) {
      throw new DeepSeekProviderError("missing_api_key", "DeepSeek API key is not configured");
    }

    const model = request.model ?? config.primaryModel;
    const resolvedModel = ensureSupportedModel(model);
    const thinking = request.thinking ?? { type: "disabled" as const };
    const body = {
      model: resolvedModel,
      messages: request.messages,
      max_tokens: Math.min(request.maxOutputTokens ?? config.maxOutputTokens, config.maxOutputTokens),
      temperature: request.temperature ?? 0.2,
      thinking,
      ...(request.tools ? { tools: request.tools } : {}),
      ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
    };

    const release = await acquire();
    try {
      for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
        try {
          const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: request.signal
              ? AbortSignal.any([request.signal, controller.signal])
              : controller.signal,
          });
          if (!response.ok) {
            if (retryableStatus(response.status) && attempt < config.maxRetries) {
              await sleep(Math.min(2_000, 250 * 2 ** attempt));
              continue;
            }
            throw new DeepSeekProviderError("http", `DeepSeek request failed with HTTP ${response.status}`, response.status);
          }

          const data: unknown = await response.json();
          if (!data || typeof data !== "object") {
            throw new DeepSeekProviderError("invalid_response", "DeepSeek returned an invalid response");
          }
          const root = data as Record<string, unknown>;
          const choices = Array.isArray(root.choices) ? root.choices : [];
          const first = choices[0];
          const choice = first && typeof first === "object" ? (first as Record<string, unknown>) : undefined;
          const message = choice?.message;
          const messageObject = message && typeof message === "object" ? (message as Record<string, unknown>) : undefined;
          const content = typeof messageObject?.content === "string" ? messageObject.content : "";
          const toolCalls = Array.isArray(messageObject?.tool_calls)
            ? (messageObject.tool_calls as DeepSeekToolCall[])
            : [];
          if (!choice || (content.length === 0 && toolCalls.length === 0)) {
            throw new DeepSeekProviderError("invalid_response", "DeepSeek returned no message content");
          }
          return {
            content,
            model: typeof root.model === "string" ? root.model : model,
            finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
            toolCalls,
            usage: parseUsage(root.usage),
          };
        } catch (error) {
          if (error instanceof DeepSeekProviderError) throw error;
          if (error instanceof DOMException && error.name === "AbortError") {
            throw new DeepSeekProviderError("timeout", "DeepSeek request timed out");
          }
          if (attempt < config.maxRetries) {
            await sleep(Math.min(2_000, 250 * 2 ** attempt));
            continue;
          }
          throw new DeepSeekProviderError("http", "DeepSeek request could not be completed");
        } finally {
          clearTimeout(timeout);
        }
      }
      throw new DeepSeekProviderError("http", "DeepSeek request could not be completed");
    } finally {
      release();
    }
  };

  return { config, complete };
};

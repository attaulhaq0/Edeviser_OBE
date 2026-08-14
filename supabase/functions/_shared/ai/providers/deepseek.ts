import type { AgenticConfig, EnvironmentReader } from "../config.ts";
import {
  AIProviderError,
  type AICompletionRequest,
  type AICompletionResponse,
  type AIProvider,
  type AIToolCall,
  type AIUsage,
} from "../provider.ts";

interface DeepSeekDependencies {
  env: EnvironmentReader;
  fetch: typeof fetch;
  sleep: (milliseconds: number) => Promise<void>;
}

interface JsonObject {
  [key: string]: unknown;
}

const object = (value: unknown): JsonObject | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const parseToolCalls = (value: unknown): AIToolCall[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const call = object(entry);
    const fn = object(call?.function);
    if (
      typeof call?.id !== "string" ||
      call.type !== "function" ||
      typeof fn?.name !== "string" ||
      typeof fn.arguments !== "string"
    ) {
      throw new AIProviderError(
        "malformed_response",
        "DeepSeek returned a malformed tool call"
      );
    }
    let args: unknown;
    try {
      args = JSON.parse(fn.arguments);
    } catch {
      throw new AIProviderError(
        "malformed_response",
        "DeepSeek returned invalid tool arguments"
      );
    }
    return { id: call.id, name: fn.name, arguments: args };
  });
};

// Official prices verified 2026-08-14. Estimation is informational and never
// authorizes spend; the server-side budget gate remains deterministic.
const MODEL_PRICES = {
  "deepseek-v4-flash": { input: 0.14, cachedInput: 0.0028, output: 0.28 },
  "deepseek-v4-pro": { input: 0.435, cachedInput: 0.003625, output: 0.87 },
} as const;

const parseUsage = (value: unknown, model: string): AIUsage | undefined => {
  const usage = object(value);
  if (!usage) return undefined;
  const inputTokens = finiteNumber(usage.prompt_tokens);
  const outputTokens = finiteNumber(usage.completion_tokens);
  const totalTokens = finiteNumber(usage.total_tokens);
  const details = object(usage.prompt_tokens_details);
  const cachedInputTokens = finiteNumber(details?.cached_tokens);
  const prices =
    model === "deepseek-v4-flash" || model === "deepseek-v4-pro"
      ? MODEL_PRICES[model]
      : undefined;
  const uncached = Math.max(0, (inputTokens ?? 0) - (cachedInputTokens ?? 0));
  const estimatedCostUsd = prices
    ? (uncached * prices.input +
        (cachedInputTokens ?? 0) * prices.cachedInput +
        (outputTokens ?? 0) * prices.output) /
      1_000_000
    : undefined;
  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
  };
};

const retryDelay = (response: Response | null, attempt: number): number => {
  const retryAfter = response?.headers.get("Retry-After");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(5_000, seconds * 1_000);
  }
  return Math.min(2_000, 250 * 2 ** attempt);
};

const classifyStatus = (status: number): AIProviderError => {
  if (status === 401 || status === 403) {
    return new AIProviderError(
      "authentication",
      "Generation provider authentication failed",
      status
    );
  }
  if (status === 429) {
    return new AIProviderError(
      "rate_limit",
      "Generation provider rate limit reached",
      status,
      true
    );
  }
  if (status === 408 || status >= 500) {
    return new AIProviderError(
      "transient",
      "Generation provider is temporarily unavailable",
      status,
      true
    );
  }
  return new AIProviderError(
    "provider",
    "Generation provider rejected the request",
    status
  );
};

export const createDeepSeekProvider = (
  config: AgenticConfig,
  dependencies: Partial<DeepSeekDependencies> &
    Pick<DeepSeekDependencies, "env">
): AIProvider => {
  const fetchImpl = dependencies.fetch ?? fetch;
  const sleep =
    dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  return {
    name: "deepseek",
    async complete(
      request: AICompletionRequest
    ): Promise<AICompletionResponse> {
      const apiKey = dependencies.env.get("DEEPSEEK_API_KEY")?.trim();
      if (!apiKey) {
        throw new AIProviderError(
          "configuration",
          "Generation provider is not configured"
        );
      }
      const model =
        request.modelTier === "complex"
          ? config.deepSeek.complexModel
          : config.deepSeek.primaryModel;
      const body = {
        model,
        thinking: {
          type: request.modelTier === "complex" ? "enabled" : "disabled",
        },
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
          ...(message.name ? { name: message.name } : {}),
          ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
          ...(message.toolCalls
            ? {
                tool_calls: message.toolCalls.map((call) => ({
                  id: call.id,
                  type: "function",
                  function: {
                    name: call.name,
                    arguments: JSON.stringify(call.arguments),
                  },
                })),
              }
            : {}),
        })),
        max_tokens: Math.min(
          request.maxOutputTokens ?? config.deepSeek.maxOutputTokens,
          config.deepSeek.maxOutputTokens
        ),
        temperature: request.temperature ?? 0.2,
        ...(request.responseFormat === "json"
          ? { response_format: { type: "json_object" } }
          : {}),
        ...(request.tools
          ? {
              tools: request.tools.map((tool) => ({
                type: "function",
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputJsonSchema,
                },
              })),
            }
          : {}),
        ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
      };

      for (
        let attempt = 0;
        attempt <= config.deepSeek.maxRetries;
        attempt += 1
      ) {
        const controller = new AbortController();
        const onAbort = () => controller.abort(request.signal?.reason);
        request.signal?.addEventListener("abort", onAbort, { once: true });
        const timeout = setTimeout(
          () => controller.abort("timeout"),
          config.deepSeek.timeoutMs
        );
        let response: Response | null = null;
        try {
          response = await fetchImpl(
            `${config.deepSeek.baseUrl}/chat/completions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              signal: controller.signal,
            }
          );
          if (!response.ok) {
            const classified = classifyStatus(response.status);
            if (classified.retryable && attempt < config.deepSeek.maxRetries) {
              try {
                await response.body?.cancel();
              } catch {
                // The response may already be closed; retry classification wins.
              }
              await sleep(retryDelay(response, attempt));
              continue;
            }
            throw classified;
          }
          let raw: unknown;
          try {
            raw = await response.json();
          } catch {
            throw new AIProviderError(
              "malformed_response",
              "Generation provider returned invalid JSON"
            );
          }
          const root = object(raw);
          const first = Array.isArray(root?.choices)
            ? object(root.choices[0])
            : null;
          const message = object(first?.message);
          const content =
            typeof message?.content === "string" ? message.content : "";
          const toolCalls = parseToolCalls(message?.tool_calls);
          if (
            !root ||
            !first ||
            !message ||
            (!content && toolCalls.length === 0)
          ) {
            throw new AIProviderError(
              "malformed_response",
              "Generation provider returned no usable response"
            );
          }
          const responseModel =
            typeof root.model === "string" ? root.model : model;
          return {
            id: typeof root.id === "string" ? root.id : undefined,
            content,
            model: responseModel,
            finishReason:
              typeof first.finish_reason === "string"
                ? first.finish_reason
                : null,
            toolCalls,
            usage: parseUsage(root.usage, responseModel),
          };
        } catch (error) {
          if (error instanceof AIProviderError) throw error;
          if (controller.signal.aborted) {
            if (request.signal?.aborted) {
              throw new AIProviderError(
                "cancelled",
                "Generation request was cancelled"
              );
            }
            if (attempt < config.deepSeek.maxRetries) {
              await sleep(retryDelay(response, attempt));
              continue;
            }
            throw new AIProviderError(
              "timeout",
              "Generation provider timed out",
              undefined,
              true
            );
          }
          if (attempt < config.deepSeek.maxRetries) {
            await sleep(retryDelay(response, attempt));
            continue;
          }
          throw new AIProviderError(
            "transient",
            "Generation provider could not be reached",
            undefined,
            true
          );
        } finally {
          clearTimeout(timeout);
          request.signal?.removeEventListener("abort", onAbort);
        }
      }
      throw new AIProviderError(
        "transient",
        "Generation provider could not be reached",
        undefined,
        true
      );
    },
  };
};

import {
  AIProviderError,
  type AICompletionRequest,
  type AICompletionResponse,
  type AIProvider,
} from "../provider.ts";

export interface MockProviderOptions {
  /** Fixed reply body; defaults to a deterministic marker string. */
  content?: string;
  /** When set, complete() rejects with this error kind instead of replying. */
  failureKind?:
    | "configuration"
    | "authentication"
    | "rate_limit"
    | "timeout"
    | "transient"
    | "provider"
    | "malformed_response"
    | "cancelled"
    | "budget";
  /** Simulated token usage reported back to callers/log sinks. */
  usage?: { inputTokens: number; outputTokens: number };
}

export interface MockProvider extends AIProvider {
  /** Every completion request received, for assertions in tests. */
  readonly calls: readonly AICompletionRequest[];
}

/**
 * Deterministic in-process provider for unit/integration tests and local
 * tooling. NEVER selectable in production configuration — the factory only
 * constructs "deepseek"; tests must inject this provider explicitly.
 *
 * Mirrors the DeepSeek provider's response shape so call sites and log sinks
 * are exercised identically without network access or spend.
 */
export const createMockProvider = (
  options: MockProviderOptions = {}
): MockProvider => {
  const calls: AICompletionRequest[] = [];

  return {
    name: "mock",
    get calls() {
      return calls;
    },
    async complete(
      request: AICompletionRequest
    ): Promise<AICompletionResponse> {
      calls.push(request);

      if (options.failureKind) {
        throw new AIProviderError(options.failureKind, "mock failure");
      }

      const lastUser = [...request.messages]
        .reverse()
        .find((message) => message.role === "user");
      const content =
        options.content ?? `[mock] ${lastUser?.content?.slice(0, 120) ?? "ok"}`;

      const inputTokens = options.usage?.inputTokens ?? 10;
      const outputTokens = options.usage?.outputTokens ?? 5;

      return {
        id: `mock-${calls.length}`,
        content,
        model: "mock-model",
        finishReason: "stop",
        toolCalls: [],
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCostUsd: 0,
        },
      };
    },
  };
};
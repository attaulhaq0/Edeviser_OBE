export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: readonly AIToolCall[];
}

export interface AIToolDefinition {
  name: string;
  description: string;
  inputJsonSchema: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface AICompletionRequest {
  messages: readonly AIMessage[];
  modelTier?: "primary" | "complex";
  maxOutputTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json";
  tools?: readonly AIToolDefinition[];
  toolChoice?: "none" | "auto";
  signal?: AbortSignal;
}

export interface AIUsage {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

export interface AICompletionResponse {
  id?: string;
  content: string;
  model: string;
  finishReason: string | null;
  toolCalls: readonly AIToolCall[];
  usage?: AIUsage;
}

export type AIProviderErrorKind =
  | "configuration"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "transient"
  | "provider"
  | "malformed_response"
  | "cancelled"
  | "budget";

export class AIProviderError extends Error {
  constructor(
    readonly kind: AIProviderErrorKind,
    message: string,
    readonly status?: number,
    readonly retryable = false
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
}

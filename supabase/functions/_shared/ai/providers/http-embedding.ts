import {
  EmbeddingProviderError,
  validateEmbeddingResponse,
  type EmbeddingProvider,
  type EmbeddingResponse,
} from "../embedding.ts";

export interface HttpEmbeddingProviderOptions {
  endpoint: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

const METADATA = {
  provider: "self_hosted_http",
  model: "BAAI/bge-m3",
  dimensions: 1024,
  version: 3,
  maxInputTokens: 8192,
  languageSupport: "multilingual",
  normalized: true,
} as const;

const isFiniteVector = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));

const parseVectors = (value: unknown): number[][] | null => {
  if (Array.isArray(value) && value.every(isFiniteVector)) return value;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const vectors = record.embeddings ?? record.data;
  if (Array.isArray(vectors) && vectors.every(isFiniteVector)) return vectors;
  return null;
};

export const createHttpEmbeddingProvider = (
  options: HttpEmbeddingProviderOptions
): EmbeddingProvider => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint.trim();
  if (!endpoint) {
    throw new EmbeddingProviderError(
      "configuration",
      "A multilingual embedding endpoint is required"
    );
  }

  return {
    metadata: METADATA,
    async embed(request): Promise<EmbeddingResponse> {
      if (request.signal?.aborted) {
        throw new EmbeddingProviderError("cancelled", "Embedding request was cancelled");
      }
      if (
        request.inputs.length === 0 ||
        request.inputs.some((input) => !input.trim())
      ) {
        throw new EmbeddingProviderError(
          "invalid_input",
          "Embedding inputs must contain non-empty text"
        );
      }

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(options.apiKey
              ? { Authorization: `Bearer ${options.apiKey}` }
              : {}),
          },
          body: JSON.stringify({ inputs: request.inputs }),
          signal: request.signal,
        });
      } catch (error) {
        if (request.signal?.aborted) {
          throw new EmbeddingProviderError("cancelled", "Embedding request was cancelled");
        }
        throw new EmbeddingProviderError(
          "provider",
          `Multilingual embedding request failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (!response.ok) {
        throw new EmbeddingProviderError(
          "provider",
          `Multilingual embedding endpoint returned HTTP ${response.status}`
        );
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new EmbeddingProviderError(
          "invalid_output",
          "Multilingual embedding endpoint returned invalid JSON"
        );
      }
      const vectors = parseVectors(body);
      if (!vectors || vectors.length !== request.inputs.length) {
        throw new EmbeddingProviderError(
          "invalid_output",
          "Multilingual embedding endpoint returned the wrong number of vectors"
        );
      }
      return validateEmbeddingResponse({ vectors, metadata: METADATA });
    },
  };
};

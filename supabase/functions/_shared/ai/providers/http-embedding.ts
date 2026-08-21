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
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_INPUTS_PER_REQUEST = 100;
const MAX_INPUT_CHARACTERS = 32_768;

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
  let parsedEndpoint: URL;
  if (!endpoint) {
    throw new EmbeddingProviderError(
      "configuration",
      "A multilingual embedding endpoint is required"
    );
  }
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new EmbeddingProviderError(
      "configuration",
      "The multilingual embedding endpoint must be a valid URL"
    );
  }
  const isLoopback =
    parsedEndpoint.hostname === "localhost" ||
    parsedEndpoint.hostname === "127.0.0.1" ||
    parsedEndpoint.hostname === "[::1]";
  const secureTransport = parsedEndpoint.protocol === "https:";
  const localHttpTransport =
    parsedEndpoint.protocol === "http:" && isLoopback;
  if (!secureTransport && !localHttpTransport) {
    throw new EmbeddingProviderError(
      "configuration",
      "The multilingual embedding endpoint must use HTTPS"
    );
  }
  if (parsedEndpoint.username || parsedEndpoint.password || parsedEndpoint.hash) {
    throw new EmbeddingProviderError(
      "configuration",
      "The multilingual embedding endpoint must not contain credentials or a fragment"
    );
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < MIN_TIMEOUT_MS ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new EmbeddingProviderError(
      "configuration",
      `Embedding timeout must be an integer between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS} milliseconds`
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

      if (
        request.inputs.length > MAX_INPUTS_PER_REQUEST ||
        request.inputs.some((input) => input.length > MAX_INPUT_CHARACTERS)
      ) {
        throw new EmbeddingProviderError(
          "invalid_input",
          `Embedding requests are limited to ${MAX_INPUTS_PER_REQUEST} inputs and ${MAX_INPUT_CHARACTERS} characters per input`
        );
      }

      let response: Response;
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const abortFromCaller = (): void => controller.abort();
      request.signal?.addEventListener("abort", abortFromCaller, {
        once: true,
      });
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
          signal: controller.signal,
        });
      } catch (error) {
        if (request.signal?.aborted) {
          throw new EmbeddingProviderError("cancelled", "Embedding request was cancelled");
        }
        if (timedOut) {
          throw new EmbeddingProviderError(
            "provider",
            `Multilingual embedding endpoint timed out after ${timeoutMs} milliseconds`
          );
        }
        throw new EmbeddingProviderError(
          "provider",
          `Multilingual embedding request failed: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        clearTimeout(timeout);
        request.signal?.removeEventListener("abort", abortFromCaller);
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

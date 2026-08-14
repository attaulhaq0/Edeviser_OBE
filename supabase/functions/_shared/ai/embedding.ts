export interface EmbeddingMetadata {
  provider: string;
  model: string;
  dimensions: number;
  version: number;
  maxInputTokens: number;
  languageSupport: "english_only" | "multilingual";
}

export interface EmbeddingRequest {
  inputs: readonly string[];
  signal?: AbortSignal;
}

export interface EmbeddingResponse {
  vectors: readonly (readonly number[])[];
  metadata: EmbeddingMetadata;
}

export interface EmbeddingProvider {
  readonly metadata: EmbeddingMetadata;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export class EmbeddingProviderError extends Error {
  constructor(
    readonly kind:
      | "configuration"
      | "cancelled"
      | "invalid_input"
      | "invalid_output"
      | "provider",
    message: string
  ) {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}

export const validateEmbeddingResponse = (
  response: EmbeddingResponse
): EmbeddingResponse => {
  if (
    response.vectors.some(
      (vector) =>
        vector.length !== response.metadata.dimensions ||
        vector.some((value) => !Number.isFinite(value))
    )
  ) {
    throw new EmbeddingProviderError(
      "invalid_output",
      "Embedding provider returned a vector with invalid dimensions or values"
    );
  }
  return response;
};

export interface EmbeddingMetadata {
  provider: string;
  model: string;
  dimensions: number;
  version: number;
  maxInputTokens: number;
  languageSupport: "english_only" | "multilingual";
  normalized: boolean;
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
    !Number.isInteger(response.metadata.dimensions) ||
    response.metadata.dimensions <= 0 ||
    !Number.isInteger(response.metadata.version) ||
    response.metadata.version <= 0 ||
    !Number.isInteger(response.metadata.maxInputTokens) ||
    response.metadata.maxInputTokens <= 0
  ) {
    throw new EmbeddingProviderError(
      "invalid_output",
      "Embedding provider returned invalid metadata"
    );
  }

  if (
    response.vectors.some(
      (vector) =>
        vector.length !== response.metadata.dimensions ||
        vector.some((value) => !Number.isFinite(value)) ||
        (response.metadata.normalized &&
          (Math.hypot(...vector) <= Number.EPSILON ||
            Math.abs(Math.hypot(...vector) - 1) > 0.02))
    )
  ) {
    throw new EmbeddingProviderError(
      "invalid_output",
      "Embedding provider returned a vector with invalid dimensions, values, or normalization"
    );
  }
  return response;
};

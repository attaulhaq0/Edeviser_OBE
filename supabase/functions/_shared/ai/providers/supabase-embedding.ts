import {
  EmbeddingProviderError,
  validateEmbeddingResponse,
  type EmbeddingProvider,
} from "../embedding.ts";

interface SupabaseAISession {
  run(
    input: string,
    options: { mean_pool: true; normalize: true }
  ): Promise<unknown>;
}

type SessionFactory = (model: "gte-small") => SupabaseAISession;

const METADATA = {
  provider: "supabase_edge_runtime",
  model: "gte-small",
  dimensions: 384,
  version: 2,
  maxInputTokens: 512,
  languageSupport: "english_only",
} as const;

const defaultFactory: SessionFactory = (model) => {
  const runtime = globalThis as typeof globalThis & {
    Supabase?: { ai?: { Session?: new (name: string) => SupabaseAISession } };
  };
  const Session = runtime.Supabase?.ai?.Session;
  if (!Session) {
    throw new EmbeddingProviderError(
      "configuration",
      "Supabase native AI runtime is unavailable"
    );
  }
  return new Session(model);
};

export const createSupabaseEmbeddingProvider = (
  sessionFactory: SessionFactory = defaultFactory
): EmbeddingProvider => {
  let session: SupabaseAISession | undefined;
  return {
    metadata: METADATA,
    async embed(request) {
      if (request.signal?.aborted) {
        throw new EmbeddingProviderError(
          "cancelled",
          "Embedding request was cancelled"
        );
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
      session ??= sessionFactory("gte-small");
      const vectors: number[][] = [];
      for (const input of request.inputs) {
        if (request.signal?.aborted) {
          throw new EmbeddingProviderError(
            "cancelled",
            "Embedding request was cancelled"
          );
        }
        const output = await session.run(input, {
          mean_pool: true,
          normalize: true,
        });
        if (!Array.isArray(output)) {
          throw new EmbeddingProviderError(
            "invalid_output",
            "Supabase embedding runtime returned a malformed vector"
          );
        }
        vectors.push(output.map((value) => Number(value)));
      }
      return validateEmbeddingResponse({ vectors, metadata: METADATA });
    },
  };
};

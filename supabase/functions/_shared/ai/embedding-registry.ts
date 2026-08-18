import type { EmbeddingProvider } from "./embedding.ts";
import { EmbeddingProviderError } from "./embedding.ts";
import { createHttpEmbeddingProvider } from "./providers/http-embedding.ts";
import { createSupabaseEmbeddingProvider } from "./providers/supabase-embedding.ts";

export type EmbeddingProviderName =
  | "supabase_gte_small"
  | "self_hosted_bge_m3";

export interface EmbeddingProviderEnvironment {
  get(name: string): string | undefined;
}

const env: EmbeddingProviderEnvironment = {
  get: (name) => {
    const runtime = globalThis as typeof globalThis & {
      Deno?: { env?: { get: (key: string) => string | undefined } };
    };
    return runtime.Deno?.env?.get(name);
  },
};

export const createConfiguredEmbeddingProvider = (
  environment: EmbeddingProviderEnvironment = env
): EmbeddingProvider => {
  const configured = environment.get("EMBEDDING_PROVIDER")?.trim();
  if (
    configured &&
    configured !== "supabase_gte_small" &&
    configured !== "self_hosted_bge_m3"
  ) {
    throw new EmbeddingProviderError(
      "configuration",
      `Unsupported EMBEDDING_PROVIDER: ${configured}`
    );
  }

  const providerName: EmbeddingProviderName =
    configured === "self_hosted_bge_m3" ? "self_hosted_bge_m3" : "supabase_gte_small";

  if (providerName === "supabase_gte_small") {
    return createSupabaseEmbeddingProvider();
  }

  const endpoint = environment.get("EMBEDDING_ENDPOINT_URL")?.trim();
  if (!endpoint) {
    throw new EmbeddingProviderError(
      "configuration",
      "EMBEDDING_ENDPOINT_URL is required for self_hosted_bge_m3"
    );
  }
  return createHttpEmbeddingProvider({
    endpoint,
    apiKey: environment.get("EMBEDDING_ENDPOINT_KEY")?.trim() || undefined,
  });
};

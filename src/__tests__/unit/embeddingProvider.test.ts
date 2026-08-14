import { describe, expect, it, vi } from "vitest";

import { EmbeddingProviderError } from "../../../supabase/functions/_shared/ai/embedding";
import { createSupabaseEmbeddingProvider } from "../../../supabase/functions/_shared/ai/providers/supabase-embedding";

describe("Supabase-native EmbeddingProvider", () => {
  it("publishes explicit versioned metadata and normalized 384-d vectors", async () => {
    const run = vi
      .fn()
      .mockResolvedValue(Array.from({ length: 384 }, () => 0.5));
    const provider = createSupabaseEmbeddingProvider(() => ({ run }));
    const response = await provider.embed({
      inputs: ["authorized course text"],
    });
    expect(response.metadata).toEqual({
      provider: "supabase_edge_runtime",
      model: "gte-small",
      dimensions: 384,
      version: 2,
      maxInputTokens: 512,
      languageSupport: "english_only",
    });
    expect(response.vectors[0]).toHaveLength(384);
    expect(run).toHaveBeenCalledWith("authorized course text", {
      mean_pool: true,
      normalize: true,
    });
  });

  it("rejects invalid dimensions and empty inputs", async () => {
    const provider = createSupabaseEmbeddingProvider(() => ({
      run: vi.fn().mockResolvedValue([1, 2, 3]),
    }));
    await expect(provider.embed({ inputs: ["text"] })).rejects.toBeInstanceOf(
      EmbeddingProviderError
    );
    await expect(provider.embed({ inputs: [" "] })).rejects.toMatchObject({
      kind: "invalid_input",
    });
  });
});

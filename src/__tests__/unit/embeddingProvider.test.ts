import { describe, expect, it, vi } from "vitest";

import { EmbeddingProviderError } from "../../../supabase/functions/_shared/ai/embedding";
import { createSupabaseEmbeddingProvider } from "../../../supabase/functions/_shared/ai/providers/supabase-embedding";
import { createHttpEmbeddingProvider } from "../../../supabase/functions/_shared/ai/providers/http-embedding";

describe("Supabase-native EmbeddingProvider", () => {
  it("publishes explicit versioned metadata and normalized 384-d vectors", async () => {
    const run = vi
      .fn()
      .mockResolvedValue([
        1,
        ...Array.from({ length: 383 }, () => 0),
      ]);
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
      normalized: true,
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

  it("supports the explicit multilingual HTTP contract without enabling it by default", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ embeddings: [
        [1, ...Array.from({ length: 1023 }, () => 0)],
        [1, ...Array.from({ length: 1023 }, () => 0)],
      ] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = createHttpEmbeddingProvider({
      endpoint: "https://embedding.internal/v1/embed",
      apiKey: "test-only",
      fetchImpl,
    });

    const response = await provider.embed({ inputs: ["اختبار عربي", "English retrieval"] });

    expect(response.metadata).toMatchObject({
      provider: "self_hosted_http",
      model: "BAAI/bge-m3",
      dimensions: 1024,
      version: 3,
      maxInputTokens: 8192,
      languageSupport: "multilingual",
      normalized: true,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://embedding.internal/v1/embed",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-only" }),
        body: JSON.stringify({ inputs: ["اختبار عربي", "English retrieval"] }),
      })
    );
    expect(response.vectors).toHaveLength(2);
  });

  it("fails closed when the multilingual endpoint returns an incompatible shape", async () => {
    const provider = createHttpEmbeddingProvider({
      endpoint: "https://embedding.internal/v1/embed",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ embeddings: [[1, 2, 3]] }), { status: 200 })
      ),
    });
    await expect(provider.embed({ inputs: ["text"] })).rejects.toMatchObject({
      kind: "invalid_output",
    });
  });

  it("rejects insecure non-loopback endpoints", () => {
    expect(() =>
      createHttpEmbeddingProvider({ endpoint: "http://embedding.internal/v1" })
    ).toThrow("must use HTTPS");
  });

  it("rejects oversized requests before contacting the endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const provider = createHttpEmbeddingProvider({
      endpoint: "https://embedding.internal/v1/embed",
      fetchImpl,
    });
    await expect(
      provider.embed({ inputs: Array.from({ length: 101 }, () => "text") })
    ).rejects.toMatchObject({ kind: "invalid_input" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("bounds endpoint calls with a timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      })
    );
    const provider = createHttpEmbeddingProvider({
      endpoint: "https://embedding.internal/v1/embed",
      timeoutMs: 1_000,
      fetchImpl,
    });

    await expect(provider.embed({ inputs: ["text"] })).rejects.toMatchObject({
      kind: "provider",
      message: "Multilingual embedding endpoint timed out after 1000 milliseconds",
    });
  });

  it("rejects a non-normalized vector even when its dimensions are correct", async () => {
    const provider = createHttpEmbeddingProvider({
      endpoint: "https://embedding.internal/v1/embed",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            embeddings: [Array.from({ length: 1024 }, () => 0.25)],
          }),
          { status: 200 }
        )
      ),
    });
    await expect(provider.embed({ inputs: ["text"] })).rejects.toMatchObject({
      kind: "invalid_output",
    });
  });
});

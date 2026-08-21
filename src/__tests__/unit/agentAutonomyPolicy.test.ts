// Feature: MockProvider (PDF §29), Property 2: deterministic responses with
// no network access; failure injection mirrors AIProviderError kinds.
import { describe, expect, it } from "vitest";

import { createMockProvider } from "../../../supabase/functions/_shared/ai/providers/mock-provider";
import { AIProviderError } from "../../../supabase/functions/_shared/ai/provider";

const request = {
  messages: [
    { role: "system" as const, content: "sys" },
    { role: "user" as const, content: "hello world" },
  ],
};

describe("createMockProvider", () => {
  it("returns a deterministic completion echoing the last user message", async () => {
    const provider = createMockProvider();
    const response = await provider.complete(request);
    expect(response.content).toContain("hello world");
    expect(response.model).toBe("mock-model");
    expect(response.finishReason).toBe("stop");
    expect(response.toolCalls).toEqual([]);
    expect(provider.name).toBe("mock");
  });

  it("records every call for assertions", async () => {
    const provider = createMockProvider();
    await provider.complete(request);
    await provider.complete(request);
    expect(provider.calls.length).toBe(2);
  });

  it("reports configured usage totals", async () => {
    const provider = createMockProvider({ usage: { inputTokens: 7, outputTokens: 3 } });
    const response = await provider.complete(request);
    expect(response.usage?.inputTokens).toBe(7);
    expect(response.usage?.outputTokens).toBe(3);
    expect(response.usage?.totalTokens).toBe(10);
    expect(response.usage?.estimatedCostUsd).toBe(0);
  });

  it("injects classified failures via AIProviderError", async () => {
    const provider = createMockProvider({ failureKind: "rate_limit" });
    await expect(provider.complete(request)).rejects.toThrow(AIProviderError);
    await expect(provider.complete(request)).rejects.toMatchObject({
      kind: "rate_limit",
    });
  });

  it("supports fixed content overrides", async () => {
    const provider = createMockProvider({ content: "fixed" });
    const response = await provider.complete(request);
    expect(response.content).toBe("fixed");
  });
});
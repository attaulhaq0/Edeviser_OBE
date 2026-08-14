import { afterEach, describe, expect, it, vi } from "vitest";

import { getAgenticConfig } from "../../../supabase/functions/_shared/ai/config";
import { AIProviderError } from "../../../supabase/functions/_shared/ai/provider";
import { createDeepSeekProvider } from "../../../supabase/functions/_shared/ai/providers/deepseek";

const envValues = new Map<string, string>([
  ["AI_FEATURE_ENABLED", "true"],
  ["AI_DAILY_BUDGET_USD", "10"],
  ["DEEPSEEK_API_KEY", "test-only-secret"],
]);
const env = { get: (name: string) => envValues.get(name) };

const success = (content = "ok") =>
  new Response(
    JSON.stringify({
      id: "completion-1",
      model: "deepseek-v4-flash",
      choices: [{ message: { content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

afterEach(() => {
  envValues.clear();
  envValues.set("AI_FEATURE_ENABLED", "true");
  envValues.set("AI_DAILY_BUDGET_USD", "10");
  envValues.set("DEEPSEEK_API_KEY", "test-only-secret");
  vi.useRealTimers();
});

describe("DeepSeek AIProvider", () => {
  it("normalizes requests and usage without exposing its secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(success());
    const provider = createDeepSeekProvider(getAgenticConfig(env), {
      env,
      fetch: fetchMock,
    });
    const result = await provider.complete({
      messages: [{ role: "user", content: "hello" }],
      maxOutputTokens: 999_999,
    });
    expect(result).toMatchObject({
      content: "ok",
      model: "deepseek-v4-flash",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "deepseek-v4-flash",
      max_tokens: 2048,
      thinking: { type: "disabled" },
    });
    expect(JSON.stringify(body)).not.toContain("test-only-secret");
  });

  it("uses standard-endpoint tool calling without beta-only strict mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(success());
    const provider = createDeepSeekProvider(getAgenticConfig(env), {
      env,
      fetch: fetchMock,
    });
    await provider.complete({
      messages: [{ role: "user", content: "use the tool" }],
      tools: [
        {
          name: "read_context",
          description: "Read authorized context",
          inputJsonSchema: {
            type: "object",
            additionalProperties: false,
            properties: {},
            required: [],
          },
        },
      ],
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      tools: Array<{ function: Record<string, unknown> }>;
    };
    expect(body.tools[0]?.function).not.toHaveProperty("strict");
  });

  it("fails safely when the server secret is absent", async () => {
    envValues.delete("DEEPSEEK_API_KEY");
    const fetchMock = vi.fn();
    const provider = createDeepSeekProvider(getAgenticConfig(env), {
      env,
      fetch: fetchMock,
    });
    await expect(
      provider.complete({ messages: [{ role: "user", content: "hello" }] })
    ).rejects.toMatchObject({ kind: "configuration" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([429, 500, 503])(
    "retries safe transient HTTP %s responses",
    async (status) => {
      envValues.set("AI_MAX_RETRIES", "1");
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("unavailable", { status }))
        .mockResolvedValueOnce(success());
      const provider = createDeepSeekProvider(getAgenticConfig(env), {
        env,
        fetch: fetchMock,
        sleep: vi.fn().mockResolvedValue(undefined),
      });
      await expect(
        provider.complete({ messages: [{ role: "user", content: "hello" }] })
      ).resolves.toMatchObject({ content: "ok" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  );

  it("classifies a malformed response", async () => {
    const provider = createDeepSeekProvider(getAgenticConfig(env), {
      env,
      fetch: vi
        .fn()
        .mockResolvedValue(new Response("not-json", { status: 200 })),
    });
    await expect(
      provider.complete({ messages: [{ role: "user", content: "hello" }] })
    ).rejects.toMatchObject({ kind: "malformed_response" });
  });

  it("converts request timeout to a typed safe error", async () => {
    vi.useFakeTimers();
    envValues.set("AI_REQUEST_TIMEOUT_MS", "1000");
    envValues.set("AI_MAX_RETRIES", "0");
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    const provider = createDeepSeekProvider(getAgenticConfig(env), {
      env,
      fetch: fetchMock as typeof fetch,
    });
    const pending = provider.complete({
      messages: [{ role: "user", content: "hello" }],
    });
    const captured = pending.catch((value: unknown) => value);
    await vi.advanceTimersByTimeAsync(1000);
    const error = await captured;
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: "timeout", retryable: true });
    expect(String(error)).not.toContain("test-only-secret");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDeepSeekProvider,
  DEEPSEEK_DEFAULT_BASE_URL,
  DEEPSEEK_DEFAULT_MODEL,
  getDeepSeekConfig,
  DeepSeekProviderError,
} from "../../../supabase/functions/_shared/ai/providers/deepseek";

const env = new Map<string, string>();

const installDenoEnv = () => {
  vi.stubGlobal("Deno", { env: { get: (name: string) => env.get(name) } });
};

const response = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("DeepSeek server provider", () => {
  beforeEach(() => {
    env.clear();
    env.set("DEEPSEEK_API_KEY", "test-only-key");
    installDenoEnv();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the safe production defaults", () => {
    const config = getDeepSeekConfig();
    expect(config.baseUrl).toBe(DEEPSEEK_DEFAULT_BASE_URL);
    expect(config.primaryModel).toBe(DEEPSEEK_DEFAULT_MODEL);
    expect(config.complexModel).toBe(DEEPSEEK_DEFAULT_MODEL);
  });

  it("fails safely when the server secret is missing", async () => {
    env.delete("DEEPSEEK_API_KEY");
    const provider = createDeepSeekProvider();

    await expect(
      provider.complete({ messages: [{ role: "user", content: "hello" }] })
    ).rejects.toMatchObject({ code: "missing_api_key" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends disabled thinking, bounded tokens, and normalizes success metadata", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      response({
        model: DEEPSEEK_DEFAULT_MODEL,
        choices: [{ message: { content: "hello" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
      })
    );
    const provider = createDeepSeekProvider();

    const result = await provider.complete({
      messages: [{ role: "user", content: "hello" }],
      maxOutputTokens: 99999,
    });

    expect(result).toMatchObject({
      content: "hello",
      model: DEEPSEEK_DEFAULT_MODEL,
      finishReason: "stop",
      usage: { promptTokens: 7, completionTokens: 3, totalTokens: 10 },
    });
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: DEEPSEEK_DEFAULT_MODEL,
      max_tokens: 512,
      thinking: { type: "disabled" },
    });
  });

  it("rejects legacy models and non-official base URLs", () => {
    env.set("DEEPSEEK_PRIMARY_MODEL", "deepseek-chat");
    expect(() => getDeepSeekConfig()).toThrow(DeepSeekProviderError);
    env.delete("DEEPSEEK_PRIMARY_MODEL");
    env.set("DEEPSEEK_BASE_URL", "https://example.test");
    expect(() => getDeepSeekConfig()).toThrow(DeepSeekProviderError);
  });

  it("normalizes API failures without exposing the secret", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ error: { message: env.get("DEEPSEEK_API_KEY") } }, { status: 400 }));
    const provider = createDeepSeekProvider();

    const error = await provider.complete({ messages: [{ role: "user", content: "hello" }] }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(DeepSeekProviderError);
    expect(String(error)).not.toContain("test-only-key");
    expect((error as DeepSeekProviderError).code).toBe("http");
  });

  it("converts request aborts into a safe timeout error", async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException("aborted", "AbortError"));
    env.set("DEEPSEEK_MAX_RETRIES", "1");
    const provider = createDeepSeekProvider();

    await expect(
      provider.complete({ messages: [{ role: "user", content: "hello" }] })
    ).rejects.toMatchObject({ code: "timeout" });
  });
});

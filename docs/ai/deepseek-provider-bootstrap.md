# DeepSeek provider bootstrap

This document records the provider boundary prepared for the next agentic
phase. It is not a product migration plan.

## Configuration

- Secret: `DEEPSEEK_API_KEY`, stored in Supabase Project Secrets.
- Provider: `deepseek`.
- Base URL: `https://api.deepseek.com`.
- Primary and complex model: `deepseek-v4-flash`.
- Ordinary requests send `thinking: { type: "disabled" }`.
- The provider bounds output tokens, timeout, retries, backoff, and concurrent
  requests. It does not enable complexity routing or automatic max reasoning.

The key is read only by the Edge runtime with `Deno.env.get("DEEPSEEK_API_KEY")`.
It is never accepted from a caller, returned in a response, or included in an
error message. The provider rejects legacy model names and non-official base
URLs.

## Existing generation call sites for the next phase

These remain unchanged by this bootstrap:

| Function | Current provider/call | Migration note |
| --- | --- | --- |
| `supabase/functions/chat-with-tutor/index.ts` | Gemini `generateContent` with SSE | Preserve tutor/RAG/auth behavior when migrated. |
| `supabase/functions/coordinator-ai-insights/index.ts` | Gemini `generateContent` | Preserve strict JSON parsing and rule-based fallback. |
| `supabase/functions/generate-plan-update/index.ts` | OpenRouter `/api/v1/chat/completions` | Preserve JSON parsing and fallback. |
| `supabase/functions/generate-quiz-questions/index.ts` | OpenRouter `/api/v1/chat/completions` | Preserve structured quiz response handling. |

Embeddings remain a separate OpenAI/OpenRouter-compatible concern and are not
part of this provider bootstrap.

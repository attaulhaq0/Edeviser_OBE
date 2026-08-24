# CLAUDE.md

Follow the root [`AGENTS.md`](./AGENTS.md) — it is the canonical instruction file for all
AI agents on this repo (Kiro, Codex, Jules, Cline, Claude Code). Domain conventions also
live in `.kiro/steering/`; subsystem rules in `src/AGENTS.md` and `supabase/AGENTS.md`.

Non-negotiable guards:

- Never edit `supabase/migrations/`, `src/types/database.ts`, `.env.local`, `.kiro/`.
- Before finishing any task run the verification gates from AGENTS.md
  (`npm run lint`, `npx tsc --noEmit`, `npm test` at minimum).
- Live Supabase project ref: `cdlgtbvxlxjpcddjazzx` — verify DB/runtime claims via MCP
  introspection, never from local files alone.
- AI provider policy: DeepSeek only (`AI_PROVIDER=deepseek`), server-side secrets only.

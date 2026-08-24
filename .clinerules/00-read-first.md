# READ THIS FIRST (Cline)

All Edeviser coding rules live in the root [`AGENTS.md`](../AGENTS.md) — that file is the
single source of truth shared by every AI tool (Kiro, Codex, Jules, Claude Code, Cline).
The numbered files in this folder (01–08) are mirrored extracts kept for backwards
compatibility; where they disagree with `AGENTS.md` or `.kiro/steering/`, the canonical
sources win. Do NOT add new rules here — extend `AGENTS.md` instead.

Hard guards regardless of anything else: never modify `supabase/migrations/`,
`src/types/database.ts`, `.env.local`, or `.kiro/`.

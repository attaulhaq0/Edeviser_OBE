---
inclusion: always
---

# Database Types Regeneration

`src/types/database.ts` is auto-generated from the Supabase schema. **Never edit it by hand and never let any tool overwrite it via stdout redirection.**

## Always use the script

Windows (PowerShell):

```powershell
pwsh scripts/regen-types.ps1
```

macOS / Linux / Git Bash:

```bash
bash scripts/regen-types.sh
```

The script protects against the failure modes that have repeatedly corrupted this file on Windows:

- checks Supabase CLI auth before generating (no silent failure)
- writes to OS temp, validates the output contains `export type Database`, then atomic-moves to the destination
- retries with exponential backoff if the destination is locked by tsserver
- refuses to install output that does not look like Supabase types

## Forbidden commands

These all produce a corrupted `database.ts` under common Windows conditions and must never be used:

```bash
# WRONG: > redirection captures npx preamble ("Need to install...") inside the file
npx supabase gen types --lang=typescript --project-id <id> > src/types/database.ts

# WRONG: any direct write while Kiro / tsserver holds the file open will truncate it
echo "..." > src/types/database.ts
```

## Prerequisites

The Supabase CLI must be authenticated once per machine:

```powershell
npx supabase login                                  # interactive (opens browser)
# OR
$env:SUPABASE_ACCESS_TOKEN = "sb_pat_..."           # PAT, recommended for scripts
```

Generate a Personal Access Token at <https://supabase.com/dashboard/account/tokens>.

## When the file looks corrupted

Symptoms: file size under ~1 KB, missing `export type Database`, contains npx or supabase CLI error text.

Recovery (Windows):

1. Save your Kiro work and quit every Kiro window (releases the tsserver file lock).
2. Wait ~10 seconds. Confirm with `tasklist | findstr /I Kiro.exe` (should print nothing).
3. Restore from git: `git checkout HEAD -- src/types/database.ts`.
4. Run `pwsh scripts/regen-types.ps1` to fetch a fresh schema.

## Why this rule exists

Several factors compound on Windows when this file is overwritten without the script:

- every open Kiro window spawns a TypeScript Server that holds `database.ts` open during analysis
- Windows file locking blocks concurrent writes (EBUSY)
- a failed mid-write leaves the file truncated to whatever was written before the lock kicked in
- direct `>` redirection lets stdout noise (npx prompts, CLI errors) leak into the file
- if the Supabase CLI is not authenticated, `gen types` produces no output and the redirect leaves the destination empty

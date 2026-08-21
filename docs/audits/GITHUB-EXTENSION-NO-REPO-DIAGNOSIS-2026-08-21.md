# Diagnosis: "No repository found" in Kiro's GitHub Extension — 2026-08-21

> Read-only investigation. Nothing was changed on your machine or repo.
> Separate from the main audit file (`PROJECT-HEALTH-AUDIT-2026-08-21.md`).

---

## TL;DR

**Your repository is fine.** Git works, the remote is correct, and the `gh` CLI is authenticated.

## 🔴 ROOT CAUSE (confirmed by deep inspection of Kiro's storage)

**The GitHub Pull Requests extension in Kiro has no valid, initialized session in your current
Kiro installation.** It is running on a stale, orphaned login from months ago. Evidence:

1. **Stale encrypted secret exists** — Kiro's global state DB (`state.vscdb`) contains a
   `vscode.github-authentication` secret (`github.auth`), but it is an OS-encrypted blob
   (Chromium `v10` safeStorage format) left over from an earlier session/install. If Kiro's
   encryption key changed (update/migration), this secret can no longer be decrypted — the
   extension silently gets "no session".
2. **The extension's own global state DB is MISSING** —
   `globalStorage\github.vscode-pull-request-github\` contains only old cached folders
   (`assignableUsers` from Feb 2026, `mentionableUsers` from Apr 2026, `userIcons` from May 2026)
   but **no `state.vscdb`**. A healthy install writes this file. The extension never completed
   initialization in the current Kiro install — it's running on leftovers.
3. **No per-workspace state for this project** —
   `workspaceStorage\8f95b7d9...\` (which maps to `f:\Edeviser-Kiro`) contains folders only for
   CodeRabbit and the JS debugger — **nothing for the GitHub PR extension**. The extension never
   resolved this workspace to a repository.
4. Meanwhile the repo side is perfect: valid git repo, correct remote
   (`origin → attaulhaq0/Edeviser_OBE.git`), `gh` CLI authenticated with `repo` scope.

**In one sentence:** the extension can't find the repo because it has no working GitHub session
in this Kiro install — its login state is a stale encrypted leftover, and it never initialized
for this workspace. The GitHub website works because that's your browser session, which is
unrelated.

---

## What I checked (all passed ✅)

| Check | Result |
|---|---|
| Is this folder a valid git repo? | ✅ Yes — branch `feat/proactive-agentic-intelligence` |
| Does it track a GitHub remote? | ✅ Yes — `origin → https://github.com/attaulhaq0/Edeviser_OBE.git` |
| Is the remote reachable / does the repo exist? | ✅ Yes — 2,671 workflow runs visible via API; website works |
| Is the `gh` CLI authenticated? | ✅ Yes — account `attaulhaq0`, scopes include `repo`, `workflow` |
| Repo has recent activity? | ✅ PRs #268–270 merged Aug 18–19 |

So: repo exists, remote matches, credentials exist. The failure is inside the extension layer.

---

## Why the extension says "no repository found"

The GitHub Pull Requests & Issues extension (the one built into VS Code/Kiro) needs **three**
things to line up. You're missing #1:

1. **A GitHub sign-in *inside Kiro*** — click the Accounts icon (person silhouette, bottom-left
   of the Kiro window). If it says "Sign in to use GitHub Pull Requests..." or shows no GitHub
   account, the extension cannot associate your local repo with any GitHub account → it reports
   "no repository found". This login is **completely separate** from:
   - your browser login (why the website works), and
   - your `gh` CLI login (why terminal git/gh commands work).

2. **The signed-in account must match the repo owner** — the repo belongs to `attaulhaq0`.
   If Kiro is signed in with a different GitHub account (old/personal one), it won't show this repo.

3. **The opened workspace folder must be the git root** — yours is (`f:\Edeviser-Kiro` = repo root),
   so this is fine.

### Other possible (less likely) causes
- **Expired token**: Kiro's stored GitHub token expired; re-signing in fixes it.
- **Extension still initializing**: on very large repos (yours has ~200 hooks, big prototype dir)
  the panel can take a minute before repos appear.
- **Corporate proxy/firewall** blocking `api.github.com` from the desktop app while the browser
  uses a different network path.
- **Multiple workspace folders**: if you opened a parent folder or multi-root workspace, the
  extension may look in the wrong place.

---

## How to Fix (in order — stop when it works)

### Fix 1: Sign in to GitHub inside Kiro (most likely fix)
1. Open Kiro.
2. Click the **Accounts icon** (person silhouette) in the bottom-left status bar.
3. If you see "attaulhaq0" under GitHub → sign out, then sign back in (refreshes the token).
4. If no GitHub account is listed → click "Turn on Settings Sync"/"Sign in" and choose **GitHub**,
   complete the browser device-code flow.
5. Reload the window: `Ctrl+Shift+P` → **"Developer: Reload Window"**.
6. Open the GitHub icon in the Activity Bar (left side) — the repo should appear.

### Fix 2: Verify the right account
In the Accounts menu, confirm the GitHub entry says **attaulhaq0**. If it's another account,
sign out and sign in with attaulhaq0.

### Fix 3: Check the extension output for the real error
1. `Ctrl+Shift+P` → **"Output: Show Output Channel"** → pick **"GitHub Pull Request"** (or "GitHub Authentication").
2. Look for lines like `token expired`, `401`, `Bad credentials`, or `not found` — they tell you
   exactly which of the causes above applies.

### Fix 4: Clear stale auth state (if Fix 1 doesn't stick)
1. Close Kiro completely.
2. Delete the cached auth session folder:
   `C:\Users\hp\AppData\Roaming\Kiro\User\globalStorage\vscode.github-authentication\`
3. Reopen Kiro and sign in again (Fix 1 step 3–4).

### Fix 5: Make sure only the repo root is open
Open the folder directly: **File → Open Folder → `f:\Edeviser-Kiro`** (not a parent directory,
not a multi-root workspace).

### Fix 6: Update/reinstall the extension
If the GitHub Pull Requests extension is bundled/outdated in your Kiro version, update Kiro or
reinstall the extension from the Extensions panel.

---

## UPDATE (same day, after GitHub sign-in)

Sign-in alone did not fix it — the extension then said **"open a folder that contains a
GitHub repository"**, which means Kiro's built-in **git extension** was not detecting the
repo at all (the PR extension depends on it). Deep checks showed:

- `.git\` exists at `F:\Edeviser-Kiro` ✅
- `git rev-parse --show-toplevel` → `F:/Edeviser-Kiro` ✅ (git 2.55.0 works from terminal)
- No `git.path` / `git.enabled` overrides in settings ✅
- `git.exe` confirmed at `C:\Program Files\Git\cmd\git.exe` ✅

**Most likely cause:** the Kiro process resolved a different PATH than the terminal and
could not locate `git.exe`, so its git extension found zero repositories.

**Fix applied:** added to `C:\Users\hp\AppData\Roaming\Kiro\User\settings.json`:
```json
"git.path": "C:\\Program Files\\Git\\cmd\\git.exe"
```
Then: reload window → Source Control (`Ctrl+Shift+G`) should show the repo's changes,
and the GitHub panel should resolve the repository.

**If STILL failing after reload:** the decisive test is whether **Source Control
(`Ctrl+Shift+G`) shows your changed files**:
- SCM shows changes → git detection works; the problem is inside the PR extension →
  reinstall it from the Extensions panel.
- SCM is empty too → Kiro's git extension itself is broken/disabled → re-enable it via
  `Ctrl+Shift+P` → "Extensions: Show Built-in Extensions" → Git → Enable, then reload.

---

## FINAL ROOT CAUSE (confirmed via extension logs) — 2026-08-21

Reading `Kiro\logs\...\exthost\GitHub.vscode-pull-request-github\GitHub Pull Request.log`
revealed the true blocker:

**16 stale git worktrees from AI coding sessions (Claude Code / Codex agents) were
registered against this repository**, and the GitHub PR extension opens EVERY repository
the git API reports:

- 14 worktrees in `C:\tmp\edeviser-*` (agent sessions: auth, CQI, RAG, prototype archive…)
- Worktrees inside `F:\Edeviser-Kiro\.claude\worktrees\` (e.g. `friendly-meninsky-95c00e`
  on branch `fix/vite-console-strip` → PR #130, already MERGED)
- The log showed the extension churning through all of them ("Repository … has been opened",
  "No remotes found", "ignoring"), plus a corrupted remote probe (`https://origi/n`)

With that many ghost repositories, the extension's active-repo resolution kept landing on
worktrees without valid GitHub remote context → the panel showed "open a folder that
contains a GitHub repository" even though the main repo was perfectly configured.

**Fix applied (all verified):**
1. Removed all 15 stale worktrees (`git worktree remove --force` + `git worktree prune`)
   — each was checked first; only disposable AI-session files were present.
2. Deleted leftover folders `.claude\worktrees\` and `C:\tmp\edeviser-*` (~1.2 GB freed).
3. Disabled the stray Vercel MCP server in `runtime-governance-scratch\.kiro\settings\mcp.json`
   (source of the "add your Vercel token" popup), alongside the third-party
   `weiskopfsodefa.vercel-vscode-by-sodefa` extension also installed in Kiro.
4. Earlier: added `"git.path"` to Kiro user settings and completed GitHub sign-in.

`git worktree list` now shows ONLY `F:/Edeviser-Kiro`. Reload the Kiro window and the
GitHub panel should resolve the repository and show open PRs.

---

## FINAL UPDATE — Vercel popup eliminated

The popup text `Please set your Vercel Access Token in the extension settings
vercelVSCode.accessToken` came from the third-party extension
**weiskopfsodefa.vercel-vscode-by-sodefa** (not an official Vercel product).
Its folder was removed from `C:\Users\hp\.kiro\extensions\` — takes effect after a full
Kiro restart (close all Kiro windows and reopen; a simple Reload Window may not be enough
because the extension stays loaded in memory).

After restart, both issues should be resolved:
1. No more Vercel token popup
2. GitHub Actions / Pull Requests panels detect the repository (fresh GitHub session +
   explicit `git.path` + zero stale worktrees)

---

## Quick sanity test after fixing

After signing in, run in Kiro's command palette:
- `GitHub Pull Requests: Sign Out` then `GitHub Pull Requests: Sign In`
- The source-control badge should show your branch `feat/proactive-agentic-intelligence`
  and the GitHub panel should list open PRs (#270 etc.).

---

## Note: unrelated finding spotted during diagnosis

Your working tree is on branch `feat/proactive-agentic-intelligence`, which is **12 commits behind
origin**, with ~60 modified files and ~100 untracked files (including new migrations and edge
functions). That's normal WIP, but worth knowing: if the extension issue persists, it is NOT
caused by this — the repo detection happens before any branch comparison.
# Developer Guide: PR Conflicts, CI Failures & Debugging

> A beginner-friendly guide written specifically for the Edeviser codebase.
> If you're tired of seeing "merge conflicts" and red CI checks, this is for you.

---

## Table of Contents

1. [What Are PR Conflicts?](#1-what-are-pr-conflicts)
2. [Why Do YOUR PRs Keep Conflicting?](#2-why-do-your-prs-keep-conflicting)
3. [How We Fix Them — Step by Step](#3-how-we-fix-them--step-by-step)
4. [Preventing Conflicts in the Future](#4-preventing-conflicts-in-the-future)
5. [Why Do CI Workflows Fail?](#5-why-do-ci-workflows-fail--a-study-section)
6. [What Is the "Run and Debug" Extension?](#6-what-is-the-run-and-debug-extension)

---

## 1. What Are PR Conflicts?

### The Simple Explanation

Imagine you and a friend are both editing the same Google Doc at the same time, but offline. You change paragraph 3, your friend also changes paragraph 3. When you both try to save — Google doesn't know which version to keep. That's a **merge conflict**.

In Git terms:

- You create a **branch** (a copy of the code) to work on a feature.
- While you're working, someone else merges _their_ changes into `main`.
- Now your branch and `main` have **different versions of the same file**.
- When you try to merge your branch back into `main`, Git says: _"I don't know which version is correct. You decide."_

### What a Conflict Looks Like

When Git finds a conflict, it marks the file like this:

```
<<<<<<< HEAD (your branch)
const greeting = "Hello World";
=======
const greeting = "Hi there";
>>>>>>> main
```

- The top section (`HEAD`) = what YOUR branch has.
- The bottom section (`main`) = what the other person changed.
- You must pick one, combine them, or rewrite it — then remove the `<<<<`, `====`, `>>>>` markers.

---

## 2. Why Do YOUR PRs Keep Conflicting?

Looking at the Edeviser git history, there's a very clear pattern. Here's what's happening:

### Problem 1: Many Long-Lived Feature Branches Running in Parallel

Your repo has branches like:

| Branch                                 | What it does                                        |
| -------------------------------------- | --------------------------------------------------- |
| `feat/platform-tasks-27-33`            | Platform features (CLO progress, XP, notifications) |
| `feat/platform-tasks-33-37`            | More platform features (AI, profiles)               |
| `feat/adaptive-quiz-generation`        | Quiz engine                                         |
| `feat/adaptive-quiz-hooks-pages-tests` | Quiz UI + tests                                     |
| `feat/journal-learning-path`           | Journal + learning path                             |
| `feat/student-onboarding-profiling`    | Onboarding wizard                                   |
| `feat/habit-heatmap`                   | Habit tracking                                      |

All of these branches touch **shared files** like:

- `src/types/database.ts` — every feature that adds a DB table changes this file
- `.kiro/specs/*/tasks.md` — spec task files get updated by multiple features
- `src/router/AppRouter.tsx` — every new page adds routes here
- `src/lib/queryKeys.ts` — every new hook adds query keys here
- `package.json` / `package-lock.json` — dependency changes

When Branch A merges into `main`, every other branch that touches the same files is now **out of date** and will conflict.

### Problem 2: The "Cascading Conflict" Chain

Your git log tells the story:

```
chore: merge main into feat/platform-tasks-27-33 to resolve database.ts conflicts
chore: merge main into feat/platform-tasks-33-37 to resolve database.ts conflicts
chore: merge main into feat/adaptive-quiz-hooks-pages-tests to resolve database.ts conflicts
chore: merge main into feat/journal-learning-path to resolve tasks.md conflict
chore: merge main into feat/platform-tasks-33-37 to resolve cascading conflicts
chore: merge main into feat/adaptive-quiz-hooks-pages-tests to resolve cascading conflicts
```

This is a **domino effect**:

1. PR #17 (adaptive-quiz) merges into `main` → changes `database.ts`
2. Now PR #18 (journal) conflicts → you merge main into it, fix conflicts, merge PR #18
3. Now PR #19 (tasks-27-33) conflicts → you merge main into it, fix conflicts, merge PR #19
4. Now PR #20 (tasks-33-37) conflicts → same thing
5. Now PR #21 (quiz-hooks) conflicts → same thing

Each merge creates MORE changes in `main`, which causes MORE conflicts in the remaining branches. It snowballs.

### Problem 3: The `database.ts` File

This file (`src/types/database.ts`) is auto-generated from your Supabase schema. Every feature that adds tables, columns, or RLS policies regenerates this file. Since it's one giant file that changes completely each time, it's a conflict magnet.

### Visual Summary

```
Time →

main:     ──A──────B──────C──────D──────E──
              \      ↑ conflict!  ↑ conflict!
branch-1:     └──x──x──┐
                        merge
              \              ↑ conflict!
branch-2:     └──y──y──y──y──┐
                              merge
              \                    ↑ conflict!
branch-3:     └──z──z──z──z──z──z──┐
                                    merge

Each merge into main makes the NEXT branch conflict worse.
```

---

## 3. How We Fix Them — Step by Step

### Method 1: Merge Main Into Your Branch (What You've Been Doing)

This is the simplest approach. You pull the latest `main` into your feature branch.

**Step-by-step:**

```bash
# 1. Make sure you're on your feature branch
git checkout feat/my-feature

# 2. Fetch the latest changes from GitHub
git fetch origin

# 3. Merge main into your branch
git merge origin/main
```

If there are conflicts, Git will tell you which files:

```
Auto-merging src/types/database.ts
CONFLICT (content): Merge conflict in src/types/database.ts
Automatic merge failed; fix conflicts and then commit the result.
```

**Now fix them:**

```bash
# 4. Open the conflicted files in your editor (Kiro/VS Code highlights them)
#    Look for <<<<<<< / ======= / >>>>>>> markers
#    Choose the correct version or combine both

# 5. For database.ts specifically — just regenerate it:
npx supabase gen types --linked > src/types/database.ts

# 6. Mark files as resolved
git add src/types/database.ts
git add <any-other-fixed-files>

# 7. Complete the merge
git commit -m "chore: merge main into feat/my-feature to resolve conflicts"

# 8. Push
git push
```

### Method 2: Rebase (Cleaner History, But Harder)

Rebasing replays your commits on top of the latest `main`, as if you started your branch today.

```bash
# 1. Fetch latest
git fetch origin

# 2. Rebase onto main
git rebase origin/main

# 3. If conflicts appear, fix them, then:
git add <fixed-files>
git rebase --continue

# 4. Repeat step 3 for each conflicting commit

# 5. Force push (because you rewrote history)
git push --force-with-lease
```

**When to use rebase vs merge:**

- Use **merge** if your PR is already open and others might be looking at it
- Use **rebase** if your branch is local/personal and you want a clean history
- When in doubt, use **merge** — it's safer

### Method 3: For `database.ts` Specifically

Since this file is auto-generated, never manually resolve conflicts in it. Instead:

```bash
# After merging main into your branch:
# Just regenerate the file from your Supabase project
npx supabase gen types --linked > src/types/database.ts
git add src/types/database.ts
```

This gives you the correct, up-to-date version every time.

---

## 4. Preventing Conflicts in the Future

### Strategy 1: Keep Branches Short-Lived

The #1 cause of your conflicts is branches that live for days/weeks while other branches merge.

| Instead of...                                   | Do this...                                                   |
| ----------------------------------------------- | ------------------------------------------------------------ |
| One branch with 15 commits touching 30 files    | 3 smaller branches, each touching 10 files                   |
| `feat/platform-tasks-27-33` (7 tasks in one PR) | `feat/task-27-clo-progress`, `feat/task-28-xp-history`, etc. |

Smaller PRs = fewer files changed = fewer conflicts = faster reviews.

### Strategy 2: Merge in Order of Dependencies

If Branch B depends on files that Branch A changes, merge A first, then update B.

For Edeviser, a good merge order would be:

1. Database/schema changes first (they affect `database.ts`)
2. Library/utility changes next (`src/lib/`)
3. Hooks next (`src/hooks/`)
4. Pages/components last (`src/pages/`, `src/components/`)

### Strategy 3: Sync With Main Daily

Don't wait until your PR is ready to discover conflicts. Sync every day:

```bash
# Every morning before you start coding:
git fetch origin
git merge origin/main
# Fix any small conflicts now while they're small
```

### Strategy 4: Use `.gitattributes` for Auto-Generated Files

Add this to your `.gitattributes` file:

```
src/types/database.ts merge=ours
```

This tells Git: "For this file, always keep our version during merges" — then you regenerate it after.

### Strategy 5: Avoid Editing the Same Shared Files

If two features both need to add routes to `AppRouter.tsx`, coordinate:

- Feature A adds its routes and merges first
- Feature B pulls main, then adds its routes

---

## 5. Why Do CI Workflows Fail? (A Study Section)

### What Is CI?

CI stands for **Continuous Integration**. It's an automated system that runs checks on your code every time you push or open a PR. Think of it as a robot code reviewer that checks for basic mistakes before a human looks at your code.

Your Edeviser CI (defined in `.github/workflows/ci.yml`) runs 4 jobs:

```
┌─────────┐   ┌────────────┐   ┌──────────┐
│  Lint   │   │ Type Check │   │   Test   │
│ (ESLint)│   │   (tsc)    │   │ (Vitest) │
└────┬────┘   └─────┬──────┘   └────┬─────┘
     │              │               │
     └──────────────┼───────────────┘
                    │
              ┌─────▼─────┐
              │   Build   │
              │(vite build)│
              └───────────┘

Build only runs if ALL THREE above pass.
```

### Why Each Job Fails

#### Job 1: Lint (`npm run lint`)

**What it does:** Runs ESLint to check code style and catch common mistakes.

**Why it fails:**

- Unused imports or variables
- Missing return types on functions
- Using `any` type (your config likely bans this)
- Inconsistent formatting

**Your config uses `--max-warnings 0`**, which means even a single warning fails the build. This is strict but good — it keeps the codebase clean.

**How to fix locally:**

```bash
# See all lint errors
npm run lint

# Many can be auto-fixed
npx eslint . --fix
```

#### Job 2: Type Check (`npx tsc --noEmit`)

**What it does:** Runs the TypeScript compiler to check all types are correct, without actually building anything.

**Why it fails:**

- A function expects `string` but you passed `number`
- A property doesn't exist on a type (common after `database.ts` changes)
- Missing imports
- Incompatible type assignments

**Common Edeviser scenario:** You add a new column to a Supabase table but forget to regenerate `database.ts`. Now your code references a column that TypeScript doesn't know about.

**How to fix locally:**

```bash
npx tsc --noEmit
# Read the errors — they tell you exactly which file and line
```

#### Job 3: Test (`npm test` → `vitest --run`)

**What it does:** Runs all your Vitest tests (unit tests + property-based tests).

**Why it fails:**

- A test assertion is wrong (expected X, got Y)
- A component changed but the test wasn't updated
- A mock is outdated (the function signature changed)
- Property-based tests found an edge case (fast-check generates random inputs)
- Environment variables missing (the CI uses placeholder Supabase keys)

**Your CI sets fallback env vars:**

```yaml
VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL || 'http://localhost:54321' }}
VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key' }}
```

If your tests actually try to call Supabase (instead of mocking), they'll fail in CI because there's no real Supabase instance running.

**How to fix locally:**

```bash
npm test
# Or run a specific test file:
npx vitest --run src/__tests__/unit/myTest.test.ts
```

#### Job 4: Build (`tsc -b && vite build`)

**What it does:** Compiles TypeScript and bundles the app with Vite. This only runs if lint, typecheck, and tests all pass.

**Why it fails:**

- Usually the same reasons as typecheck (since `tsc -b` runs first)
- Import errors that only show up during bundling
- Missing environment variables at build time

### Is It GOOD That CI Fails?

**Yes. CI failures are a feature, not a bug.**

Here's why:

| Without CI                          | With CI                              |
| ----------------------------------- | ------------------------------------ |
| Broken code gets merged into `main` | Broken code is caught BEFORE merging |
| You discover bugs in production     | You discover bugs in your PR         |
| Other developers pull broken code   | `main` stays clean and working       |
| "It works on my machine" problems   | Same checks run on every machine     |

Think of CI as a safety net. Every failure it catches is a bug that **didn't** reach your users.

### Is There a Permanent Fix?

There's no way to make CI "never fail" — and you wouldn't want that. But you can make it fail **less often**:

**Run checks locally before pushing:**

```bash
# Run all three checks locally (same as CI)
npm run lint && npx tsc --noEmit && npm test
```

**Create a pre-push hook** (runs automatically before every `git push`):

```bash
# In your terminal:
echo 'npm run lint && npx tsc --noEmit && npm test' > .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

Now if any check fails locally, the push is blocked — saving you a round-trip to CI.

**Quick reference for common CI fixes:**

| CI Error                      | Local Fix                                                                 |
| ----------------------------- | ------------------------------------------------------------------------- |
| Lint: unused import           | Remove the import or add `// eslint-disable-next-line` with justification |
| Type: property does not exist | Regenerate `database.ts` or fix the type                                  |
| Test: expected X received Y   | Update the test or fix the code                                           |
| Build: module not found       | Check your import paths use `@/` alias                                    |

---

## 6. What Is the "Run and Debug" Extension?

### What It Is

"Run and Debug" is a built-in feature in VS Code (and Kiro, which is built on VS Code). It lets you:

- Run your code with a **debugger** attached
- Set **breakpoints** (pause execution at a specific line)
- Inspect **variables** while the code is paused
- Step through code **line by line**

It's configured via `.vscode/launch.json` in your project.

### Your Current Configuration

Your `launch.json` looks like this:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${file}"
    }
  ]
}
```

### Why It's Failing

This configuration has a problem for your project. Here's why:

**Problem: It tries to run the current file directly with Node.js.**

`"program": "${file}"` means "run whatever file I have open." But Edeviser is a **React + Vite + TypeScript** project. You can't just run a `.tsx` file with Node.js because:

1. Node.js doesn't understand JSX/TSX syntax
2. Node.js doesn't understand TypeScript without a compiler
3. Node.js doesn't understand import aliases like `@/components/...`
4. React components need a browser, not Node.js

So when you press the green "Play" button with a `.tsx` file open, Node.js tries to execute it directly and crashes.

### What You Should Use Instead

For a Vite + React project, you have two better options:

**Option A: Debug in the Browser (Recommended for UI work)**

Replace your `launch.json` with:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    }
  ]
}
```

How to use:

1. Start your dev server in a terminal: `npm run dev`
2. Press F5 (or the green Play button) — Chrome opens with debugger attached
3. Set breakpoints in your `.tsx` files — they'll pause in the browser

**Option B: Debug Tests (Recommended for test files)**

Add this configuration for debugging Vitest tests:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["--run", "${relativeFile}"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

How to use:

1. Open a test file (e.g., `src/__tests__/unit/myTest.test.ts`)
2. Select "Debug Current Test" from the dropdown
3. Press F5 — the test runs with debugger attached
4. Set breakpoints in the test file or the source code it tests

### Quick Reference

| I want to...                | Use this                                       |
| --------------------------- | ---------------------------------------------- |
| See my app in the browser   | `npm run dev` (no debugger needed)             |
| Debug a React component     | "Debug in Chrome" config + breakpoints         |
| Debug a test                | "Debug Current Test" config                    |
| Debug a plain `.ts` utility | "Debug Current Test" with a test that calls it |

---

## Quick Cheat Sheet

```
CONFLICTS:
  git fetch origin && git merge origin/main    ← sync your branch
  Fix markers (<<<< ==== >>>>)                 ← resolve conflicts
  git add . && git commit                      ← complete merge

CI FAILURES:
  npm run lint                                 ← check lint locally
  npx tsc --noEmit                             ← check types locally
  npm test                                     ← run tests locally

DEBUGGING:
  npm run dev                                  ← start dev server
  F5 with "Debug in Chrome"                    ← debug in browser
  F5 with "Debug Current Test"                 ← debug a test file
```

---

_Generated for the Edeviser project. Last updated: March 2026._

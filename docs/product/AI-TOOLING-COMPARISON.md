---
pdf_options:
  format: A4
  margin: 25mm 20mm
---

<style>
h2, h3, h4 { page-break-after: avoid; }
table { page-break-inside: avoid; }
tr { page-break-inside: avoid; }
p { page-break-inside: avoid; }
h2 + *, h3 + *, h4 + * { page-break-before: avoid; }
</style>

# Edeviser AI Tooling Stack — CodeRabbit vs Google Jules vs GitHub Copilot

## How Each Tool Serves Our Codebase & Why We Need All Three

**Version:** 1.0 | **Date:** April 2026 | **Purpose:** Internal team reference

---

## 1. THE THREE TOOLS AT A GLANCE

|                  | CodeRabbit                   | Google Jules                       | GitHub Copilot               |
| ---------------- | ---------------------------- | ---------------------------------- | ---------------------------- |
| **Role**         | PR Reviewer                  | Async Coding Agent                 | Real-time Pair Programmer    |
| **Analogy**      | Senior dev reviewing your PR | Junior dev working overnight       | Co-pilot sitting next to you |
| **Trigger**      | Automatically on every PR    | You assign tasks or it suggests    | As you type in your editor   |
| **Output**       | Comments on your PR          | Creates branches and PRs with code | Inline code suggestions      |
| **Writes code?** | No — only reviews            | Yes — full implementations         | Yes — autocomplete and chat  |
| **Cost**         | $19/seat/month               | Free tier (100 sessions/day)       | $21/user/month (Enterprise)  |
| **Our cost**     | $19/month                    | $0 (free tier)                     | $42/month (2 users)          |

---

## 2. CODERABBIT — The Reviewer ($19/month)

### What It Does to Our Codebase

CodeRabbit automatically reviews every pull request. When anyone (human, Jules, or Claude Code) opens a PR, CodeRabbit reads the diff and posts comments identifying issues before the code reaches main.

### How It Helps Edeviser Specifically

- Catches `any` types that slip through (our strict TypeScript rule)
- Flags physical CSS classes (`ml-*`, `mr-*`) that should be logical (`ms-*`, `me-*`) for RTL
- Identifies missing error handling in Supabase queries (checks for `if (error) throw error` pattern)
- Spots unused imports and dead code
- Flags security issues (hardcoded keys, missing input validation)
- Checks for missing Zod validation on form inputs
- Reviews RLS policy implications when database-related code changes

### What It Does NOT Do

- Does not write code or create PRs
- Does not fix the issues it finds — only reports them
- Does not run tests or check if the build passes
- Cannot understand Supabase Edge Functions (Deno runtime is niche)

### When It Runs

Every PR, automatically. No manual trigger needed. Reviews appear as GitHub comments within 2-3 minutes of PR creation.

### Configuration for Edeviser

We have a `.coderabbit.yaml` in the repo root that tells CodeRabbit our conventions (TypeScript strict, Shadcn/ui components, logical CSS properties, Supabase patterns).

---

## 3. GOOGLE JULES — The Async Agent (Free)

### What It Does to Our Codebase

Jules clones the repo into a sandboxed VM, makes code changes, runs tests, and creates PRs. It works asynchronously — you assign a task, walk away, and come back to a PR.

### How It Helps Edeviser Specifically

- Fixes TypeScript errors flagged by CI (CI Fixer beta)
- Writes missing unit tests for existing utilities in `src/lib/`
- Updates imports after file restructuring
- Converts remaining hardcoded English strings to i18n `t()` calls
- Dependency version bumps with test verification
- Proactive suggestions: scans the codebase and suggests performance, design, and security improvements
- Scheduled agents run periodically to find issues you haven't noticed

### What It Does NOT Do

- Cannot access Supabase directly (no database credentials in its environment)
- Cannot deploy Edge Functions
- Cannot run the dev server or test against live APIs
- Should not modify `supabase/migrations/` or `.kiro/` directories
- Not reliable for complex multi-file features that need deep OBE domain knowledge

### When It Runs

- On-demand: You type a task in the Jules chat or assign a GitHub issue
- Scheduled: Performance, Design, and Security agents scan periodically
- CI Fixer: Automatically when CI fails on Jules-created PRs

### Configuration for Edeviser

- Environment setup: `npm ci` (installs dependencies)
- Knowledge memories: Project context, CI checks, do-not-modify files
- `AGENTS.md` in repo root provides project conventions
- Suggestions and all 3 scheduled agents enabled

---

## 4. GITHUB COPILOT — The Pair Programmer ($42/month for 2 users)

### What It Does to Our Codebase

Copilot runs inside your editor (VS Code, Kiro) and suggests code as you type. It also provides a chat interface for asking questions about the codebase.

### How It Helps Edeviser Specifically

- Autocompletes TanStack Query hooks based on existing patterns in `src/hooks/`
- Suggests Zod schema fields based on the TypeScript interface
- Completes Tailwind CSS classes based on our design system patterns
- Generates test boilerplate for new components
- Explains complex code when you highlight it and ask "what does this do?"
- Helps write Supabase Edge Functions by suggesting Deno patterns
- Speeds up repetitive tasks (creating new pages that follow our List/Form/Dashboard patterns)

### What It Does NOT Do

- Cannot create PRs or branches
- Cannot run tests or verify its suggestions compile
- Does not review other people's code
- Cannot work asynchronously — only active when you're coding
- Does not proactively scan for issues

### When It Runs

Real-time, as you type. Also available via chat (Ctrl+I in VS Code).

### Configuration for Edeviser

Included in GitHub Enterprise Cloud plan ($21/user/month). Reads `AGENTS.md` and `.github/copilot-instructions.md` for project context. No additional setup needed.

---

## 5. HOW THEY WORK TOGETHER ON EDEVISER

Here's the actual workflow when code changes happen:

```
You write code (Copilot helps) → Push to branch → Open PR
                                                      ↓
                                              CodeRabbit reviews PR
                                              (catches issues in 2 min)
                                                      ↓
                                              You fix CodeRabbit's comments
                                                      ↓
                                              CI runs (lint + tsc + vitest)
                                                      ↓
                                              Merge to main
```

When Jules creates code:

```
Jules picks up task → Clones repo → Makes changes → Runs tests → Creates PR
                                                                      ↓
                                                              CodeRabbit reviews Jules' PR
                                                              (catches what Jules missed)
                                                                      ↓
                                                              You review + merge
```

The key insight: CodeRabbit reviews Jules' PRs. This is the safety net. Jules writes code, CodeRabbit catches issues, you make the final call.

---

## 6. OVERLAP ANALYSIS — Do We Need All Three?

### CodeRabbit vs Jules

Zero overlap. CodeRabbit only reviews, Jules only writes. They're complementary — Jules creates PRs, CodeRabbit reviews them.

### CodeRabbit vs Copilot

Minimal overlap. Copilot suggests code as you write it. CodeRabbit reviews the final result after you push. Copilot might prevent some issues that CodeRabbit would catch, but CodeRabbit catches things Copilot missed (like cross-file implications).

### Jules vs Copilot

Some overlap in code generation, but different modes. Copilot is synchronous (helps while you code). Jules is asynchronous (works while you sleep). You'd use Copilot for real-time coding and Jules for batch tasks you don't want to do manually.

### Jules vs GitHub Enterprise Copilot

GitHub Copilot (even Enterprise) does NOT do what Jules does. Copilot is autocomplete + chat. Jules is an autonomous agent that clones repos, creates branches, writes code, runs tests, and opens PRs. Copilot cannot do any of that. The only overlap is that both can answer questions about code.

---

## 7. COST JUSTIFICATION

| Tool           | Monthly Cost   | What It Replaces                                                             |
| -------------- | -------------- | ---------------------------------------------------------------------------- |
| CodeRabbit     | $19            | 2-3 hours/week of manual PR review                                           |
| Google Jules   | $0 (free tier) | 5-10 hours/week of grunt work (test writing, string extraction, dep updates) |
| GitHub Copilot | $42 (2 users)  | 30-40% faster coding velocity                                                |
| **Total**      | **$61/month**  | **Equivalent to ~20 hours/week of developer time**                           |

At $61/month, these three tools together save roughly 80 hours/month of developer time. That's a 130:1 return on investment at even a modest $10/hour developer rate.

---

## 8. WHAT EACH TOOL READS FROM OUR REPO

| File                       | CodeRabbit           | Jules                 | Copilot                    |
| -------------------------- | -------------------- | --------------------- | -------------------------- |
| `.coderabbit.yaml`         | Yes (primary config) | No                    | No                         |
| `AGENTS.md`                | No                   | Yes (primary context) | Yes (reads for context)    |
| `.kiro/steering/*.md`      | No                   | No                    | No (Kiro-specific)         |
| `package.json`             | Yes (dep analysis)   | Yes (npm ci)          | Yes (autocomplete)         |
| `tsconfig.json`            | Yes (TS rules)       | Yes (tsc --noEmit)    | Yes (type inference)       |
| `.github/workflows/ci.yml` | No                   | Yes (CI Fixer)        | No                         |
| Source code                | Yes (diff only)      | Yes (full repo)       | Yes (open files + context) |

---

## 9. RECOMMENDATION FOR EDEVISER

Keep all three. They serve different purposes at different stages of the development lifecycle:

1. Copilot helps you write code faster (real-time)
2. Jules handles tasks you don't want to do manually (async)
3. CodeRabbit catches what both you and Jules missed (review)

The total cost ($61/month) is less than 1 hour of a contractor's time. For a 2-person team building a production platform, this is the right investment.

---

_Edeviser — April 2026 — INTERNAL_

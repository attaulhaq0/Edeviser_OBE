---
inclusion: always
---

# Self-Review Loop

Before finalizing any code output (new file, significant edit, or feature implementation), perform this self-critique checklist. Do NOT skip this step.

## Review Checklist

### 1. Breakage Analysis
- What existing functionality could this change break?
- Are there call sites, imports, or tests that reference modified code?
- Does this change affect any RLS policies or database constraints?

### 2. Performance Review
- Are there N+1 query patterns? Use batch fetches or joins instead
- Are expensive computations memoized where appropriate?
- Will this cause unnecessary re-renders in React? Check dependency arrays
- Are large lists virtualized or paginated?
- Are Supabase queries using appropriate indexes?

### 3. Security Audit
- Is user input validated with Zod before reaching the database?
- Are RLS policies in place for any new tables?
- Is sensitive data (tokens, keys) kept out of client-side code?
- Are file uploads validated for type and size?
- Is the principle of least privilege followed for role-based access?

### 4. Scalability Concerns
- Will this approach work with 10x the current data volume?
- Are there hard-coded limits that should be configurable?
- Is pagination implemented for list endpoints?
- Are realtime subscriptions scoped narrowly (not subscribing to entire tables)?

### 5. Alternative Designs
- Is there a simpler way to achieve the same result?
- Could an existing utility or component be reused instead?
- Would a different data structure improve readability or performance?

## How to Apply
- For small changes: mentally run through the checklist, note any concerns inline as code comments
- For new features: include a brief "Review Notes" section in your response covering items 1-5
- If any item raises a red flag: call it out explicitly and propose a mitigation before proceeding

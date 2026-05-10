# Edeviser — Vercel Deployment Strategy

## Free Plan vs Pro Plan · Pilot Running · Scalability · Observability Setup

**Document Type:** Technical + Business Strategy  
**Audience:** Developer Team & Investors  
**Project:** Edeviser OBE + Gamification Platform  
**Date:** May 2026  
**Status:** Active — Pilot Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Vercel Is and Why We Use It](#2-what-vercel-is-and-why-we-use-it)
3. [Vercel Free (Hobby) Plan — Full Analysis](#3-vercel-free-hobby-plan--full-analysis)
4. [Vercel Pro Plan — What We Gain](#4-vercel-pro-plan--what-we-gain)
5. [Edeviser-Specific Issues on Free Plan](#5-edeviser-specific-issues-on-free-plan)
6. [Pilot Running Strategy](#6-pilot-running-strategy)
7. [Scalability Analysis](#7-scalability-analysis)
8. [Vercel Observability & Web Analytics Setup (Free)](#8-vercel-observability--web-analytics-setup-free)
9. [Pros, Cons & Limitations Summary](#9-pros-cons--limitations-summary)
10. [Upgrade Decision Framework](#10-upgrade-decision-framework)
11. [Investor Perspective](#11-investor-perspective)
12. [Recommended Action Plan](#12-recommended-action-plan)

---

## 1. Executive Summary

Edeviser is a full-stack OBE (Outcome-Based Education) + Gamification platform built on React/Vite + Supabase. It is currently deployed on Vercel's **Hobby (Free) plan** for the pilot phase.

**Key findings:**

- The free plan is **sufficient for pilot** with 1–3 institutions and up to ~500 concurrent users
- **One critical limitation** already hit: cron jobs limited to once-per-day (leaderboard refresh changed from every 5 min to daily)
- **Upgrading to Pro ($20/month)** unlocks per-minute crons, higher bandwidth, and team collaboration — essential before scaling beyond pilot
- **Free Vercel Analytics and Speed Insights** are available now and should be enabled immediately — they are safe, healthy, and provide real user data at zero cost
- The platform's architecture (Supabase backend, Edge Functions, Vite SPA) is well-suited for Vercel and will scale cleanly

---

## 2. What Vercel Is and Why We Use It

Vercel is a cloud platform for deploying frontend applications and serverless functions. For Edeviser it provides:

| Capability                | How Edeviser Uses It                                       |
| ------------------------- | ---------------------------------------------------------- |
| **Static hosting**        | Serves the React/Vite SPA from a global CDN                |
| **Serverless API routes** | Hosts `api/cron/*.ts` — the 10 scheduled jobs              |
| **Automatic deployments** | Every push to `main` triggers a production deploy          |
| **Preview deployments**   | Every PR gets its own preview URL for QA                   |
| **Edge network**          | Assets cached globally — fast load times in Qatar/MENA     |
| **Security headers**      | HSTS, CSP, X-Frame-Options all configured in `vercel.json` |

**Why not AWS/GCP/Azure?** Vercel's zero-config deployment, GitHub integration, and built-in CDN make it the fastest path to production for a Vite SPA. The backend (Supabase) is already managed separately, so Vercel only needs to serve the frontend and cron jobs.

---

## 3. Vercel Free (Hobby) Plan — Full Analysis

### What You Get

| Feature                         | Free Limit          | Edeviser Usage                           |
| ------------------------------- | ------------------- | ---------------------------------------- |
| Bandwidth                       | 100 GB/month        | ~2–5 GB/month at pilot scale             |
| Build execution                 | 6,000 min/month     | ~50 min/month (fast Vite builds)         |
| Deployments                     | Unlimited           | ~20–30/month                             |
| Serverless function invocations | 100,000/month       | ~10,000/month (crons + API)              |
| Serverless function duration    | 10 sec max          | Crons complete in 2–5 sec                |
| Cron jobs                       | 2 per project       | **We have 10 — this is a problem**       |
| Cron frequency                  | Once per day max    | **Was every 5 min — now fixed to daily** |
| Team members                    | 1 (personal only)   | Solo or shared via GitHub                |
| Custom domains                  | Unlimited           | ✅ Already configured                    |
| Analytics                       | Free tier available | ✅ Should enable now                     |
| Speed Insights                  | Free tier available | ✅ Should enable now                     |
| Support                         | Community only      | No SLA                                   |

### What's Already Working

- ✅ Production deployment live
- ✅ Custom domain connected
- ✅ GitHub auto-deploy on `main` push
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ SPA routing (all paths → index.html)
- ✅ Asset caching (1-year immutable for `/assets/`)
- ✅ Preview deployments on every PR

---

## 4. Vercel Pro Plan — What We Gain

**Cost: $20/month per member** (or $20/month for a team)

| Feature                     | Free      | Pro             | Impact for Edeviser                                        |
| --------------------------- | --------- | --------------- | ---------------------------------------------------------- |
| Cron frequency              | Once/day  | Every minute    | **Critical** — leaderboard, streak-risk need frequent runs |
| Cron jobs per project       | 2         | 100             | We have 10 crons — need Pro                                |
| Bandwidth                   | 100 GB    | 1 TB            | Handles 10,000+ active students                            |
| Serverless duration         | 10 sec    | 300 sec         | Bulk import, PDF generation, AI calls                      |
| Team members                | 1         | Unlimited       | Dev team collaboration                                     |
| Password protection         | ❌        | ✅              | Useful for staging environments                            |
| Advanced analytics          | Limited   | Full            | Conversion funnels, retention                              |
| Support                     | Community | Email (72h SLA) | Production incident response                               |
| Concurrent builds           | 1         | 3               | Faster CI for multiple PRs                                 |
| Preview deployment comments | ❌        | ✅              | QA workflow improvement                                    |

**Pro is required before going beyond pilot.** The cron limitation alone justifies the upgrade once you have paying institutions.

---

## 5. Edeviser-Specific Issues on Free Plan

### Issue 1: Cron Job Frequency (ALREADY FIXED)

**Problem:** `leaderboard-refresh` was set to `*/5 * * * *` (every 5 minutes). Vercel Hobby blocks any cron that runs more than once per day.

**Fix applied:** Changed to `0 12 * * *` (once daily at noon UTC).

**Impact:** Leaderboard updates once per day instead of every 5 minutes. For pilot with small cohorts, this is acceptable. For production with competitive gamification, this needs Pro.

**All 10 crons and their current schedules:**

| Cron                    | Schedule     | Frequency      | Impact of Daily-Only |
| ----------------------- | ------------ | -------------- | -------------------- |
| streak-risk             | `0 20 * * *` | Daily 8PM      | ✅ Fine              |
| weekly-summary          | `0 8 * * 1`  | Weekly Monday  | ✅ Fine              |
| compute-at-risk         | `0 2 * * *`  | Daily 2AM      | ✅ Fine              |
| perfect-day-prompt      | `0 18 * * *` | Daily 6PM      | ✅ Fine              |
| streak-reset            | `0 0 * * *`  | Daily midnight | ✅ Fine              |
| **leaderboard-refresh** | `0 12 * * *` | **Daily noon** | ⚠️ Was every 5 min   |
| ai-at-risk-prediction   | `0 3 * * *`  | Daily 3AM      | ✅ Fine              |
| notification-digest     | `0 20 * * *` | Daily 8PM      | ✅ Fine              |
| fee-overdue-check       | `0 6 * * *`  | Daily 6AM      | ✅ Fine              |
| exam-period-notify      | `0 8 * * *`  | Daily 8AM      | ✅ Fine              |

### Issue 2: Serverless Function Timeout (10 seconds)

**Problem:** Several operations may exceed 10 seconds on free plan:

- Bulk student data import (CSV with 500+ rows)
- PDF generation (course files, transcripts)
- AI at-risk prediction (calls external AI API)
- Attainment rollup for large cohorts

**Mitigation on free plan:**

- These operations run as Supabase Edge Functions (Deno), not Vercel functions — they have their own timeout (60 sec)
- The Vercel cron routes just trigger the Supabase Edge Functions, so the 10-sec limit only applies to the trigger, not the work

**Impact:** Low risk for pilot. Monitor if bulk operations start timing out.

### Issue 3: 100 GB Bandwidth Cap

**Problem:** If Edeviser grows to 1,000+ active students, bandwidth could approach the limit.

**Estimate:**

- Average page load: ~500 KB (gzipped bundle ~1.2 MB, cached after first load)
- Daily active user: ~5 page loads = ~2.5 MB/day
- 500 students × 2.5 MB × 30 days = **37.5 GB/month** — within free limit
- 1,000 students × 2.5 MB × 30 days = **75 GB/month** — approaching limit
- 2,000+ students → upgrade needed

**Mitigation:** Assets are cached with 1-year immutable headers. Returning users cost near-zero bandwidth.

### Issue 4: Single Team Member

**Problem:** Free plan is personal — can't add team members to the Vercel project.

**Workaround:** Share GitHub access. All deployments happen via GitHub Actions, so the team can deploy without Vercel dashboard access.

**Impact:** Low for pilot. Upgrade when you hire a second developer.

---

## 6. Pilot Running Strategy

### Phase 1: Pilot (Current — Free Plan)

**Target:** 1–3 institutions, 50–500 students, 3–6 months

**What works on free plan:**

- Full application functionality
- All 10 cron jobs (daily frequency)
- Automatic deployments from GitHub
- Custom domain
- Basic observability (Analytics + Speed Insights)
- Preview deployments for QA

**What to monitor:**

- Bandwidth usage (stay under 80 GB/month)
- Function invocations (stay under 80,000/month)
- Build minutes (stay under 5,000/month)
- User-reported issues with leaderboard staleness (daily refresh)

**Pilot success criteria:**

- 3 institutions onboarded
- 200+ active students
- Zero production incidents from Vercel limits
- Leaderboard daily refresh acceptable to users

### Phase 2: Growth (Pro Plan — ~Month 4)

**Trigger:** Any of these:

- 3+ institutions signed
- 500+ active students
- Leaderboard staleness complaints
- Need to add a second developer to Vercel

**What changes:**

- Leaderboard refresh back to every 5 minutes
- Bulk import timeout issues resolved
- Team collaboration enabled
- Advanced analytics for investor reporting

**Cost:** $20/month — recoverable from first paying institution

### Phase 3: Scale (Pro + Supabase Pro — ~Month 8)

**Trigger:** 10+ institutions, 2,000+ students

**What changes:**

- Vercel Pro handles the frontend scale
- Supabase Pro needed for database connection pooling
- Consider Vercel Enterprise for SLA guarantees

---

## 7. Scalability Analysis

### Frontend Scalability (Vercel)

Vercel's CDN is globally distributed. The Edeviser SPA is a static bundle — once built, it serves from edge nodes worldwide. This means:

| Users   | Vercel Load | Notes                              |
| ------- | ----------- | ---------------------------------- |
| 100     | Negligible  | Free plan comfortable              |
| 1,000   | Low         | Free plan comfortable              |
| 10,000  | Moderate    | Pro plan recommended               |
| 100,000 | High        | Enterprise plan + CDN optimization |

The frontend itself scales infinitely on Vercel — it's just static files. The bottleneck is always the backend (Supabase).

### Backend Scalability (Supabase — separate from Vercel)

| Component                 | Free Limit | Pro Limit | Edeviser Risk                       |
| ------------------------- | ---------- | --------- | ----------------------------------- |
| Database connections      | 60         | 200       | Medium — 500+ concurrent users      |
| Database size             | 500 MB     | 8 GB      | Low — OBE data is small             |
| Edge Function invocations | 500K/month | 2M/month  | Low                                 |
| Realtime connections      | 200        | 500       | Medium — gamification uses realtime |
| Storage                   | 1 GB       | 100 GB    | Low                                 |

**Key insight:** Supabase is the real scalability constraint, not Vercel. The connection pooler (PgBouncer) is critical for 500+ concurrent users.

### Architecture Scalability Score

| Layer                 | Current State      | Scalability Rating   |
| --------------------- | ------------------ | -------------------- |
| Frontend (Vercel CDN) | Static SPA         | ⭐⭐⭐⭐⭐ Excellent |
| API (Supabase REST)   | PostgREST          | ⭐⭐⭐⭐ Good        |
| Realtime (Supabase)   | WebSocket channels | ⭐⭐⭐ Moderate      |
| Database (PostgreSQL) | Single instance    | ⭐⭐⭐ Moderate      |
| Edge Functions (Deno) | Serverless         | ⭐⭐⭐⭐ Good        |
| Cron Jobs (Vercel)    | Serverless         | ⭐⭐⭐⭐ Good        |

**Overall: Well-architected for 0–5,000 users without major changes.**

---

## 8. Vercel Observability & Web Analytics Setup (Free)

### What's Available for Free

Vercel offers two free observability tools that should be enabled immediately:

#### 8.1 Web Analytics

**What it tracks:**

- Page views and unique visitors
- Top pages by traffic
- Referrer sources (where users come from)
- Device types (mobile vs desktop)
- Countries/regions
- Core Web Vitals per page

**Is it safe?** Yes. Vercel Analytics is privacy-first:

- No cookies
- No cross-site tracking
- GDPR compliant
- No personal data collected
- Works without user consent banners

**Is it healthy for the app?** Yes. It's a lightweight script (~1 KB) injected at the edge. Zero performance impact.

#### 8.2 Speed Insights

**What it tracks:**

- Real User Monitoring (RUM) — actual user experience, not lab tests
- Core Web Vitals: LCP, FID, CLS, TTFB, FCP
- Performance scores per page and per device
- P75 and P99 percentiles (catches slow outliers)

**Why this matters for Edeviser:**

- Students on mobile in Qatar may have different performance than desktop
- Identifies which pages are slow for real users
- Helps prioritize performance work

### How to Enable Right Now (Step by Step)

#### Step 1: Enable Web Analytics

1. Go to your Vercel project dashboard: `https://vercel.com/attaulhaq0s-projects/e-deviser`
2. Click **Analytics** tab in the top navigation
3. Click **Enable Web Analytics**
4. Select **Hobby** plan (free)
5. Click **Enable**

That's it. No code changes needed — Vercel injects the script automatically.

#### Step 2: Enable Speed Insights

1. In the same project, click **Speed Insights** tab
2. Click **Enable Speed Insights**
3. Select **Hobby** plan (free)
4. Click **Enable**

Again, no code changes needed.

#### Step 3: Add the packages (optional but recommended for custom events)

If you want to track custom events (e.g., "student submitted assignment", "teacher released grade"):

```bash
npm install @vercel/analytics @vercel/speed-insights
```

Then in `src/main.tsx`:

```typescript
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

inject();
injectSpeedInsights();
```

This gives you the full SDK for custom event tracking.

#### Step 4: Track key business events (optional)

```typescript
import { track } from "@vercel/analytics";

// In your submission handler:
track("assignment_submitted", { courseId, assignmentId });

// In your login handler:
track("user_login", { role: user.role });

// In your grade release:
track("grade_released", { courseId });
```

### What You'll See After Enabling

Within 24 hours of your first real users:

**Analytics Dashboard:**

- How many students visited today
- Which pages they visited most (dashboard, learning path, leaderboard)
- Where they came from (direct, email, etc.)
- Mobile vs desktop split

**Speed Insights Dashboard:**

- Your app's real-world performance score
- Which pages are slowest
- Whether mobile users have worse experience than desktop

### Is This Healthy for Production?

**Yes, completely safe.** Vercel Analytics and Speed Insights are:

- Used by thousands of production apps
- Privacy-compliant (no PII collected)
- Zero performance overhead
- Free forever on Hobby plan (with usage limits)
- No security risk

**Free tier limits:**

- Analytics: 2,500 events/month (enough for pilot)
- Speed Insights: 10,000 data points/month (enough for pilot)

When you exceed these, you can upgrade to paid analytics ($10/month) or the data simply stops collecting until the next month — it never breaks the app.

---

## 9. Pros, Cons & Limitations Summary

### Vercel Free Plan

| Category        | Pros                                | Cons                       |
| --------------- | ----------------------------------- | -------------------------- |
| **Cost**        | $0/month                            | Limited resources          |
| **Deployment**  | Instant, automatic, zero-config     | Single team member         |
| **Performance** | Global CDN, fast TTFB               | —                          |
| **Crons**       | 10 crons supported                  | Once-per-day max frequency |
| **Functions**   | Serverless, auto-scaling            | 10-second timeout          |
| **Bandwidth**   | 100 GB/month                        | Enough for ~1,500 students |
| **Analytics**   | Free Web Analytics + Speed Insights | 2,500 events/month limit   |
| **Support**     | Community forums                    | No SLA, no email support   |
| **Domains**     | Unlimited custom domains            | —                          |
| **Previews**    | PR preview deployments              | —                          |

### Vercel Pro Plan

| Category      | Pros                 | Cons             |
| ------------- | -------------------- | ---------------- |
| **Cost**      | Full features        | $20/month/member |
| **Crons**     | Per-minute frequency | —                |
| **Functions** | 300-second timeout   | —                |
| **Bandwidth** | 1 TB/month           | —                |
| **Team**      | Unlimited members    | —                |
| **Analytics** | 100K events/month    | —                |
| **Support**   | Email, 72h SLA       | Not 24/7         |

---

## 10. Upgrade Decision Framework

```
Is leaderboard staleness (daily refresh) causing user complaints?
  YES → Upgrade to Pro immediately
  NO  → Continue on Free

Are you onboarding more than 3 institutions?
  YES → Upgrade to Pro
  NO  → Continue on Free

Is bandwidth approaching 80 GB/month?
  YES → Upgrade to Pro
  NO  → Continue on Free

Do you need to add a second developer to Vercel?
  YES → Upgrade to Pro
  NO  → Continue on Free

Are bulk imports timing out?
  YES → Check if it's Vercel (unlikely) or Supabase Edge Function
  If Vercel → Upgrade to Pro
  If Supabase → Upgrade Supabase plan
```

**Recommendation:** Upgrade to Pro when you sign your **second paying institution** or when you have **500+ active students**, whichever comes first.

---

## 11. Investor Perspective

### Infrastructure Cost Efficiency

| Stage        | Monthly Cost                                             | Users Supported       |
| ------------ | -------------------------------------------------------- | --------------------- |
| Pilot (now)  | $0 (Vercel Free) + $0 (Supabase Free)                    | 0–500 students        |
| Early Growth | $20 (Vercel Pro) + $25 (Supabase Pro) = **$45/month**    | 500–5,000 students    |
| Scale        | $20 (Vercel Pro) + $599 (Supabase Team) = **$619/month** | 5,000–50,000 students |
| Enterprise   | Custom pricing                                           | 50,000+ students      |

**Unit economics:** At $45/month supporting 5,000 students, infrastructure cost is **$0.009 per student per month** — essentially zero.

### Why Vercel is the Right Choice for Investors

1. **Zero DevOps overhead** — No servers to manage, no Kubernetes, no ops team needed
2. **Instant global scale** — CDN handles traffic spikes automatically
3. **Predictable costs** — No surprise bills from traffic spikes
4. **Fast iteration** — Deploy in 2 minutes, not 2 hours
5. **Built-in observability** — Real user data from day one
6. **Proven at scale** — Used by Airbnb, Notion, TikTok, and thousands of SaaS companies

### Risk Assessment

| Risk              | Likelihood                          | Impact | Mitigation                                          |
| ----------------- | ----------------------------------- | ------ | --------------------------------------------------- |
| Vercel outage     | Low (99.99% uptime SLA on Pro)      | High   | Supabase backend still works; users can't access UI |
| Bandwidth overage | Medium (at 1,000+ students)         | Low    | Upgrade to Pro ($20/month)                          |
| Cron staleness    | Low (daily is acceptable for pilot) | Medium | Upgrade to Pro when needed                          |
| Vendor lock-in    | Low                                 | Medium | Vite SPA can deploy to any CDN in hours             |

**Overall infrastructure risk: LOW.** The architecture is portable and the costs are negligible relative to revenue potential.

---

## 12. Recommended Action Plan

### Immediate (This Week)

- [x] Deploy to production (done)
- [ ] **Enable Web Analytics** (5 minutes, free, do it now)
- [ ] **Enable Speed Insights** (5 minutes, free, do it now)
- [ ] Verify all 10 cron jobs are running (check Vercel Functions logs)
- [ ] Set up Vercel email alerts for deployment failures

### Short Term (Month 1–2)

- [ ] Monitor bandwidth usage weekly
- [ ] Review Speed Insights — identify slowest pages
- [ ] Review Analytics — understand user behavior patterns
- [ ] Fix the `post-audit-remediation` spec issues (habit_logs table, console.log stripping)

### Medium Term (Month 3–4)

- [ ] Upgrade to Vercel Pro when second institution signs
- [ ] Restore leaderboard-refresh to `*/5 * * * *`
- [ ] Add team members to Vercel project
- [ ] Set up Vercel preview deployment comments for QA workflow

### Long Term (Month 6+)

- [ ] Evaluate Vercel Enterprise for SLA guarantees
- [ ] Consider Supabase Pro for connection pooling at scale
- [ ] Implement custom Vercel Analytics events for business KPIs

---

## Appendix A: Steering Files Explained

**Steering files** are Kiro IDE configuration files that provide persistent context to the AI assistant. They live in `.kiro/steering/` and are automatically included in every conversation.

| File                        | Purpose                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `design-system.md`          | Design tokens, component rules, color coding                    |
| `domain-knowledge.md`       | OBE concepts, gamification rules, business logic                |
| `project-conventions.md`    | Tech stack, file structure, coding standards                    |
| `engineering-guardrails.md` | Non-negotiable rules (no `any`, SOLID principles)               |
| `supabase-patterns.md`      | RLS templates, TanStack Query patterns, Edge Function structure |
| `component-patterns.md`     | Page skeletons, shared component usage                          |
| `review-loop.md`            | Self-review checklist before finalizing code                    |
| `pre-push-checks.md`        | Mandatory CI checks before committing                           |

**Inclusion modes:**

- `always` — included in every conversation (domain-knowledge.md)
- `fileMatch` — included when matching files are in context (e.g., supabase-patterns.md when editing hooks)
- `manual` — only when explicitly referenced with `#` in chat

---

## Appendix B: Hooks Explained

**Hooks** are automated triggers in the Kiro IDE that run agent actions when events occur. They live in `.kiro/hooks/`.

| Hook Type           | When It Fires               | Example Use                       |
| ------------------- | --------------------------- | --------------------------------- |
| `fileEdited`        | When you save a file        | Run lint on save                  |
| `fileCreated`       | When a new file is created  | Auto-add boilerplate              |
| `preToolUse`        | Before a tool executes      | Security check before file writes |
| `postToolUse`       | After a tool executes       | Run tests after code changes      |
| `preTaskExecution`  | Before a spec task starts   | Validate prerequisites            |
| `postTaskExecution` | After a spec task completes | Run Postman collection to verify  |
| `userTriggered`     | Manual button click         | Deploy to staging                 |
| `promptSubmit`      | When you send a message     | Add context to every prompt       |
| `agentStop`         | When agent finishes         | Summarize what was done           |

**The Postman hook** you see firing after every task completion checks if the task created new API endpoints and validates them against the Postman collection.

---

## Appendix C: Last Audit Report

**Report name:** `Pre-Deployment E2E Audit — Edeviser Platform`  
**File location:** `audit/output/audit-report.md`  
**Spec location:** `.kiro/specs/pre-deployment-e2e-audit/`  
**Last run:** May 9, 2026  
**Verdict:** No-Go (pre-fix) → Go-with-backlog (post-fix)

**Summary of what was audited:**

- 15 property-based tests (OBE invariants, gamification rules, system properties)
- Security scan (secrets in bundle, VITE\_ allowlist, Edge Function validation)
- Design token conformance (color families, glassmorphism, physical margins)
- i18n parity (en ↔ ar key diff, untranslated literals)
- Accessibility (WCAG 2.1 AA color contrast, icon-only buttons)
- Performance budget (bundle size, pagination, realtime filters)
- Connectivity matrix (hook → table/RPC/Edge Function mapping)
- RLS matrix (per-role access probes)
- Cron health (endpoint reachability, idempotency)

**Issues found and fixed:**

- 8 color contrast failures → fixed (Bloom badges -500→-700, attainment -600→-800)
- 12 icon-only buttons missing aria-label → fixed
- 19 Edge Function body validation gaps → downgraded to Major (backlog)
- 946 untranslated string literals → Minor (i18n backlog)

---

_Document generated: May 10, 2026_  
_Next review: Before Phase 2 launch (Month 4)_

---
pdf_options:
  format: A4
  margin: 25mm 20mm
---

<style>
h1 { color: #1e3a8a; border-bottom: 2px solid #14b8a6; padding-bottom: 8px; }
h2 { color: #1e3a8a; margin-top: 1.5em; }
h3 { color: #0f172a; }
table { font-size: 0.85em; border-collapse: collapse; width: 100%; margin: 0.5em 0; }
th { background: #f1f5f9; color: #1e3a8a; text-align: left; padding: 6px 10px; border: 1px solid #e2e8f0; }
td { padding: 6px 10px; border: 1px solid #e2e8f0; }
tr:nth-child(even) { background: #f8fafc; }
blockquote { border-left: 3px solid #14b8a6; padding-left: 12px; color: #475569; font-style: italic; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
h2, h3, h4 { page-break-after: avoid; }
table { page-break-inside: avoid; }
tr { page-break-inside: avoid; }
h2 + *, h3 + *, h4 + * { page-break-before: avoid; }
</style>

# Edeviser — Tech Stack, AI & Product Cost Overview

**Quick Reference for Founders, Team Members & Investors**

**Version:** 1.0 | **Date:** April 2026

---

## What Is Edeviser?

Edeviser is a B2B SaaS platform for higher education that fuses accreditation compliance (OBE) with student engagement (gamification) through a Dual-Engine Architecture. When a teacher grades an assignment, the system simultaneously generates accreditation evidence and rewards the student with XP, badges, and streak progress. Compliance and engagement feed each other in a closed loop.

Target market: Private and semi-government universities in Qatar and the GCC region, with expansion into South/Southeast Asia. The platform supports full Arabic/English bilingual operation with RTL layout.

---

## Complete Tech Stack

### Frontend

| Technology                          | Role                                               |
| ----------------------------------- | -------------------------------------------------- |
| React 18 + TypeScript (strict mode) | UI framework                                       |
| Vite 6                              | Build tooling, HMR, bundling                       |
| Tailwind CSS v4 + Shadcn/ui         | Styling and component library                      |
| TanStack Query v5                   | Server state management, caching                   |
| TanStack Table                      | Data tables with sort/filter/pagination            |
| React Router v7                     | Role-based routing and guards                      |
| React Hook Form + Zod               | Forms and runtime validation                       |
| Zustand                             | Client-side state management                       |
| Framer Motion                       | Animations and micro-interactions                  |
| Recharts                            | Charts and data visualization                      |
| i18next + react-i18next             | Internationalization (Arabic/English)              |
| Sentry                              | Error monitoring and performance tracing           |
| Sonner                              | Toast notifications                                |
| nuqs                                | URL-persisted search/filter state                  |
| dnd-kit                             | Drag and drop (rubric builder, outcome reordering) |
| date-fns                            | Date manipulation                                  |
| canvas-confetti                     | Celebration effects (level-up, badge unlock)       |

### Backend (Supabase BaaS)

| Technology                     | Role                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| PostgreSQL 15                  | Primary database with Row Level Security on all tables            |
| Supabase Auth (GoTrue)         | JWT-based authentication, session management                      |
| Supabase Realtime              | WebSocket-based live updates (leaderboard, grades, notifications) |
| Supabase Storage               | File uploads (assignments, avatars) with RLS                      |
| Supabase Edge Functions (Deno) | Server-side business logic (25+ functions)                        |
| pgvector                       | Vector embeddings for AI RAG pipeline                             |
| pg_cron                        | Scheduled jobs (streak reset, at-risk signals, weekly summaries)  |
| pg_net                         | HTTP calls from database triggers                                 |
| PostgREST                      | Auto-generated REST API from database schema                      |

### External Services

| Service             | Role                                                        | Monthly Cost (Pilot) |
| ------------------- | ----------------------------------------------------------- | -------------------- |
| Vercel Pro          | Frontend CDN, CI/CD, preview deployments                    | $20                  |
| OpenRouter (GPT-4o) | AI features (at-risk, suggestions, feedback, quizzes)       | $60–80               |
| OpenAI Embeddings   | RAG vector embeddings (text-embedding-3-small/large)        | $2–5                 |
| Resend Pro          | Transactional email (streak reminders, grade notifications) | $20                  |
| Sentry              | Production error monitoring                                 | $29                  |

### Dev Tooling

| Tool                              | Role                           | Monthly Cost |
| --------------------------------- | ------------------------------ | ------------ |
| Claude Code (Anthropic Max)       | AI-assisted development        | $200         |
| Kiro IDE Max                      | Spec-driven development        | $39          |
| GitHub Enterprise Cloud (2 users) | Source control, CI/CD, Copilot | $42          |
| CodeRabbit Pro                    | Automated PR review            | $19          |
| Figma Professional (2 editors)    | UI/UX design and handoff       | $30          |
| Postman Basic                     | API testing                    | $14          |

### Testing

| Tool            | Role                                        |
| --------------- | ------------------------------------------- |
| Vitest          | Unit and integration test runner            |
| fast-check      | Property-based testing (min 100 iterations) |
| Testing Library | React component testing                     |
| Playwright      | End-to-end testing                          |
| k6              | Load testing                                |

---

## AI Features & Insights

Edeviser runs 6 AI-powered features, all production-ready and backed by a feedback flywheel that improves accuracy over time.

### 1. At-Risk Early Warning

- Analyzes behavioral signals (login frequency, submission timing, CLO attainment trends) from the student activity log
- Flags students with high probability of failing a CLO, 7+ days before deadlines
- Each prediction includes a probability score (0–100%) and contributing signal details
- Surfaced on the teacher dashboard with actionable nudge options
- Validated against actual grades for accuracy tracking (target: <20% false positive rate)

### 2. Personalized Module Suggestions

- Identifies CLO attainment gaps per student and recommends specific learning resources
- Includes social proof from historical cohort data (e.g., "Students who completed these exercises scored 34% higher on this CLO")
- Student feedback (thumbs up/down) stored and fed back into model weighting

### 3. Assignment Feedback Drafts

- Generates per-criterion rubric feedback comments based on submitted work
- Teacher sees draft comments with accept/edit/reject controls per criterion
- Available within 10 seconds of opening the grading view
- Teacher actions stored for model improvement

### 4. Adaptive Quiz Generation

- AI generates quiz questions aligned to specific CLOs and Bloom's Taxonomy levels
- Question bank with difficulty calibration, discrimination index tracking, and quality flags
- Adaptive quiz sessions adjust difficulty in real-time based on student performance
- Post-quiz review with AI-generated explanations and confidence scoring

### 5. AI Tutor (RAG Pipeline) — Designed

- Retrieval-Augmented Generation using pgvector for course-specific knowledge
- Students ask questions and receive contextual answers grounded in course materials
- Designed and spec'd; deployment planned for pilot phase

### 6. Habit Correlation Analysis

- Computes correlations between student habits (login, submission, journaling, reading) and academic outcomes
- Surfaces insights like "Students who journal 3+ times per week score 22% higher on CLO attainment"
- Confidence badges on correlation strength

### AI Feedback Flywheel

Every AI output collects structured feedback. Student ratings, teacher accept/edit/reject actions, and actual grade outcomes are stored in the `ai_feedback` table. This data feeds back into prompt engineering and model selection, creating a continuous improvement loop.

### AI Architecture Decisions

- LLM calls routed through OpenRouter for provider flexibility (GPT-4o primary, fallback to Claude)
- All AI processing happens in Supabase Edge Functions (server-side, never client-side)
- Rate limiting on all AI endpoints to control costs
- AI features are modular — each can be enabled/disabled per institution

---

## Product Cost Summary

### Monthly Infrastructure (Pilot: 1 institution, 500 students)

| Category                 | Monthly (USD) | Monthly (PKR)          |
| ------------------------ | ------------- | ---------------------- |
| Supabase Pro + compute   | $50           | PKR 14,000             |
| Vercel Pro               | $20           | PKR 5,600              |
| AI/LLM APIs (GPT-4o)     | $60–80        | PKR 16,800–22,400      |
| AI Embeddings            | $2–5          | PKR 560–1,400          |
| Resend Pro (email)       | $20           | PKR 5,600              |
| Sentry (monitoring)      | $29           | PKR 8,120              |
| **Infrastructure total** | **~$181–206** | **~PKR 50,680–57,680** |

### Monthly Dev Tooling

| Category                                                   | Monthly (USD) | Monthly (PKR) |
| ---------------------------------------------------------- | ------------- | ------------- |
| Claude Code + Kiro + GitHub + CodeRabbit + Figma + Postman | $344          | PKR 96,320    |

A single developer with this AI-augmented tooling stack maintains velocity equivalent to a 3-person team. Each tool replaces the need for additional engineering hires.

### Combined Monthly Burn

| Scenario                          | Total/month (PKR) | Total/month (USD) |
| --------------------------------- | ----------------- | ----------------- |
| Lean (essential tools only)       | ~PKR 130,000      | ~$464             |
| Standard (all tools)              | ~PKR 151,000      | ~$539             |
| Growth (3 institutions, 2K users) | ~PKR 175,000      | ~$625             |

### Scaling Path

| Scale             | Users   | Infrastructure/mo                     |
| ----------------- | ------- | ------------------------------------- |
| Pilot             | 500     | ~$180/mo                              |
| Early Growth      | 2,000   | ~$280/mo                              |
| Growth            | 10,000  | ~$535/mo                              |
| Enterprise (50K+) | 50,000+ | Migration to AWS/self-hosted Supabase |

### Capital Requirement

PKR 2M bridge capital covers Qatar market entry (~PKR 1.4M for founder relocation, QFC entity, regulatory compliance) plus 6 months of product infrastructure (~PKR 624K). The Qatar setup cost is reimbursable through the Ignite Bridge Startup Program at month 6-7, extending the effective runway to 12+ months with a PKR 606K buffer.

---

## Revenue Model

| Tier       | Students  | Annual License | Implementation Fee |
| ---------- | --------- | -------------- | ------------------ |
| Starter    | Up to 500 | $30K–50K       | $10K               |
| Growth     | 500–2,000 | $50K–100K      | $20K               |
| Enterprise | 2,000+    | $100K–250K     | $40K               |

A single discounted pilot contract (~PKR 4.2M/year) exceeds the entire PKR 2M bridge capital and makes the company self-sustaining on infrastructure costs.

---

## Why Supabase (BaaS) Instead of AWS / Custom Node.js Backend?

This is the most common technical question from investors and engineers. Here is the honest comparison.

### The Short Answer

Supabase gives a 2-person team the backend capabilities of a 6-person team at 1/10th the cost. For a pre-revenue startup targeting first pilot, speed to market matters more than architectural purity. The migration path to AWS exists and is well-defined if we outgrow it.

### Option A: Supabase BaaS (What We Chose)

**Pros**

- Auth, database, realtime, storage, edge functions, and cron jobs in a single managed service — no infrastructure to maintain
- Row Level Security (RLS) enforces data isolation at the database layer, not in application code. This is stronger security than most custom backends achieve
- PostgREST auto-generates a typed REST API from the database schema — zero boilerplate CRUD code
- Realtime subscriptions (WebSocket) built in — leaderboards, grade notifications, and streak updates work out of the box
- pgvector extension for AI embeddings, pg_cron for scheduled jobs, pg_net for HTTP triggers — all native PostgreSQL, no extra services
- Edge Functions run on Deno (TypeScript) — same language as the frontend, no context switching
- Open-source core — can self-host on AWS/GCP if needed, eliminating vendor lock-in
- $50/month for a production-grade backend that would cost $500-1,000/month on AWS with equivalent services
- Built-in dashboard for database management, user auth, storage, and logs — no need for separate admin tools
- Type generation from schema (`supabase gen types`) keeps frontend and database in sync automatically

**Cons**

- Edge Functions have cold start latency (~200-500ms on first invocation) — not ideal for latency-critical endpoints
- No custom middleware layer — complex request pipelines require workarounds in Edge Functions
- Limited to PostgreSQL — no easy path to NoSQL or multi-database architectures
- Supabase Realtime has connection limits (~200 concurrent per project on Pro plan) — needs upgrade at scale
- Less granular control over database tuning, connection pooling, and query optimization compared to self-managed PostgreSQL
- Community and ecosystem smaller than AWS/Firebase — fewer third-party integrations
- Edge Function debugging is harder than a local Node.js server — limited logging and no step-through debugging

### Option B: AWS (Lambda + RDS + API Gateway + Cognito)

**Pros**

- Virtually unlimited scale — handles millions of concurrent users without architectural changes
- Fine-grained control over every infrastructure component (networking, caching, queuing, compute)
- Mature ecosystem with hundreds of managed services (SQS, SNS, ElastiCache, CloudFront, etc.)
- Enterprise compliance certifications (SOC 2, HIPAA, FedRAMP) built in
- Multi-region deployment for global low-latency access
- Extensive monitoring and observability (CloudWatch, X-Ray, CloudTrail)

**Cons**

- Requires a dedicated DevOps engineer or significant infrastructure expertise — a 2-person team cannot maintain this
- Monthly cost for equivalent functionality: $500-1,500/month minimum (RDS, Lambda, API Gateway, Cognito, S3, CloudFront, SQS)
- Auth (Cognito) is notoriously difficult to configure and has poor developer experience compared to Supabase Auth
- No built-in realtime — requires separate WebSocket infrastructure (API Gateway WebSocket + Lambda + DynamoDB)
- No built-in RLS equivalent — data isolation must be implemented in application code, which is error-prone
- Cold starts on Lambda (especially with VPC) can be 1-3 seconds
- Development velocity is 3-5x slower due to infrastructure configuration, IAM policies, and deployment pipelines
- Vendor lock-in is deeper — migrating away from Lambda + DynamoDB + Cognito is harder than migrating away from Supabase (which is just PostgreSQL)

### Option C: Custom Node.js/Express Backend

**Pros**

- Full control over every line of backend code — no platform constraints
- Familiar to most developers — largest hiring pool
- Can use any database, any ORM, any middleware
- No cold starts — always-on server with predictable latency
- Easier debugging with standard Node.js tooling

**Cons**

- Must build and maintain: auth system, session management, RBAC, file upload handling, realtime WebSocket server, cron job scheduler, database migrations, API documentation, rate limiting, input validation — all from scratch
- Estimated 3-4 months of backend-only development before the first feature ships
- Requires server management (or Kubernetes/ECS) — ongoing DevOps burden
- Security is only as good as the code — no database-layer enforcement like RLS
- Monthly hosting: $100-300/month for a basic setup (VPS/container + managed DB + Redis + S3)
- A 2-person team would spend 60-70% of time on backend infrastructure instead of product features

### The Migration Plan (When We Outgrow Supabase)

| Trigger                            | Action                                                                     | Timeline  |
| ---------------------------------- | -------------------------------------------------------------------------- | --------- |
| 50+ institutions or 50K+ users     | Migrate to self-hosted Supabase on AWS (same codebase, own infrastructure) | 2-3 weeks |
| Need for custom middleware/queuing | Add API Gateway + SQS in front of Supabase for specific endpoints          | 1-2 weeks |
| Enterprise compliance requirement  | Move to AWS GovCloud with self-hosted Supabase                             | 4-6 weeks |
| Realtime connection limits hit     | Add dedicated WebSocket server (Socket.io on ECS) alongside Supabase       | 1-2 weeks |

The key insight: Supabase is PostgreSQL. Every query, every migration, every RLS policy works identically on self-hosted PostgreSQL. The migration is an infrastructure change, not a code rewrite.

### Cost Comparison (Monthly, for Edeviser at Pilot Scale)

| Component      | Supabase            | AWS Equivalent                    | Custom Node.js              |
| -------------- | ------------------- | --------------------------------- | --------------------------- |
| Database       | Included ($50 plan) | RDS: $50-100                      | Managed DB: $30-60          |
| Auth           | Included            | Cognito: $0-25                    | Build from scratch          |
| Realtime       | Included            | API GW WebSocket + Lambda: $30-50 | Socket.io server: $20-40    |
| Storage        | Included            | S3 + CloudFront: $10-20           | S3: $5-10                   |
| Edge Functions | Included            | Lambda + API GW: $20-50           | VPS/Container: $20-50       |
| Cron Jobs      | Included (pg_cron)  | EventBridge + Lambda: $5-10       | node-cron on server         |
| DevOps time    | 0 hours/month       | 20-40 hours/month                 | 10-20 hours/month           |
| **Total**      | **$50/month**       | **$150-300/month + DevOps**       | **$100-200/month + DevOps** |

### Bottom Line

For a pre-revenue startup with a 2-person team, Supabase is the right choice today. It lets us ship a production-grade platform at $50/month with enterprise-level security (RLS), built-in realtime, and zero DevOps overhead. The migration path to AWS is clean because Supabase is just PostgreSQL underneath. We revisit this decision at 50+ institutions — and by then, we will have the revenue and team size to justify the infrastructure investment.

---

## Architecture Highlights (Investor-Relevant)

- **Security at the database layer:** Row Level Security on every table. No application-layer trust. Data isolation is enforced by PostgreSQL, not by code.
- **Immutable audit trail:** Evidence records and XP transactions are append-only. Accreditation auditors can trace any attainment score back to the original submission.
- **Real-time everything:** Leaderboards, grade notifications, streak updates, and habit tracking all update live via WebSocket subscriptions.
- **Multi-tenancy via RLS:** Single database, institution-scoped data isolation. Scales to 50+ institutions before needing architectural changes.
- **Open-source backend:** Supabase is open-source. Migration path to self-hosted or AWS exists if needed, eliminating vendor lock-in risk.
- **PWA-ready:** Service worker, offline queue, and manifest.json for installable mobile experience without app store overhead.

---

## Key Numbers

| Metric                       | Value                                            |
| ---------------------------- | ------------------------------------------------ |
| Feature modules              | 17+                                              |
| Supabase Edge Functions      | 25+                                              |
| Database tables with RLS     | 30+                                              |
| Database migrations          | 40+                                              |
| React hooks                  | 120+                                             |
| Shared UI components         | 50+                                              |
| Test files (unit + property) | 150+                                             |
| Supported languages          | Arabic, English (full RTL)                       |
| User roles                   | 5 (admin, coordinator, teacher, student, parent) |
| AI features                  | 6 (5 live, 1 designed)                           |
| XP sources                   | 11+                                              |
| Badge types                  | Standard, mystery, tiered, team                  |
| Cron jobs                    | 10 (streak, at-risk, summaries, habits, etc.)    |

---

## Competitive Moat

1. **Dual-engine fusion** — No competitor combines OBE compliance and gamification in a single feedback loop
2. **AI-native from day one** — At-risk prediction, adaptive quizzes, and feedback drafts are core features, not add-ons
3. **Science-backed design** — 10 foundational pillars grounded in published research (Bloom, Fogg, Zimmerman, Csikszentmihalyi, Eyal, Chou)
4. **Qatar-first localization** — Full Arabic/English bilingual with RTL layout, targeting a $7.2B GCC EdTech market with no dominant OBE platform
5. **Low infrastructure cost** — Full production platform runs at ~$180/mo, enabling aggressive pricing against enterprise competitors

---

_Edeviser — April 2026_

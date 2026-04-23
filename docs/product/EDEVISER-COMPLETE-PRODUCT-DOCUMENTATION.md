# Edeviser — Complete Product Documentation
## For Investment Preparation & Scalability Planning

**Version:** 2.1 | **Date:** April 2026 | **Purpose:** Comprehensive product reference for investor Q&A, due diligence, and strategic planning

---

## 1. EXECUTIVE SUMMARY

### What is Edeviser?
Edeviser is a **Human-Centric Outcome-Based Education (OBE) + Gamification platform** for higher education institutions. It resolves the paradox between accreditation compliance and student engagement through a **Dual-Engine Architecture**:

- **Engine 1 — OBE Core:** Automates ILO → PLO → CLO mapping, rubric-based grading, immutable evidence generation, and accreditation report export.
- **Engine 2 — Habit Core:** Transforms compliance activities into motivating student experiences via XP, streaks, badges, levels, leaderboards, AI tutoring, and self-regulated learning tools.

### Key Differentiator
Where competitors treat compliance and engagement as separate products, Edeviser fuses them into a single feedback loop — *compliance generates gamified triggers; student engagement generates accreditation evidence.*

### Vision
> "To make every learning interaction count — for the student who needs to grow, and the institution that needs to prove it."

### Category
EdTech SaaS (B2B2C) — Higher Education Accreditation & Student Engagement Platform

---

## 2. USER PERSONAS & ROLES

### 2.1 Administrator
- System owner, compliance officer, IT manager
- Core need: Generate comprehensive, auditable outcome attainment reports instantly
- Pain: Data siloed across spreadsheets; last-minute accreditation preparation
- Success: One-click PDF export of institution-wide PLO attainment with evidence citations

### 2.2 Coordinator (Program Manager)
- Curriculum architect, program oversight
- Core need: Live visual matrix of which courses cover which PLOs
- Pain: No real-time visibility; mapping errors discovered only at audit
- Success: Live, color-coded PLO × Course matrix with drill-down to evidence

### 2.3 Teacher (Faculty)
- Instructor, content creator, assessor
- Core need: Grade once → evidence auto-generated; no separate OBE form
- Pain: Dual data entry; rubric creation complexity; no real-time student insight
- Success: 5-minute assignment setup with rubric templates; automatic evidence chain

### 2.4 Student
- Primary end-user, digital native
- Core need: Feel immediate progress and understand skill connections
- Pain: No feedback loop; grades arrive late; feels like a number
- Success: Real-time XP animation on submission; visible skill progression; 30+ day streaks

### 2.5 Parent/Guardian
- Read-only dashboard for linked student grades, attendance, CLO progress, and habit data

---

## 3. THE 10 FOUNDATIONAL PILLARS (Science-Backed)

### Engine 1: OBE Core (Structure & Compliance)
| Pillar | Science Basis | Product Manifestation |
|--------|--------------|----------------------|
| 1. Outcome-Based Education | Spady (1994) | ILO → PLO → CLO mapping; automated evidence rollup |
| 2. Rubrics | Andrade (2000) | Per-CLO rubric builder with level descriptors |
| 3. Bloom's Taxonomy | Bloom (1956), Anderson & Krathwohl (2001) | CLO tagging; visual distribution charts; Learning Path ordering |

### Engine 2: Habit Core (Behavior & Motivation)
| Pillar | Science Basis | Product Manifestation |
|--------|--------------|----------------------|
| 4. Agentic AI | LLMs + RAG | AI Tutor, at-risk detection, feedback drafts, adaptive quizzes |
| 5. Self-Regulated Learning | Zimmerman (1989) | Personal dashboard, habit tracking, goal setting, weekly planner |
| 6. BJ Fogg Behavior Model | Fogg (2009) | Daily micro-task prompts; graduated habit difficulty levels |
| 7. Hooked Model | Nir Eyal (2014) | Daily login triggers; variable XP rewards; leaderboard investment |
| 8. Gamification (Octalysis) | Yu-kai Chou | XP, levels, badges, streaks, leaderboards, team challenges |
| 9. Flow Theory | Csikszentmihalyi (1990) | Adaptive difficulty; Focus Mode; flow check-ins |
| 10. Reflection Journaling | Kolb (1984) | CLO-linked journal prompts; Gibbs' Reflective Cycle templates |

---

## 4. TECH STACK & ARCHITECTURE

### Frontend
- React 18 + TypeScript (strict mode), Vite 6, Tailwind CSS v4 + Shadcn/ui
- React Router v7, TanStack Query v5, TanStack Table, React Hook Form + Zod
- Framer Motion, Recharts, dnd-kit, Sonner, nuqs, canvas-confetti
- Zustand, i18next + react-i18next, Sentry

### Backend (Supabase BaaS)
- PostgreSQL 15 with Row Level Security (RLS) on ALL tables
- GoTrue Auth (JWT, bcrypt, token refresh)
- Supabase Realtime (Phoenix Channels) for live updates
- Supabase Storage (file uploads with RLS)
- Supabase Edge Functions (Deno runtime) for complex logic
- pgvector for AI RAG pipeline, pg_cron for scheduled jobs

### Deployment
- Vercel (frontend CDN, CI/CD, preview deployments)
- Supabase Cloud (managed PostgreSQL, Auth, Storage, Edge Functions)

### Architecture Pattern
Backend-as-a-Service (BaaS) + Edge Functions. Security enforced at the database layer via RLS policies. Single Supabase project with RLS for multi-tenancy (revisit at 50+ institutions).

---

## 5. COMPLETE FEATURE SET

### 5.1 Authentication & Authorization (LIVE)
- Email/password login via Supabase Auth with JWT
- Role-Based Access Control: admin, coordinator, teacher, student, parent
- 5-attempt lockout (15 min) with audit logging
- Role-aware post-login redirect, session persistence (24h active, 8h idle timeout)
- Password reset via email (1-hour expiry, single-use)

### 5.2 User & Profile Management (LIVE)
- Admin user provisioning (CRUD, soft-delete preserving evidence)
- Bulk CSV import (up to 1000 users, atomic, email invitations)
- Profile management (name, avatar 2MB limit, notification preferences)
- Admin impersonation mode (read-only, 30-min auto-expiry, audit logged)

### 5.3 Program & Course Management (LIVE)
- Program CRUD with coordinator assignment
- Course CRUD with teacher assignment, semester scoping
- Course sections (A, B, C) sharing CLOs with separate enrollments
- Student enrollment (active, completed, dropped states)
- Department management, semester management with date ranges

### 5.4 OBE Engine — The Compliance Core (LIVE)
- ILO/PLO/CLO Management with Bloom's Taxonomy tagging, drag-reorder, audit logging
- Sub-CLOs for granular skill tracking
- Outcome Mappings with weighted relationships (0-1.0), weight sum validation
- Rubric Builder: per-CLO rubrics, criteria × performance levels, reusable templates
- Assignment Creation: CLO-linked (1-3 CLOs with weights), rubric-linked, due dates, late windows
- Student Submission with file upload, late flagging, XP on submit
- Rubric-Based Grading: click-to-grade, auto-score, per-criterion feedback
- Automatic Evidence Generation: immutable append-only records (<500ms)
- Outcome Attainment Rollup: CLO → PLO → ILO weighted aggregation (<500ms)
- Curriculum Matrix: PLO × Course grid with color-coded attainment, CSV export
- Accreditation Report Export: PDF generation (jspdf), configurable templates (ABET/HEC/AACSB)
- Course File Generation, CQI Action Plans

### 5.5 Gamification Engine — The Engagement Core (LIVE)
- XP System: 11+ XP sources (login, submission, grading, journal, streaks, quizzes, study sessions, etc.)
- Adaptive XP Engine: dynamic adjustment based on level, difficulty, diminishing returns
- Streak System: multi-layered recovery (Comeback Challenge, Sabbatical, Streak Freeze)
- Badge System: standard, mystery, tiered (Bronze/Silver/Gold), Badge Spotlight, team badges
- Level System: 20 levels, progressive thresholds, full-screen level-up animations
- Leaderboard System: individual, Personal Best, Most Improved, League Tiers, Percentile Bands, Team Leaderboard
- Daily Habits: 4 academic habits with graduated difficulty levels (BJ Fogg), Perfect Day nudges

### 5.6 Habit Heatmap & Wellness (LIVE)
- Semester-long GitHub-style heatmap, 4 optional wellness habits (private by default)
- Habit Analytics Dashboard, correlation insights, level-aware rendering
- Streak recovery visualization, wellness micro-guidance, exportable reports

### 5.7 AI Co-Pilot (LIVE)
- Personalized Module Suggestions, At-Risk Early Warning, AI Feedback Drafts, AI Feedback Flywheel

### 5.8 AI Chat Tutor with RAG (PLANNED)
- Conversational AI tutoring grounded in course materials via pgvector
- Multi-persona (Socratic Guide, Step-by-Step Coach, Quick Explainer)
- Autonomy levels L1-L3, academic integrity guardrails, independence nudges
- Source citations, teacher handoff, learning plan updates
- Rate limiting: 50 messages/day, 50K tokens/day per student

### 5.9 Adaptive Quiz Generation (LIVE)
- AI-powered question generation via RAG, teacher review/approval workflow
- Per-student adaptive difficulty, Item Response Theory calibration
- Bloom's Climb mechanic, Mastery Recovery Pathways, Practice Mode
- AI explanation confidence indicators, post-quiz review with AI explanations

### 5.10 Student Onboarding & Profiling (LIVE)
- Progressive profiling: Day 1 minimal (7 questions, <3 min) → micro-assessments over 2 weeks
- Big Five, VARK (self-awareness only), Self-Efficacy Scale, Study Strategy Inventory
- Baseline diagnostic tests, AI-generated Starter Week Plan, SMART goal suggestions

### 5.11 Weekly Planner & Today View (LIVE)
- PDCR cycle, Focus Mode (Pomodoro + custom timer), session evidence capture
- Session intent setting, flow state check-ins, spaced repetition scheduling
- Structured reflection templates, AI reflection synthesis, journal quality scoring

### 5.12 Team Challenges & Social Quests (LIVE)
- Teams (2-6 students), team XP/streaks/badges, Social Challenges (4 types)
- Contribution accountability, Cooperation Score, Peer Teaching Moments
- AI-powered Team Health Monitoring

### 5.13 XP Marketplace & Virtual Economy (PLANNED)
- Virtual Wallet, 3 item categories (Cosmetic, Educational Perks, Power-ups)
- Dynamic pricing, XP Economist dashboard, Knowledge Quests, Mystery Reward Boxes

### 5.14 i18n & RTL Support (LIVE)
- Full Arabic/English bilingual, RTL layout, bilingual entity content
- Cognitive accessibility, neurodivergent support (dyslexia font, reduced animations)

### 5.15 Institutional Management (LIVE)
- Semesters, course sections, surveys, CQI, course file generation
- Announcements, course modules/materials, discussion forums, attendance
- Quiz/exam module, gradebook, calendar, timetable, departments
- Academic calendar, transcripts, parent portal, fee management
- Graduate attributes, competency frameworks

### 5.16 Advanced Visualizations (LIVE)
- Sankey diagram, coverage heatmap, gap analysis, cohort comparison, semester trends

### 5.17 Platform Infrastructure (LIVE)
- Global search (Cmd+K), dark mode, PWA, offline resilience, draft auto-save
- Notification system (real-time + email + batching), audit logging, activity logging
- Rate limiting, image compression, GDPR data export, session management

---

## 6. DATABASE SCHEMA OVERVIEW

### Core Tables (30+)
`institutions`, `profiles`, `programs`, `courses`, `student_courses`, `learning_outcomes`, `outcome_mappings`, `rubrics`, `rubric_criteria`, `assignments`, `submissions`, `grades`, `evidence`, `outcome_attainment`, `student_gamification`, `badges`, `xp_transactions`, `journal_entries`, `habit_logs`, `wellness_habit_logs`, `notifications`, `audit_logs`, `student_activity_log`, `ai_feedback`, `bonus_xp_events`, `semesters`, `departments`, `course_sections`, `surveys`, `quizzes`, `quiz_attempts`, `question_bank`, `question_analytics`, `teams`, `team_members`, `social_challenges`, `challenge_progress`, `study_sessions`, `planner_tasks`, `weekly_goals`, `session_evidence`, `student_profiles`, `onboarding_responses`, `baseline_attainment`, and more.

### Key Design Decisions
1. Unified outcome table — ILOs, PLOs, CLOs share one table discriminated by `type`
2. Immutable evidence — Append-only, never updated or deleted
3. XP ledger pattern — Every change is a transaction record; `xp_total` is materialized sum
4. RLS on ALL tables — Security enforced at database layer
5. Single-tenant with RLS — One Supabase project, institution isolation via RLS

---

## 7. SECURITY ARCHITECTURE

- Row Level Security on every table (no exceptions)
- JWT verification on all API endpoints
- FERPA & GDPR compliance design
- Input validation with Zod (client + server)
- Rate limiting: 5 login attempts/15 min per IP; 100 read/30 write per min on Edge Functions
- Edge Function secrets management (never client-side)
- No student PII sent to LLM providers
- Audit trail for all admin actions
- Dependency vulnerability scanning (Dependabot + Snyk)

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### Performance
| Metric | Target |
|--------|--------|
| Dashboard load (4G, cold cache) | ≤ 1.5s |
| Evidence rollup | ≤ 500ms |
| API response p95 | ≤ 300ms |
| Concurrent users | 5,000 without degradation |
| AI Tutor first token | ≤ 3s |

### Reliability
| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| RTO | < 4 hours |
| RPO | < 1 hour |
| Graceful degradation | AI features degrade; core OBE never blocked |

---

## 9. SUCCESS METRICS & KPIs

### Product Health
| Metric | Target |
|--------|--------|
| Student DAU/MAU Ratio | ≥ 60% |
| Average Session Length | ≥ 8 minutes |
| 7-Day Streak Continuation | ≥ 40% |
| On-Time Submission Rate | ≥ 75% |
| Evidence Coverage | 100% of graded assignments |
| Student NPS | ≥ 40 |
| Teacher NPS | ≥ 30 |

### Business KPIs
| Metric | Target |
|--------|--------|
| Institutions Onboarded | 5 in year 1 |
| Student MAU | 10,000 by end of year 1 |
| Institution Churn Rate | < 10% annually |

---

## 10. RELEASE ROADMAP — Qatar Market Launch

Starting April 2026, targeting Qatar higher education market readiness within 6 months.

| Phase | Timeline | Focus | Key Deliverables | Exit Criteria |
|-------|----------|-------|------------------|---------------|
| Alpha (Internal) | Apr 2026 | Backend stability & end-to-end testing | Full backend integration testing, RLS policy audit, Edge Function load testing, database migration validation, seed data for all roles, CI/CD pipeline hardening | All 25+ Edge Functions passing, zero critical RLS gaps, <500ms evidence rollup under load |
| Design & Market Prep | May 2026 | UI/UX polish for Qatar market | Arabic RTL layout finalization, Qatar-specific accreditation templates (QU/CNA-Q), design system audit against Figma, responsive testing across devices, accessibility compliance pass | RTL parity with LTR, all pages passing responsive screenshots, Arabic translations reviewed by native speaker |
| Pilot v1 | Jun 2026 | First institutional deployment | Deploy to 1 Qatar university (1-2 departments, 200-500 students), onboard admin/coordinator/teacher users, collect structured feedback via in-app surveys, monitor performance metrics | Pilot institution actively using OBE + gamification core, feedback collected from all 4 roles |
| Iteration | Jul 2026 | Feedback-driven refinement | Address top 10 pilot feedback items, performance optimization based on real usage data, UX friction points resolved, Arabic translation corrections, teacher training materials created | Pilot institution satisfaction score ≥ 7/10, critical feedback items resolved |
| Pilot v2 (Revised) | Aug 2026 | Expanded pilot with AI features | Expand to 2-3 departments (1,000-2,000 students), enable AI Co-Pilot features (at-risk, suggestions, feedback drafts), activate adaptive quizzes, stress test Realtime at scale | AI features operational, system stable at 2,000 concurrent users, teacher adoption rate ≥ 60% |
| Beta | Sep 2026 | Pre-production hardening | Security penetration testing, GDPR/data residency compliance audit, disaster recovery drill, load testing at 5,000 concurrent users, SLA documentation, onboarding 2nd pilot institution | Passing security audit, documented SLA, 2 institutions live, <1% error rate |
| Licensing & Contracts | Oct 2026 | Commercial readiness | Finalize pricing model, prepare institutional licensing agreements, SLA contracts, data processing agreements (DPA), support tier definitions, sales collateral | Signed contracts with pilot institutions, pricing validated |
| Full-Scale Deployment | Nov 2026 | Production launch | Full rollout to contracted institutions, 24/7 monitoring setup, support ticketing system, onboarding playbook for new institutions, marketing for Qatar/GCC expansion | 3-5 institutions live, support SLA operational, pipeline for next 10 institutions |

### Parallel Scalability Track (Running Alongside Pilots)
| Month | Scalability Work |
|-------|-----------------|
| May-Jun | Database indexing optimization, connection pooling (PgBouncer), materialized views for dashboards |
| Jul-Aug | Redis integration for leaderboard caching, CDN optimization, Edge Function cold-start reduction |
| Sep-Oct | Multi-region Supabase evaluation, read replica setup for analytics, automated backup verification |
| Nov onward | Architecture review for 50+ institution scale, evaluate dedicated compute tiers |

---

## 11. SCALABILITY COST ANALYSIS

### Option A: Current Stack (Supabase + Vercel) — Realistic Monthly Costs

All prices based on published pricing as of April 2026. Sources: [supabase.com/pricing](https://supabase.com/pricing), [vercel.com/pricing](https://vercel.com/pricing), [openrouter.ai](https://openrouter.ai), [resend.com/pricing](https://resend.com/pricing), [openai.com/api/pricing](https://openai.com/api/pricing), [github.com/pricing](https://github.com/pricing).

| Scale Tier | Users | Supabase | Vercel | AI (LLM) | AI (Embeddings) | Email (Resend) | Monitoring | Dev Tooling | Total/mo |
|------------|-------|----------|--------|-----------|-----------------|----------------|------------|-------------|----------|
| Pilot (1 institution) | 500 | $25 (Pro) + $25 compute = $50 | $20 (Pro) | $60-80 | $2-5 | $20 (Pro: 50K/mo) | $29 (Sentry) | $344 | ~$525-548 |
| Early Growth (3 institutions) | 2,000 | $25 + $50 compute + $20 storage = $95 | $20 + ~$30 overages = $50 | $150-250 | $10-20 | $20 (Pro: 50K emails) | $29 | $344 | ~$700-810 |
| Growth (10 institutions) | 10,000 | $599 (Team) + $100 compute = $699 | $20 + ~$80 overages = $100 | $400-700 | $30-50 | $90 (Scale: 100K emails) | $29 | $344 | ~$1,694-2,014 |
| Scale (30 institutions) | 30,000 | $599 + $300 compute + $50 storage = $949 | $100 + ~$150 overages = $250 | $1,000-1,800 | $80-120 | $90 + overages = $150 | $79 (Sentry Team) | $344 | ~$2,894-3,694 |
| Enterprise (50+ institutions) | 50,000+ | Enterprise (custom, est. $2,000-3,500) | Enterprise (custom, est. $500-1,000) | $2,500-4,000 | $150-250 | $200-400 | $79 | $344 | ~$5,775-9,575 |

#### Development Tooling Costs (Fixed Monthly)
| Tool | Plan | Cost/mo | Purpose |
|------|------|---------|---------|
| Claude Code (Anthropic) | Max plan | $200 | AI-assisted code generation, refactoring, debugging, and architecture decisions |
| GitHub Enterprise Cloud | 2 users ($21/user) | $42 | Source control, CI/CD, advanced security, includes Copilot |
| CodeRabbit | Pro (per seat) | $19 | Automated PR code review with AI — catches bugs, security issues, and style violations before merge |
| Figma | Professional (2 editors) | $30 ($15/editor) | UI/UX design, component library, design-to-code handoff, responsive prototyping |
| Postman | Basic (1 seat) | $14 | API testing, collection management, automated test suites for Edge Functions |
| Kiro IDE | Max | $39 | Spec-driven development, steering files, agent hooks, MCP powers for CI automation |
| **Dev Tooling Subtotal** | | **$344** | |

Note: Sentry ($29/mo) is counted in the Monitoring column of the main cost table, not in Dev Tooling. Dev tooling costs are fixed regardless of user count. At pilot stage they represent ~63% of total spend, but at 10K+ users they drop to under 18% — a healthy ratio for a product-led engineering team. These tools directly reduce the need for additional engineering hires by accelerating development velocity 3-5x.

#### AI Cost Breakdown (Per 10,000 Active Students/Month)
| AI Feature | Model | Est. Token Usage/mo | Cost/mo |
|------------|-------|---------------------|---------|
| At-Risk Predictions | GPT-4o via OpenRouter ($2.50/$10 per 1M tokens) | ~20M input + 4M output tokens | $90.00 |
| Module Suggestions | GPT-4o | ~15M input + 3M output | $67.50 |
| Feedback Drafts | GPT-4o | ~40M input + 10M output | $200.00 |
| Quiz Generation | GPT-4o | ~20M input + 5M output | $100.00 |
| AI Tutor (when live) | GPT-4o / DeepSeek | ~100M input + 25M output | $500.00 |
| Embeddings (RAG) | text-embedding-3-small/large ($0.02-$0.13/1M tokens) | ~50-150M tokens | $1.00-$19.50 |
| **Total AI per 10K students** | | | **~$958-977/mo** |

Note: DeepSeek models via OpenRouter are significantly cheaper (~$0.14/$0.28 per 1M tokens) and can reduce AI Tutor costs by 80-90% with acceptable quality for educational use cases.

#### Supabase Cost Details
- Pro plan: $25/mo base + usage overages
- Team plan: $599/mo (SOC2, SSO, priority support — needed for enterprise clients)
- Compute add-ons: $50-300/mo depending on instance size (2 vCPU/4GB RAM = ~$50, 4 vCPU/8GB = ~$100)
- Storage: $0.021/GB beyond included 100GB (Pro) or 200GB (Team)
- Bandwidth: $0.09/GB beyond included 250GB
- Edge Function invocations: 2M included, then $2 per 1M
- Realtime: 500 concurrent connections on Pro, 1,000 on Team

#### Vercel Cost Details
- Pro plan: $20/user/mo with $20 monthly credit
- Bandwidth: 1TB included, then $0.15/GB
- Serverless function execution: 1,000 GB-hours included
- Edge requests: 10M included

---

### Option B: Industry-Standard Stack (AWS/GCP) — Realistic Monthly Costs

This option replaces Supabase with self-managed AWS services and Vercel with AWS Amplify or CloudFront + S3.

| Component | AWS Service | Pilot (500 users) | Growth (10K users) | Scale (30K users) | Enterprise (50K+) |
|-----------|-------------|-------------------|--------------------|--------------------|-------------------|
| Database | RDS PostgreSQL (db.t3.medium → db.r6g.xlarge) | $70 | $350 | $700 | $1,400 |
| Auth | Cognito | $0 (50K MAU free) | $0 | $275 (beyond free tier) | $550 |
| API Layer | API Gateway + Lambda | $5 | $50 | $150 | $400 |
| Realtime | AppSync / IoT Core | $20 | $100 | $250 | $500 |
| File Storage | S3 + CloudFront | $5 | $30 | $80 | $200 |
| Frontend Hosting | Amplify / CloudFront + S3 | $5 | $30 | $60 | $120 |
| Cron/Scheduling | EventBridge + Lambda | $2 | $10 | $25 | $50 |
| Vector DB (RAG) | RDS pgvector or OpenSearch | $0 (same RDS) | $0 (same RDS) | $150 (OpenSearch) | $300 |
| Redis Cache | ElastiCache | $0 (not needed yet) | $50 | $100 | $200 |
| Monitoring | CloudWatch + X-Ray | $10 | $40 | $80 | $150 |
| Email | SES | $1 | $5 | $15 | $30 |
| AI (LLM) | Same OpenRouter/OpenAI | $80 | $400-700 | $1,000-1,800 | $2,500-4,000 |
| AI (Embeddings) | Same OpenAI | $5 | $40 | $100 | $200 |
| DevOps Overhead | Engineer time (est.) | $0 (founder) | $2,000-4,000 | $4,000-6,000 | $6,000-10,000 |
| Dev Tooling | Same as Option A | $331 | $331 | $331 | $331 |
| **Total/mo** | | **~$532** | **~$3,432-5,632** | **~$7,032-10,032** | **~$12,432-18,432** |

Note: AWS costs exclude the DevOps engineering time required to manage infrastructure, which is the hidden cost. At growth stage, you need at least a part-time DevOps engineer ($2,000-4,000/mo) that Supabase's managed services eliminate.

---

### Option A vs Option B: Head-to-Head Comparison

| Dimension | Option A: Supabase + Vercel | Option B: AWS Self-Managed | Winner |
|-----------|---------------------------|---------------------------|--------|
| **Pilot Cost (500 users)** | ~$525/mo | ~$530/mo | Tie |
| **Growth Cost (10K users)** | ~$1,850/mo | ~$4,530/mo (incl. DevOps) | Option A |
| **Scale Cost (30K users)** | ~$3,260/mo | ~$8,530/mo (incl. DevOps) | Option A |
| **Enterprise Cost (50K+)** | ~$7,660/mo | ~$15,430/mo (incl. DevOps) | Option A |
| **Time to Market** | Weeks (managed services) | Months (infrastructure setup) | Option A |
| **DevOps Burden** | Near-zero (managed) | High (1-2 engineers needed at scale) | Option A |
| **RLS Security Model** | Native PostgreSQL RLS | Must implement in application layer | Option A |
| **Realtime** | Built-in (Phoenix Channels) | Must build (AppSync/IoT Core) | Option A |
| **Auth** | Built-in (GoTrue) | Cognito (more complex, less flexible) | Option A |
| **Vendor Lock-in** | Moderate (Supabase is open-source, can self-host) | Low (AWS services are replaceable) | Option B |
| **Max Scalability Ceiling** | ~100K users before architectural changes | Virtually unlimited | Option B |
| **Multi-Region** | Limited (Supabase regions: US, EU, SG, AP) | Full global coverage | Option B |
| **Compliance Certifications** | SOC2 (Team plan), HIPAA (Enterprise) | SOC2, HIPAA, FedRAMP, ISO 27001 | Option B |
| **Database Control** | Managed (limited tuning) | Full control (instance types, IOPS, replicas) | Option B |
| **Edge Functions** | Deno runtime (limited ecosystem) | Lambda (Node.js, Python, full ecosystem) | Option B |
| **Hiring Pool** | Smaller (Supabase-specific knowledge) | Massive (AWS is industry standard) | Option B |
| **Disaster Recovery** | Managed backups + PITR | Full control (cross-region, custom RPO) | Option B |

---

### Recommendation for Edeviser

**Stay with Option A (Supabase + Vercel) through the first 30-50 institutions.** Here's why:

1. **Cost efficiency at your stage is critical.** At 10K users, Option A costs ~$1,850/mo vs ~$4,530/mo for AWS. That's $32K/year saved — meaningful for a pre-revenue startup.

2. **Speed to market matters more than theoretical scale.** You're targeting Qatar pilot in June 2026. Rebuilding on AWS would add 3-4 months of infrastructure work with zero product progress.

3. **Supabase's RLS is your competitive advantage.** Your entire security model is built on PostgreSQL RLS policies. Migrating to AWS means reimplementing this in application code — a massive regression risk.

4. **The scalability ceiling is far away.** Supabase Pro/Team handles 50K+ users comfortably. You won't hit architectural limits until 100K+ concurrent users across 50+ institutions — likely 2-3 years out.

5. **Exit strategy exists.** Supabase is open-source. If you outgrow managed Supabase, you can self-host the same PostgreSQL + GoTrue stack on AWS/GCP without rewriting application code. This is the best of both worlds.

**When to migrate to AWS:** When you have 50+ institutions, $500K+ ARR, and can afford a dedicated DevOps team (2-3 engineers). At that point, the cost savings from AWS reserved instances and the compliance requirements of enterprise clients will justify the migration investment.

### Constructive Criticism of Current Architecture

**What's working well:**
- RLS-first security model is genuinely strong and rare in EdTech
- BaaS approach eliminated months of backend boilerplate
- Edge Functions handle complex logic without a separate API server
- The evidence immutability pattern is accreditation-grade

**What needs honest attention:**

1. **Single Supabase project is a ticking clock.** RLS-based multi-tenancy works, but a single PostgreSQL instance means one bad query from one institution can degrade performance for all. Plan the sharding strategy before you hit 20 institutions, not after.

2. **Edge Functions on Deno are a hiring risk.** Most backend engineers know Node.js/Python, not Deno. As you grow the team, this becomes a friction point. Consider whether critical Edge Functions should be migrated to standard Node.js Lambda functions.

3. **Supabase Realtime has a connection ceiling.** 500 concurrent connections on Pro, 1,000 on Team. With 10,000 students online simultaneously (exam period), you'll hit this. Plan a fallback polling strategy and test it under load.

4. **AI costs will surprise you.** The AI Tutor alone at 10K active students could cost $1,000-2,000/mo. With 50K students, that's $5,000-10,000/mo in LLM API costs. Aggressively cache responses, use cheaper models (DeepSeek) for routine queries, and implement strict rate limiting from day one.

5. **No backend API versioning.** PostgREST auto-generates APIs from your schema. When you change a column name, every client breaks simultaneously. As you onboard multiple institutions on different update cycles, this becomes a deployment risk. Consider a thin API layer for critical endpoints.

6. **The feature surface area is enormous.** 17+ feature modules, 25+ Edge Functions, 30+ database tables. For a startup, this is a lot of surface area to maintain and test. Be ruthless about which features are truly needed for the Qatar pilot vs. which are nice-to-have.

---

## 12. RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Teacher adoption resistance | High | High | Reduce friction; templates; training videos |
| Evidence rollup at scale | Medium | High | Index optimization; pre-aggregated views; load testing |
| Report format varies by body | High | Medium | Configurable templates; start with 2-3 formats |
| GDPR/FERPA data residency | Medium | High | Supabase region selection; DPA signing; legal review |
| Gamification gaming | Medium | Medium | XP caps; admin visibility; anomaly detection |
| Realtime stability at scale | Low | Medium | Fallback polling; graceful degradation |
| AI hallucinations | Medium | Medium | Human-in-the-loop; confidence thresholds; teacher confirmation |
| Insufficient AI training data | High | Medium | Activity Logger from day 1; rule-based fallbacks |
| AI cost overrun | Medium | High | Rate limiting; response caching; cheaper model fallbacks (DeepSeek) |
| Supabase single-project bottleneck | Medium | High | Monitor query performance; plan sharding at 20 institutions |

---

## 13. COMPETITIVE LANDSCAPE

### Direct Competitors
- Traditional LMS (Canvas, Blackboard, Moodle) — compliance bolt-ons, no gamification
- OBE-specific tools (Xitracs, AEFIS, Watermark) — compliance only, no engagement
- Gamification platforms (Classcraft, Kahoot) — engagement only, no OBE compliance

### Edeviser's Moat
1. **Dual-engine fusion** — Only platform where compliance generates engagement and vice versa
2. **Science-backed design** — 10 research pillars, not arbitrary gamification
3. **AI-native** — RAG-powered tutoring, adaptive quizzes, at-risk prediction built in
4. **Regional focus** — Arabic/Urdu RTL support, HEC/ABET compliance templates
5. **Burnout prevention** — Multi-layered streak recovery, graduated habits, league tiers

---

## 14. OPEN QUESTIONS FOR INVESTOR DISCUSSIONS

| # | Question | Status |
|---|----------|--------|
| 1 | Pricing model: per-student, per-institution, or seat-based? | Open |
| 2 | Which accreditation body format for v1.0? (ABET vs HEC vs AACSB vs CNA-Q) | Open |
| 3 | Data retention policy for evidence records (GDPR) | Open |
| 4 | Multi-tenant architecture transition point (50+ institutions) | Decided: RLS now, revisit later |
| 5 | SSO/OAuth integration timeline (Google Workspace, Azure AD) | Phase 2 |
| 6 | Mobile native app vs PWA strategy | PWA first |

---

## 15. ANSWERS TO COMMON INVESTOR QUESTIONS

### How does it make money?
SaaS subscription model (B2B). Pricing tiers TBD — likely per-institution with student count tiers. Revenue from: platform license, implementation/onboarding services, premium AI features.

### What's the unit economics outlook?
- Low marginal cost per student (Supabase scales well)
- AI costs: OpenRouter API usage (per-token, manageable with caching and rate limits)
- Infrastructure: Vercel + Supabase — predictable, usage-based pricing
- High retention expected due to accreditation lock-in (institutions can't easily switch mid-cycle)

### What's the data moat?
- Activity Logger collects behavioral data from day 1
- AI models improve with each institution's data
- Evidence chain creates switching costs (accreditation audit trail)
- Student profiles and learning analytics accumulate over semesters

### How do you handle data privacy?
- RLS on every table — security at database layer
- FERPA & GDPR compliance by design
- No PII sent to AI providers
- GDPR data export built in
- Audit trail for all admin actions
- Regional Supabase deployment options

### What's the realistic burn rate?
At pilot stage (500 users): ~$525/mo infrastructure + dev tooling (excluding team salaries). At 10K users: ~$1,850/mo. Dev tooling (Claude Code, GitHub Enterprise, CodeRabbit, Figma, Postman, Kiro) adds a fixed $344/mo but replaces the need for additional engineering hires — a single developer with these tools can maintain velocity equivalent to a 3-person team without them.

---

*Edeviser Product Team — April 2026*
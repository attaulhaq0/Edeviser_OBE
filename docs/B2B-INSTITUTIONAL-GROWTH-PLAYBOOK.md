---
pdf_options:
  format: A4
  margin: 25mm 20mm
---

<style>
h2, h3, h4 {
  page-break-after: avoid;
}
table {
  page-break-inside: avoid;
}
tr {
  page-break-inside: avoid;
}
p {
  page-break-inside: avoid;
}
h2 + *, h3 + *, h4 + * {
  page-break-before: avoid;
}
</style>

# Edeviser — B2B Institutional Growth Playbook
## Acquisition → Retention → Expansion Strategy (Product-Tied)

**Version:** 1.0 | **Date:** April 2026 | **Purpose:** Align product, GTM, and institutional strategy before Qatar market entry

---

## The Core Question This Document Answers

> How does Edeviser enter an institution, prove value quickly, become part of daily usage, and then expand across the system?

---

## 1. INSTITUTIONAL JOURNEY MAP

```
First Contact → Discovery Call → Course-Level Pilot (2 weeks) → Pilot Results Review
    → Department Expansion → Campus Rollout → Multi-Institution Referral
```

### Timeline Reality

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| First Contact → Discovery Call | 1–2 weeks | Decision-maker identified, pain confirmed |
| Discovery → Pilot Agreement | 2–4 weeks | 1 course, 1 teacher, 30–100 students committed |
| Pilot Setup | 3–5 days | Course structure uploaded, students onboarded |
| Pilot Running | 2–4 weeks | Daily usage data, engagement metrics, attainment evidence |
| Pilot Review → Department Decision | 2–4 weeks | Results presentation to department head/dean |
| Department Rollout | 1 semester | 5–15 courses, multiple teachers |
| Campus Rollout | 1–2 semesters | Admin dashboard live, accreditation reports generated |

---

## 2. B2B ACQUISITION — How We Enter Institutions

### 2.1 Entry Points (Who We Talk To)

The university buying process has multiple stakeholders. The entry point depends on the institution's current pain:

| Entry Point | Their Pain | Our Wedge | Conversation Opener |
|-------------|-----------|-----------|-------------------|
| **Program Coordinator** (Primary) | Accreditation visit in 6–12 months, CLO-PLO mapping is in spreadsheets, no evidence trail | "Upload your course structure. We auto-generate the curriculum matrix and evidence chain." | "How long did your last accreditation report take to compile?" |
| **Department Head** | Low student engagement, high dropout in early semesters, no visibility into which courses are underperforming | "See which CLOs students are failing across your department — in real time, not at semester end." | "Do you know which courses have the lowest CLO attainment right now?" |
| **Quality Assurance / Admin** | Manual report compilation, data scattered across LMS + spreadsheets + faculty emails | "One-click accreditation report export with evidence citations." | "How many person-hours does your team spend preparing for accreditation?" |
| **Individual Teacher** (Bottom-up) | Grading is tedious, no feedback loop with students, OBE reporting feels like extra work | "Grade once with the rubric — evidence, CLO attainment, and student XP all happen automatically." | "What if grading an assignment also completed your OBE reporting?" |

**Primary target: Program Coordinator or QA Director.** They own the accreditation pain and have budget authority or direct access to the dean.

### 2.2 The Initial Wedge — Why They Adopt Us First

The wedge is NOT "we're a gamification platform." The wedge is:

> **"We eliminate the gap between grading and accreditation reporting."**

Every institution we're targeting (CNA-Q, ABET, HEC accredited) has the same problem: teachers grade in one system, then manually enter OBE data in another. Edeviser collapses this into one action.

**The hook sequence:**

1. **Pain recognition:** "Your teachers grade assignments, then separately fill out OBE compliance forms. That's double work."
2. **Instant value proposition:** "With Edeviser, the teacher grades using a rubric → evidence is auto-generated → CLO/PLO/ILO attainment updates instantly → accreditation report is one click away."
3. **Engagement bonus:** "And because students see their progress in real time — XP, streaks, skill bars — they actually engage more, which generates more evidence, which makes your accreditation data richer."

The gamification is the retention hook, not the acquisition hook. Institutions buy compliance automation. Students stay because of engagement.

### 2.3 Getting a Pilot Live in 1–2 Weeks

**Pilot scope:** 1 course, 1 teacher, 30–100 students, 2–4 weeks.

**Setup process (3–5 days):**

| Day | Action | Product Feature Used |
|-----|--------|---------------------|
| Day 1 | Admin account created, institution settings configured | Admin onboarding wizard, institution settings page |
| Day 1 | Teacher account created, assigned to course | User provisioning, course assignment |
| Day 2 | Teacher uploads/creates CLOs with Bloom's levels | CLO form with Bloom's verb guide |
| Day 2 | Teacher maps CLOs to PLOs (coordinator pre-maps PLOs to ILOs) | Outcome mappings with weight validation |
| Day 3 | Teacher creates 2–3 assignments with rubrics linked to CLOs | Assignment form, rubric builder |
| Day 3 | Students bulk-imported via CSV, enrolled in course | Bulk CSV import, course enrollment |
| Day 4 | Students complete onboarding (personality + learning style, <3 min) | Onboarding wizard (Day 1 minimal profile) |
| Day 5 | First assignment goes live, students start submitting | Assignment list, submission flow, XP awards |

**What makes this fast:**
- No infrastructure setup needed (SaaS, Supabase-hosted)
- Bulk CSV import handles student provisioning in minutes
- Rubric templates reduce teacher setup time
- Student onboarding is 7 questions, under 3 minutes
- Arabic/English bilingual from day 1 (critical for Qatar)

### 2.4 Pilot Success Criteria (What We Measure)

| Metric | Target | How We Measure | Product Feature |
|--------|--------|---------------|-----------------|
| Student daily login rate | >50% of enrolled students | Activity logger + admin dashboard | `student_activity_log` events |
| On-time submission rate | >70% | Submission timestamps vs due dates | Assignment submission tracking |
| Average streak length | >5 days | Streak system data | Streak display, gamification engine |
| Teacher grading turnaround | <48 hours | Grade timestamp vs submission timestamp | Grading interface analytics |
| Evidence coverage | 100% of graded assignments | Evidence table completeness | Automatic evidence generation |
| CLO attainment visibility | Real-time for all stakeholders | Curriculum matrix, student dashboard | Attainment rollup, CLO progress bars |

**The killer metric for the decision-maker:** "In 2 weeks, you have a live curriculum matrix with real attainment data — something that used to take a semester of manual data collection."

---

## 3. RETENTION — Why They Continue After Pilot

### 3.1 The Three Dependency Layers

Retention isn't about one feature. It's about creating three layers of dependency that make switching painful:

#### Layer 1: Data Gravity (Institutional)
Once an institution has a semester of evidence records, CLO-PLO-ILO mappings, and attainment data in Edeviser, migrating away means losing their accreditation evidence trail. Evidence records are immutable and append-only — they form a verifiable audit log that accreditation bodies can inspect.

**Product features creating data gravity:**
- Immutable evidence records (cannot be recreated elsewhere)
- Outcome attainment history (semester-over-semester trends)
- CQI action plans linked to attainment gaps
- Accreditation report templates pre-configured for their body (CNA-Q, ABET, etc.)
- Audit logs (compliance requirement)

#### Layer 2: Daily Habit Formation (Student)
Students who build streaks, earn badges, and track their XP don't want to lose progress. The gamification engine creates behavioral lock-in through:

**Product features creating habit dependency:**
- Streak system (losing a 30-day streak hurts — loss aversion)
- Badge collection (sunk cost of earned achievements)
- Level progression (Level 12 student won't start over at Level 1)
- Leaderboard position (social status within peer group)
- XP history (visible record of effort)
- Daily habit tracker (Login, Submit, Journal, Read — becomes routine)
- Team challenges (social accountability)

#### Layer 3: Workflow Integration (Teacher)
Teachers who adopt rubric-based grading with auto-evidence generation won't go back to manual OBE reporting. The time savings become expected, not optional.

**Product features creating workflow dependency:**
- Rubric-based grading → auto evidence (saves 30+ min per assignment per section)
- AI feedback drafts (saves 5–10 min per student per assignment)
- At-risk early warning (replaces manual student monitoring)
- Grading queue with real-time updates
- CLO attainment dashboard (replaces end-of-semester spreadsheet analysis)
- Adaptive quiz generation (replaces manual question creation)

### 3.2 Key Retention Signals to Monitor

| Signal | Healthy | At Risk | Action if At Risk |
|--------|---------|---------|-------------------|
| Teacher weekly active rate | >80% | <50% | 1:1 training session, identify friction points |
| Student DAU/MAU | >60% | <30% | Review gamification tuning, check if assignments are being created |
| Evidence generation rate | Matches grading rate 1:1 | Evidence gaps | Check if teachers are using rubric grading vs manual |
| Admin dashboard visits | Weekly | Monthly or never | Schedule quarterly review meeting, show report value |
| Streak continuation (7-day) | >40% of students | <20% | Review notification settings, check if streak risk alerts are enabled |
| Assignment creation rate | Steady or increasing | Declining | Teacher may be reverting to old LMS — intervene |

### 3.3 The Retention Flywheel

```
Teacher grades with rubric
    → Evidence auto-generated
    → Student sees CLO progress + earns XP
    → Student engages more (submissions, journal, habits)
    → More evidence generated
    → Richer attainment data for coordinator/admin
    → Better accreditation reports
    → Institution sees ROI
    → Renews contract
    → More courses onboarded
    → More teachers using rubric grading
    → Cycle accelerates
```

The flywheel only works if teachers are actively grading through the platform. Teacher adoption is the single most important retention lever.

---

## 4. SCALING — How We Expand

### 4.1 Expansion Path: 1 Course → Department → Campus → Network

#### Stage 1: Course → Department (Semester 1 → Semester 2)

**Trigger:** Pilot results show measurable improvement in student engagement and evidence coverage.

**Expansion motion:**
1. Present pilot results to department head: "Here's the curriculum matrix for Dr. [teacher]'s course. Every CLO has evidence. Student engagement was [X]% daily active. Here's what this looks like for your entire department."
2. Offer department-level pilot: 5–10 courses, all teachers in the department.
3. Coordinator gets access to cross-course PLO attainment view (curriculum matrix).

**Product features that drive department expansion:**
- Curriculum matrix (PLO × Course grid) — only valuable with multiple courses
- Cross-course CLO coverage heatmap — shows gaps across the department
- Coordinator dashboard — aggregated view that's meaningless with 1 course
- Gap analysis view — identifies which PLOs lack sufficient course coverage
- Sankey diagram — visualizes outcome flow across the program

**Key insight:** The coordinator dashboard is intentionally designed to be most valuable at department scale. A coordinator with 1 course sees a boring dashboard. A coordinator with 10 courses sees actionable intelligence. This creates natural pull for expansion.

#### Stage 2: Department → Campus (Semester 2 → Semester 3)

**Trigger:** Department-level attainment data impresses the dean or QA director. Accreditation visit is approaching.

**Expansion motion:**
1. Admin gets access to institution-wide dashboard: "Here's your PLO attainment across all programs. Here's your accreditation report — one click."
2. Other department heads see the pilot department's results and request access.
3. Admin approves campus-wide rollout.

**Product features that drive campus expansion:**
- Admin dashboard with institution-wide KPIs
- Accreditation report export (PDF, configurable for CNA-Q/ABET/HEC)
- Cross-program comparison analytics
- Cohort comparison and semester trends
- Graduate attribute tracking
- Competency framework alignment
- Audit logs (institution-wide compliance)

#### Stage 3: Campus → Multi-Institution (Year 2+)

**Trigger:** Published case study, word-of-mouth in Qatar's small higher education community, accreditation body recognition.

**Expansion channels:**

| Channel | Mechanism | Product Tie-In |
|---------|-----------|---------------|
| Case study | Published results from pilot institution (engagement %, attainment improvement, time saved) | Admin dashboard exports, before/after metrics |
| Accreditation body referral | CNA-Q or ABET evaluators see Edeviser-generated reports during visits | Accreditation report templates matching body requirements |
| University network | Qatar's 12 universities are a tight community — QU success spreads to UDST, HBKU | Same product, new institution tenant |
| Conference presence | Present at regional EdTech/accreditation conferences | Live demo of curriculum matrix + student engagement |
| Faculty mobility | Teachers who move between institutions bring familiarity | Same UX, same workflow |

### 4.2 The Cluster Approach

Qatar has 12 universities and 30+ technical colleges in a single city (Doha). This is a cluster market — one success story reaches every decision-maker through:
- Shared accreditation bodies (CNA-Q covers most local institutions)
- Faculty who teach at multiple institutions
- Ministry of Education mandates that apply to all institutions
- Small community where QA directors know each other

**Strategy:** Win 1 institution convincingly → present at the next CNA-Q workshop → 3 institutions approach us.

### 4.3 Pricing That Encourages Expansion

| Tier | Students | Annual License | Per-Student Effective | Implementation |
|------|----------|---------------|----------------------|----------------|
| Starter (Pilot) | Up to 500 | $30K–50K | $60–100 | $10K |
| Growth | 500–2,000 | $50K–100K | $50–100 | $20K |
| Enterprise | 2,000+ | $100K–250K | $50–125 | $40K |

**Volume incentive:** Per-student cost decreases as the institution scales. A department paying $50K for 500 students ($100/student) sees the rate drop to $50/student at campus scale. This makes the CFO's expansion math easy.

---

## 5. PRODUCT → GROWTH MAPPING

### 5.1 What Drives Adoption (First 2 Weeks)

| Product Feature | Why It Drives Adoption | Time to Value |
|-----------------|----------------------|---------------|
| Bulk CSV import | 100 students onboarded in 2 minutes, not 2 days | Minutes |
| Rubric builder with templates | Teacher creates first assignment in 5 minutes | Minutes |
| Auto evidence generation | First grade → first evidence record → "this actually works" moment | Seconds after first grade |
| Curriculum matrix | Coordinator sees live CLO coverage — replaces weeks of spreadsheet work | After first 2–3 assignments graded |
| Student onboarding wizard | 7 questions, <3 min, personality + learning style profiled | Minutes |
| Arabic/English bilingual | No localization barrier for Qatar market | Immediate |
| Admin onboarding wizard | Guided setup: institution → programs → courses → users | 30 minutes |

### 5.2 What Drives Retention (Weeks 2–8)

| Product Feature | Why It Drives Retention | Dependency Created |
|-----------------|------------------------|-------------------|
| Streak system + streak freeze | Loss aversion — students protect their streaks | Behavioral habit |
| XP + levels + badges | Sunk cost — students won't abandon Level 12 progress | Achievement investment |
| Leaderboard (individual + team) | Social status — top 10% badge, league tiers | Peer competition |
| AI feedback drafts | Teacher saves 5–10 min per student — becomes expected | Workflow efficiency |
| At-risk early warning | Teacher catches struggling students 7 days earlier | Proactive intervention |
| Daily habit tracker | Login/Submit/Journal/Read becomes daily routine | Behavioral lock-in |
| Immutable evidence trail | Accreditation data accumulates — can't recreate elsewhere | Data gravity |
| CLO progress dashboard | Students see skill growth in real time — motivating | Self-regulated learning |
| Adaptive quizzes | Personalized difficulty keeps students in flow state | Engagement quality |
| Team challenges | Social accountability — teammates depend on each other | Social obligation |

### 5.3 What Drives Expansion (Month 2+)

| Product Feature | Why It Drives Expansion | Who It Convinces |
|-----------------|------------------------|-----------------|
| Curriculum matrix (multi-course) | Only valuable with 5+ courses — creates pull for department adoption | Coordinator |
| Admin dashboard (institution KPIs) | Only valuable with multiple departments — creates pull for campus rollout | Admin / Dean |
| Accreditation report export | One-click PDF with evidence citations — replaces weeks of manual work | QA Director |
| Cross-program comparison | "Which program has the lowest PLO attainment?" — actionable at scale | Department Head / Dean |
| Gap analysis view | Identifies curriculum holes across the program | Coordinator |
| Cohort comparison + semester trends | "Are students improving semester over semester?" | Admin / Accreditation body |
| Graduate attribute tracking | Maps outcomes to national qualification frameworks | QA Director |
| CQI action plans | Closing-the-loop documentation required by accreditation bodies | Coordinator |
| Course file generation | Auto-generated per course per semester — massive time saver at scale | Teacher / Coordinator |

---

## 6. INSTITUTIONAL JOURNEY — STEP BY STEP

### Step 1: First Contact
**Channel:** Direct outreach to QA director or program coordinator via LinkedIn/email, or referral from accreditation body workshop.

**Message framework:**
> "We noticed [Institution] is preparing for [CNA-Q/ABET] accreditation. We built a platform that eliminates the gap between grading and OBE reporting — teachers grade once, evidence is auto-generated, and your accreditation report is one click away. Would a 20-minute demo be useful?"

### Step 2: Discovery Call (20 min)
**Goal:** Confirm the pain, identify the decision-maker, propose a pilot.

**Questions to ask:**
1. "How do your teachers currently report CLO attainment?" (Confirms manual process)
2. "How long does it take to compile an accreditation report?" (Quantifies pain)
3. "What's your next accreditation visit timeline?" (Creates urgency)
4. "Would you be open to a 2-week pilot with one course to see the difference?" (Low commitment ask)

### Step 3: Demo (30 min)
**Show, don't tell. Live demo flow:**

1. Create a course with 3 CLOs (2 min) — show Bloom's verb guide
2. Map CLOs to PLOs (1 min) — show weight validation
3. Create an assignment with rubric (3 min) — show template reuse
4. Grade a submission using rubric (2 min) — show auto-evidence generation
5. Show curriculum matrix updating in real time (1 min) — the "aha" moment
6. Show student dashboard: XP earned, streak started, CLO progress bar (2 min)
7. Export accreditation report as PDF (1 min) — the closer
8. Show admin dashboard with institution KPIs (2 min) — paint the campus vision

**Total demo time: ~15 min, leaving 15 min for questions.**

### Step 4: Pilot Agreement
**Terms:** Free pilot, 1 course, 1 teacher, 30–100 students, 2–4 weeks. We handle setup. No contract, no commitment beyond the pilot period.

**What we need from them:** 1 willing teacher, student list (CSV), course CLOs, and 2–3 existing assignments they want to run through the platform.

### Step 5: Pilot Execution (2–4 weeks)
**Our involvement:**
- Day 1–3: Setup (we do it with the teacher)
- Day 7: Check-in call — review early metrics, address friction
- Day 14: Mid-pilot review — share engagement dashboard with coordinator
- Day 21–28: End-of-pilot presentation to decision-maker

### Step 6: Pilot Results Presentation
**Audience:** Department head, QA director, or dean.

**Presentation structure:**
1. Before/after comparison: manual OBE reporting time vs Edeviser
2. Student engagement metrics: DAU, streak data, submission rates
3. Evidence coverage: 100% of graded assignments have evidence records
4. Live curriculum matrix: "This is what your department could look like"
5. Accreditation report preview: "This took 1 click, not 2 weeks"
6. Proposal: Department-level rollout for next semester

### Step 7: Department Expansion
**Trigger:** Positive pilot results + upcoming accreditation visit.

**Onboarding:** Bulk teacher training (2-hour workshop), bulk student import, coordinator access to curriculum matrix.

### Step 8: Campus Rollout
**Trigger:** Department success + admin seeing institution-wide value.

**New capabilities unlocked:** Admin dashboard, cross-program analytics, accreditation report export, audit logs, graduate attribute tracking.

### Step 9: Renewal & Referral
**Trigger:** End of first year, accreditation visit completed successfully using Edeviser data.

**Referral mechanism:** Case study published, presented at CNA-Q workshop, shared with peer institutions.

---

## 7. COMPETITIVE MOAT SUMMARY

| Moat Layer | What It Is | Why Competitors Can't Easily Replicate |
|------------|-----------|---------------------------------------|
| Dual-engine fusion | Compliance + engagement in one feedback loop | Competitors are either OBE tools (boring) or gamification tools (no compliance). Fusing them requires deep domain knowledge of both. |
| Immutable evidence trail | Append-only, auditable evidence records | Once an institution has 2 semesters of evidence, switching means losing their audit trail. |
| Behavioral lock-in | Streaks, XP, badges, levels, leaderboards | Students resist losing progress. Teachers resist losing workflow efficiency. |
| Accreditation-body alignment | Templates for CNA-Q, ABET, HEC, AACSB | Each template requires understanding the specific body's requirements. First-mover advantage in Qatar. |
| Cluster market dynamics | Qatar = 12 universities in 1 city | Win 2–3 and word-of-mouth does the rest. First mover in a small, connected market. |

---

## 8. RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| University procurement cycles are slow (3–6 months) | High | High | Pilot-first approach bypasses procurement — pilot is free, no contract needed |
| Teachers resist new tools | High | High | Reduce friction to near-zero: grade with rubric = done. AI drafts feedback. No extra OBE form. |
| Students don't engage with gamification | Medium | Medium | Gamification is the bonus, not the pitch. Core value is compliance automation. If students don't engage, institution still gets OBE value. |
| Competitor enters Qatar market | Low (short-term) | High | Speed advantage — we're production-ready now. Competitors need 12+ months to build equivalent OBE + gamification fusion. |
| Accreditation body changes requirements | Medium | Medium | Configurable report templates. CQI module adapts to new standards. |
| Pilot institution doesn't convert to paid | Medium | High | Ensure pilot demonstrates clear ROI (time saved, evidence generated). Target institutions with imminent accreditation visits. |

---

*Edeviser — April 2026*

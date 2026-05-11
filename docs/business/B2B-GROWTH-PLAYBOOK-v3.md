---
pdf_options:
  format: A4
  margin: 18mm 16mm 22mm 16mm
  headerTemplate: '<div style="width:100%;font-size:7.5px;color:#94A3B8;padding:0 18mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>Edeviser — B2B Institutional Growth Playbook</span><span>Confidential</span></div>'
  footerTemplate: '<div style="width:100%;font-size:7.5px;color:#94A3B8;padding:0 18mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>© 2026 Edeviser. All rights reserved.</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
  displayHeaderFooter: true
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800;900&display=swap');

:root {
  --teal: #13BFA6;
  --teal-dark: #0E9C87;
  --blue: #1F6FEB;
  --navy: #0B1220;
  --ink: #1A2332;
  --mute: #6B7280;
  --teal-soft: #ECFDF5;
  --blue-soft: #EFF6FF;
  --grey-soft: #F8FAFC;
  --border: #E2E8F0;
  --grad-tb: linear-gradient(93.65deg, #13BFA6 5%, #1F6FEB 79%);
  --grad-hero: linear-gradient(135deg, #0B1220 0%, #1e3a5f 40%, #1F6FEB 70%, #13BFA6 100%);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
  --shadow-card: 0 2px 8px rgba(19,191,166,0.08), 0 1px 3px rgba(0,0,0,0.06);
}

* { font-family: 'Noto Sans', system-ui, sans-serif; color: var(--ink); margin: 0; }
body { background: #fff; line-height: 1.55; font-size: 12px; }

/* === PAGE BREAK CONTROL === */
h2, h3, h4 { page-break-after: avoid; }
tr { page-break-inside: avoid; }
.callout, .hero-banner, .card-row, .stat-row { page-break-inside: avoid; }

/* === COVER === */
.cover {
  page-break-after: always; height: 88vh;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center; padding: 32px;
  background: radial-gradient(ellipse at 30% 20%, rgba(19,191,166,0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(31,111,235,0.04) 0%, transparent 50%);
}
.cover-logo { width: 200px; margin-bottom: 20px; border-radius: 8px; }
.cover-badge {
  display: inline-block; background: var(--grad-tb); color: white;
  font-size: 8px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
  padding: 5px 18px; border-radius: 20px; margin-bottom: 20px;
}
.cover h1 { font-size: 36px; font-weight: 900; color: var(--navy); line-height: 1.15; margin: 0 0 10px 0; }
.cover h1 span { background: var(--grad-tb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.cover-sub { font-size: 13px; color: var(--mute); font-weight: 500; max-width: 460px; margin: 0 auto 20px; line-height: 1.5; }
.cover-line { width: 60px; height: 3px; background: var(--grad-tb); border-radius: 2px; margin: 16px auto; }
.cover-meta { display: flex; gap: 28px; justify-content: center; margin-top: 16px; }
.cover-meta-item { text-align: center; }
.cover-ml { font-size: 8px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--teal); display: block; margin-bottom: 3px; }
.cover-mv { font-size: 12px; font-weight: 600; color: var(--navy); }

/* === TYPOGRAPHY === */
h2 {
  font-size: 20px; font-weight: 800; color: var(--navy);
  margin: 0 0 4px 0; padding-bottom: 6px;
  border-bottom: 3px solid var(--teal); display: inline-block;
}
h3 { font-size: 14px; font-weight: 700; color: var(--navy); margin: 14px 0 5px 0; }
h4 { font-size: 12px; font-weight: 700; color: var(--ink); margin: 10px 0 4px 0; }
p { margin: 4px 0; }

/* === SECTION LABEL === */
.sl { font-size: 8px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--teal); margin-bottom: 2px; display: block; }

/* === NEW SECTION (page break) === */
.ns { page-break-before: always; padding-top: 2px; }
.ns-sub { font-size: 12px; color: var(--mute); max-width: 560px; margin: 2px 0 10px 0; }

/* === SOFT DIVIDER === */
.divider { height: 1px; background: linear-gradient(90deg, var(--teal), var(--border), transparent); margin: 12px 0; opacity: 0.5; }

/* === STAT TILES === */
.sr { display: flex; gap: 10px; margin: 12px 0; flex-wrap: wrap; }
.st {
  flex: 1; min-width: 110px; background: white; border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 10px; text-align: center;
  box-shadow: var(--shadow-sm); position: relative; overflow: hidden;
}
.st::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--grad-tb); }
.st-v { font-size: 24px; font-weight: 900; color: var(--navy); line-height: 1.1; }
.st-l { font-size: 8px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--mute); margin-top: 3px; }

/* === CARDS === */
.cr { display: flex; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
.cd {
  flex: 1; min-width: 150px; background: white; border: 1px solid var(--border);
  border-radius: 12px; padding: 14px; box-shadow: var(--shadow-card);
  position: relative; overflow: hidden;
}
.cd::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--grad-tb); opacity: 0.6; }
.cd-h { font-size: 8px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--teal); margin-bottom: 4px; }
.cd-t { font-size: 16px; font-weight: 800; color: var(--navy); margin-bottom: 3px; }
.cd-b { font-size: 11px; color: var(--mute); line-height: 1.45; }
.cd-f { background: var(--grad-tb); border-color: transparent; box-shadow: var(--shadow-md); }
.cd-f::before { display: none; }
.cd-f .cd-h, .cd-f .cd-t, .cd-f .cd-b { color: white; }

/* === HERO BANNER === */
.hb {
  background: var(--grad-hero); border-radius: 12px; padding: 20px 22px;
  color: white; margin: 12px 0; box-shadow: var(--shadow-lg);
  position: relative; overflow: hidden;
}
.hb::after {
  content: ''; position: absolute; top: -30px; right: -30px; width: 120px; height: 120px;
  background: radial-gradient(circle, rgba(19,191,166,0.15) 0%, transparent 70%); border-radius: 50%;
}
.hb h3 { color: white; font-size: 16px; margin: 0 0 6px 0; position: relative; z-index: 1; }
.hb p { color: rgba(255,255,255,0.8); font-size: 12px; margin: 0; position: relative; z-index: 1; line-height: 1.5; }

/* === TABLES === */
table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 10px 0; font-size: 11px; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); }
thead th {
  background: var(--navy); color: white; font-size: 8px; font-weight: 800;
  letter-spacing: 1.5px; text-transform: uppercase; padding: 7px 8px; text-align: left;
}
tbody td { padding: 6px 8px; border-bottom: 1px solid var(--border); }
tbody tr:nth-child(even) { background: var(--grey-soft); }
tbody tr:last-child td { border-bottom: none; }

/* === CALLOUTS === */
.co {
  background: var(--teal-soft); border-left: 3px solid var(--teal);
  border-radius: 0 8px 8px 0; padding: 10px 14px; margin: 10px 0; font-size: 11px;
  box-shadow: var(--shadow-sm); line-height: 1.5;
}
.co-b { background: var(--blue-soft); border-left-color: var(--blue); }
.co-o { background: #FFF7ED; border-left-color: #F97316; }
.co strong { color: var(--navy); }

/* === JOURNEY FLOW === */
.jf { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin: 12px 0; font-size: 10px; font-weight: 700; }
.js { background: white; border: 1px solid var(--border); border-radius: 6px; padding: 5px 10px; color: var(--navy); box-shadow: var(--shadow-sm); }
.js-a { background: var(--grad-tb); color: white; border-color: transparent; box-shadow: var(--shadow-md); }
.ja { color: var(--teal); font-size: 12px; font-weight: 900; }

/* === TIMELINE === */
.ti { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start; }
.td { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); margin-top: 3px; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(19,191,166,0.15); }
.tc { flex: 1; }
.tt { font-weight: 700; font-size: 12px; color: var(--navy); }
.tx { font-size: 10px; color: var(--mute); margin-top: 1px; line-height: 1.4; }

/* === LISTS === */
ul, ol { padding-left: 16px; margin: 4px 0; }
li { margin-bottom: 3px; font-size: 11px; line-height: 1.45; }

/* === TWO-COL === */
.tc2 { display: flex; gap: 16px; margin: 10px 0; }
.tc2 > div { flex: 1; }

/* === BLOCKQUOTE === */
blockquote { border-left: 3px solid var(--teal); background: var(--teal-soft); margin: 10px 0; padding: 10px 14px; border-radius: 0 8px 8px 0; font-style: italic; color: var(--navy); font-weight: 500; font-size: 11px; }

/* === FOOTER === */
.df { margin-top: 28px; padding-top: 12px; border-top: 2px solid var(--teal); text-align: center; font-size: 10px; color: var(--mute); }

/* ===== V3 PAGE-FIT OVERRIDES ===== */

/* S1: Compact target pipeline table to fit on page 3 */
.s1-pipeline table { font-size: 10px; margin: 6px 0; }
.s1-pipeline table tbody td { padding: 4px 6px; }
.s1-pipeline table thead th { padding: 5px 6px; }

/* TOC page: spread content to fill page */
.toc-page { padding-top: 2px; }
.toc-page .hb { margin-top: 24px; padding: 24px 26px; }
.toc-page .hb h3 { font-size: 18px; margin-bottom: 10px; }
.toc-page .hb p { font-size: 13px; line-height: 1.6; }
.toc-page table { margin: 14px 0; }
.toc-page table tbody td { padding: 9px 10px; font-size: 12px; }
.toc-page table thead th { padding: 10px 10px; font-size: 9px; }

/* S2: Spread journey map to fill page */
.s2-journey .jf { margin: 16px 0; }
.s2-journey table { margin: 14px 0; }
.s2-journey table tbody td { padding: 8px 10px; }
.s2-journey .ti { margin-bottom: 14px; }
.s2-journey .tt { font-size: 13px; }
.s2-journey .tx { font-size: 11px; line-height: 1.5; }

/* S3: Keep 3.3 on same page — reduce spacing in 3.1/3.2 */
.s3-acquisition .co { margin: 8px 0; padding: 8px 12px; }
.s3-acquisition .hb { padding: 14px 18px; margin: 8px 0; }
.s3-acquisition .hb h3 { font-size: 14px; margin-bottom: 4px; }
.s3-acquisition .hb p { font-size: 11px; }
.s3-acquisition h3 { margin: 10px 0 4px 0; }
.s3-acquisition .divider { margin: 8px 0; }
.s3-acquisition table { margin: 6px 0; }
.s3-acquisition table tbody td { padding: 5px 7px; }

/* S4: Spread pilot playbook to fill page */
.s4-pilot table { margin: 14px 0; }
.s4-pilot table tbody td { padding: 8px 10px; }
.s4-pilot .cr { margin: 18px 0; gap: 14px; }
.s4-pilot .cd { padding: 16px; }
.s4-pilot .cd-t { font-size: 17px; }
.s4-pilot .cd-b { font-size: 12px; line-height: 1.5; }

/* S5: Compact retention to fit on one page */
.s5-retention .cr { margin: 8px 0; gap: 8px; }
.s5-retention .cd { padding: 10px; }
.s5-retention .cd-t { font-size: 14px; margin-bottom: 2px; }
.s5-retention .cd-b { font-size: 10px; line-height: 1.35; }
.s5-retention h3 { margin: 8px 0 3px 0; font-size: 13px; }
.s5-retention table { margin: 4px 0; font-size: 10px; }
.s5-retention table tbody td { padding: 3px 6px; }
.s5-retention table thead th { padding: 5px 6px; font-size: 7.5px; }
.s5-retention .co { margin: 6px 0; padding: 7px 10px; font-size: 10px; }
.s5-retention .divider { margin: 6px 0; }
.s5-retention .ns-sub { margin: 2px 0 6px 0; }

/* S6: Compact expansion to fit on one page */
.s6-expansion .jf { margin: 10px 0; }
.s6-expansion h3 { margin: 10px 0 4px 0; font-size: 13px; }
.s6-expansion table { margin: 6px 0; font-size: 10px; }
.s6-expansion table tbody td { padding: 4px 7px; }
.s6-expansion table thead th { padding: 5px 7px; font-size: 7.5px; }
.s6-expansion .co { margin: 6px 0; padding: 7px 12px; font-size: 10px; }
.s6-expansion .hb { margin: 8px 0; padding: 14px 18px; }
.s6-expansion .hb h3 { font-size: 14px; margin-bottom: 4px; }
.s6-expansion .hb p { font-size: 11px; }
.s6-expansion .ns-sub { margin: 2px 0 6px 0; }
.s6-expansion .divider { display: none; }
.s6-expansion p { font-size: 11px; }

/* S8: Spread pricing to fill page */
.s8-pricing .cr { margin: 16px 0; gap: 14px; }
.s8-pricing .cd { padding: 16px; }
.s8-pricing .cd-t { font-size: 18px; }
.s8-pricing .cd-b { font-size: 12px; line-height: 1.5; }
.s8-pricing .co { margin: 14px 0; padding: 12px 16px; font-size: 12px; }
.s8-pricing table { margin: 14px 0; }
.s8-pricing table tbody td { padding: 9px 10px; }
.s8-pricing .sr { margin: 18px 0; gap: 12px; }
.s8-pricing .st { padding: 14px 12px; }
.s8-pricing .st-v { font-size: 26px; }

/* S9: Spread moat to fill page */
.s9-moat table { margin: 14px 0; }
.s9-moat table tbody td { padding: 9px 10px; font-size: 11.5px; }
.s9-moat .hb { margin: 18px 0; padding: 22px 24px; }
.s9-moat .hb p { font-size: 12.5px; line-height: 1.6; }
.s9-moat .divider { margin: 16px 0; }

/* S10: Spread risk matrix to fill page */
.s10-risk table { margin: 14px 0; }
.s10-risk table tbody td { padding: 8px 10px; font-size: 11.5px; }
.s10-risk .sr { margin: 20px 0; gap: 14px; }
.s10-risk .st { padding: 16px 12px; }
.s10-risk .st-v { font-size: 28px; }
.s10-risk .co { margin: 16px 0; padding: 14px 18px; font-size: 12px; }

/* S11: Add space between milestone table and stat boxes */
.s11-timeline .sr-bottom { margin-top: 28px; }
</style>

<!-- ══════════ COVER ══════════ -->
<div class="cover">
<img class="cover-logo" src="../public/logos/e deviser logo 2.jpg" alt="Edeviser" />
<div class="cover-badge">CONFIDENTIAL — STRATEGIC DOCUMENT</div>

# B2B Institutional <span>Growth Playbook</span>

<div class="cover-sub">Acquisition → Retention → Expansion strategy for Qatar higher education market entry. Product-tied growth engine with measurable milestones.</div>
<div class="cover-line"></div>
<div class="cover-meta">
  <div class="cover-meta-item"><span class="cover-ml">Version</span><span class="cover-mv">3.0</span></div>
  <div class="cover-meta-item"><span class="cover-ml">Date</span><span class="cover-mv">April 2026</span></div>
  <div class="cover-meta-item"><span class="cover-ml">Market</span><span class="cover-mv">Qatar (GCC)</span></div>
  <div class="cover-meta-item"><span class="cover-ml">Classification</span><span class="cover-mv">Internal + Investor</span></div>
</div>
</div>

<!-- ══════════ TOC ══════════ -->
<div class="ns toc-page">
<span class="sl">Navigation</span>

## Table of Contents

| #   | Section                   | Focus                                      |
| --- | ------------------------- | ------------------------------------------ |
| 1   | Market Landscape          | Qatar HE market sizing and dynamics        |
| 2   | Institutional Journey Map | End-to-end lifecycle from lead to referral |
| 3   | Acquisition Engine        | How we enter institutions                  |
| 4   | The Pilot Playbook        | Getting live in 1–2 weeks                  |
| 5   | Retention Architecture    | Three dependency layers                    |
| 6   | Expansion Mechanics       | Course → Department → Campus → Network     |
| 7   | Product → Growth Mapping  | Feature-to-outcome alignment               |
| 8   | Pricing & Revenue Model   | Tier structure and revenue timeline        |
| 9   | Competitive Moat          | Five defensibility layers                  |
| 10  | Risk Matrix               | Probability × impact analysis              |
| 11  | 12-Month Timeline         | Quarter-by-quarter milestones              |
| 12  | The Growth Equation       | Summary formula                            |

<div class="hb">
  <h3>🦊 The Core Question This Document Answers</h3>
  <p>How does Edeviser enter an institution, prove value quickly, become part of daily usage, and then expand across the entire system — creating a flywheel that feeds itself?</p>
</div>
</div>

<!-- ══════════ S1: MARKET ══════════ -->
<div class="ns">
<span class="sl">Market Intelligence</span>

## 1. Qatar Higher Education Landscape

<p class="ns-sub">A concentrated, high-value cluster market with universal OBE mandates and no dominant platform.</p>

<div class="sr">
  <div class="st"><div class="st-v">12</div><div class="st-l">Universities</div></div>
  <div class="st"><div class="st-v">30+</div><div class="st-l">Technical Colleges</div></div>
  <div class="st"><div class="st-v">$7.2B</div><div class="st-l">GCC EdTech by 2027</div></div>
  <div class="st"><div class="st-v">1 City</div><div class="st-l">Doha Cluster</div></div>
</div>

### Why Qatar First

<div class="co"><strong>Cluster Market Advantage:</strong> All 12 universities and 30+ colleges are in a single metropolitan area (Doha). One success story reaches every decision-maker through shared accreditation bodies, faculty mobility, and Ministry mandates.</div>

| Factor                 | Detail                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| OBE Mandate            | CNA-Q requires all institutions to demonstrate outcome-based curriculum alignment   |
| Accreditation Pressure | ABET, AACSB, QAA visits are cyclical — institutions prepare 12–18 months in advance |
| Language               | Arabic/English bilingual mandatory — Edeviser ships with full i18n from day 1       |
| QNV 2030               | Qatar National Vision prioritizes education quality and knowledge economy           |
| No Incumbent           | No dominant OBE + engagement platform exists in the region                          |
| Budget                 | Qatar HE institutions have strong per-student technology budgets                    |

<div class="divider"></div>

### Target Pipeline

<div class="s1-pipeline">

| Institution                         | Type      | Students | Tier       | Accreditation | Priority |
| ----------------------------------- | --------- | -------- | ---------- | ------------- | -------- |
| Qatar University                    | Public    | 15,000   | Enterprise | CNA-Q / ABET  | High     |
| Univ. of Doha for Science & Tech    | Public    | 8,000    | Growth     | CNA-Q         | High     |
| Hamad Bin Khalifa University        | Private   | 3,000    | Growth     | QAA           | High     |
| Lusail University                   | Private   | 5,000    | Growth     | CNA-Q         | Medium   |
| College of North Atlantic — Qatar   | Technical | 6,000    | Growth     | CNA-Q         | Medium   |
| Weill Cornell Medicine — Qatar      | Medical   | 1,500    | Growth     | ABET / LCME   | Medium   |
| Carnegie Mellon — Qatar             | Branch    | 500      | Starter    | ABET          | Low      |
| Texas A&M — Qatar                   | Branch    | 800      | Starter    | ABET          | Low      |
| Georgetown — Qatar                  | Branch    | 300      | Starter    | MSCHE         | Low      |
| Northwestern — Qatar                | Branch    | 400      | Starter    | HLC           | Low      |
| Community College of Qatar          | Community | 4,000    | Growth     | CNA-Q         | Medium   |
| Ahmed Bin Mohammed Military College | Military  | 2,000    | Growth     | Government    | Low      |

</div>

<div class="co co-b"><strong>Total Addressable Pipeline:</strong> $620K–$1.8M ARR across 12 institutions. First 3 high-priority institutions alone represent $225K ARR.</div>
</div>

<!-- ══════════ S2: JOURNEY MAP ══════════ -->
<div class="ns s2-journey">
<span class="sl">Customer Lifecycle</span>

## 2. Institutional Journey Map

<p class="ns-sub">The complete lifecycle from first contact to multi-institution referral.</p>

<div class="jf">
  <span class="js">First Contact</span><span class="ja">→</span>
  <span class="js">Discovery</span><span class="ja">→</span>
  <span class="js">Demo</span><span class="ja">→</span>
  <span class="js js-a">Pilot (2–4 wks)</span><span class="ja">→</span>
  <span class="js">Review</span><span class="ja">→</span>
  <span class="js">Dept. Expand</span><span class="ja">→</span>
  <span class="js">Campus</span><span class="ja">→</span>
  <span class="js">Referral</span>
</div>

| Phase                         | Duration      | Key Milestone                                 | Risk   |
| ----------------------------- | ------------- | --------------------------------------------- | ------ |
| First Contact → Discovery     | 1–2 weeks     | Decision-maker identified, pain confirmed     | Low    |
| Discovery → Pilot Agreement   | 2–4 weeks     | 1 course, 1 teacher, 30–100 students          | Medium |
| Pilot Setup                   | 3–5 days      | Course structure uploaded, students onboarded | Low    |
| Pilot Running                 | 2–4 weeks     | Daily usage data, engagement metrics          | Medium |
| Pilot Review → Dept. Decision | 2–4 weeks     | Results presentation to dean                  | Medium |
| Department Rollout            | 1 semester    | 5–15 courses, multiple teachers               | Low    |
| Campus Rollout                | 1–2 semesters | Admin dashboard, accreditation reports        | Low    |

<div class="divider"></div>

### Step-by-Step Execution

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Step 1 — First Contact</div><div class="tx">Direct outreach to QA director or program coordinator via LinkedIn/email, or referral from accreditation body workshop.</div></div></div>

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Step 2 — Discovery Call (20 min)</div><div class="tx">Confirm the pain, identify the decision-maker, propose a pilot. "How do your teachers currently report CLO attainment?" / "How long does it take to compile an accreditation report?"</div></div></div>

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Step 3 — Live Demo (30 min)</div><div class="tx">Create course with CLOs → Map to PLOs → Create assignment with rubric → Grade submission → Show curriculum matrix updating live → Show student XP dashboard → Export accreditation report. ~15 min demo, 15 min Q&A.</div></div></div>

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Step 4 — Pilot Agreement</div><div class="tx">Free pilot, 1 course, 1 teacher, 30–100 students, 2–4 weeks. We handle setup. No contract, no commitment.</div></div></div>

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Step 5 — Pilot Execution</div><div class="tx">Day 1–3: Setup. Day 7: Check-in. Day 14: Mid-pilot review with coordinator. Day 21–28: End-of-pilot presentation.</div></div></div>

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Step 6 — Results → Expand → Refer</div><div class="tx">Present before/after metrics to dean. Department expansion (5–15 courses). Campus rollout. Referral via case study and CNA-Q workshop.</div></div></div>
</div>

<!-- ══════════ S3: ACQUISITION ══════════ -->
<div class="ns s3-acquisition">
<span class="sl">Go-To-Market</span>

## 3. B2B Acquisition Engine

<p class="ns-sub">How we enter institutions — entry points, the initial wedge, and the conversation framework.</p>

### 3.1 Entry Points

| Entry Point                       | Their Pain                                                    | Our Wedge                                                               |
| --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Program Coordinator** (Primary) | Accreditation in 6–12 months, CLO-PLO mapping in spreadsheets | "Upload your course structure. We auto-generate the curriculum matrix." |
| **QA Director / Admin**           | Manual report compilation, scattered data                     | "One-click accreditation report export with evidence citations."        |
| **Department Head**               | Low engagement, no visibility into underperforming courses    | "See which CLOs students are failing — in real time."                   |
| **Individual Teacher**            | Grading is tedious, OBE reporting feels like extra work       | "Grade once with the rubric — evidence + XP happen automatically."      |

<div class="co"><strong>Primary target: Program Coordinator or QA Director.</strong> They own the accreditation pain and have budget authority or direct access to the dean.</div>

<div class="divider"></div>

### 3.2 The Initial Wedge

<div class="hb">
  <h3>🦉 The wedge is NOT "we're a gamification platform."</h3>
  <p>The wedge is: "We eliminate the gap between grading and accreditation reporting." Teachers grade in one system, then manually enter OBE data in another. Edeviser collapses this into one action.</p>
</div>

**The hook sequence:**

1. **Pain:** "Your teachers grade, then separately fill out OBE compliance forms. That's double work."
2. **Value:** "Grade using a rubric → evidence auto-generated → attainment updates instantly → accreditation report is one click."
3. **Bonus:** "Students see progress in real time — XP, streaks, skill bars — they engage more, generating richer data."

<div class="co co-o"><strong>🦊 Key Insight:</strong> Gamification is the retention hook, not the acquisition hook. Institutions buy compliance automation. Students stay because of engagement.</div>

<div class="divider"></div>

### 3.3 Pilot Success Criteria

| Metric                     | Target        | Product Feature                      |
| -------------------------- | ------------- | ------------------------------------ |
| Student daily login rate   | >50% enrolled | Activity logger + admin dashboard    |
| On-time submission rate    | >70%          | Assignment submission tracking       |
| Average streak length      | >5 days       | Streak display, gamification engine  |
| Teacher grading turnaround | <48 hours     | Grading interface analytics          |
| Evidence coverage          | 100% graded   | Automatic evidence generation        |
| CLO attainment visibility  | Real-time     | Attainment rollup, CLO progress bars |

<div class="co"><strong>The killer metric:</strong> "In 2 weeks, you have a live curriculum matrix with real attainment data — something that used to take a semester of manual data collection."</div>
</div>

<!-- ══════════ S4: PILOT ══════════ -->
<div class="ns s4-pilot">
<span class="sl">Execution</span>

## 4. The Pilot Playbook

<p class="ns-sub">Getting a pilot live in 3–5 days. Scope: 1 course, 1 teacher, 30–100 students, 2–4 weeks.</p>

| Day   | Action                                      | Product Feature                      |
| ----- | ------------------------------------------- | ------------------------------------ |
| Day 1 | Admin account + institution settings        | Admin onboarding wizard              |
| Day 1 | Teacher account, assigned to course         | User provisioning                    |
| Day 2 | Teacher creates CLOs with Bloom's levels    | CLO form + Bloom's verb guide        |
| Day 2 | CLOs mapped to PLOs                         | Outcome mappings + weight validation |
| Day 3 | 2–3 assignments with rubrics linked to CLOs | Assignment form, rubric builder      |
| Day 3 | Students bulk-imported via CSV              | Bulk CSV import                      |
| Day 4 | Students complete onboarding (<3 min)       | Onboarding wizard                    |
| Day 5 | First assignment goes live                  | Submission flow, XP awards           |

<div class="cr">
  <div class="cd"><div class="cd-h">Zero Infrastructure</div><div class="cd-t">SaaS-Ready</div><div class="cd-b">No servers to provision. Supabase-hosted, Vercel-deployed. Institution gets a URL and credentials.</div></div>
  <div class="cd cd-f"><div class="cd-h">Bulk Import</div><div class="cd-t">2 Minutes</div><div class="cd-b">100 students onboarded via CSV. No manual account creation. Email invitations automatic.</div></div>
  <div class="cd"><div class="cd-h">Bilingual</div><div class="cd-t">Arabic + English</div><div class="cd-b">Full i18n from day 1. RTL layout support. No localization barrier for Qatar.</div></div>
</div>

| Week   | Focus                                         | Success Signal                          |
| ------ | --------------------------------------------- | --------------------------------------- |
| Week 1 | Activation — onboard, first submissions       | >60% login rate, first evidence records |
| Week 2 | Engagement — streaks forming, XP accumulating | >40% with 5+ day streaks                |
| Week 3 | Evidence — curriculum matrix populating       | 100% evidence coverage on graded work   |
| Week 4 | Proof — results compiled                      | Accreditation report exportable         |

</div>

<!-- ══════════ S5: RETENTION ══════════ -->
<div class="ns s5-retention">
<span class="sl">Stickiness</span>

## 5. Retention Architecture

<p class="ns-sub">Three dependency layers that make switching painful.</p>

<div class="cr">
  <div class="cd"><div class="cd-h">Layer 1 — Institutional</div><div class="cd-t">Data Gravity</div><div class="cd-b">Immutable evidence records, CLO-PLO-ILO mappings, attainment data — migrating means losing the accreditation evidence trail.</div></div>
  <div class="cd cd-f"><div class="cd-h">Layer 2 — Student</div><div class="cd-t">Habit Formation</div><div class="cd-b">Streaks, badges, XP, leaderboards — loss aversion, sunk cost, social status create behavioral lock-in.</div></div>
  <div class="cd"><div class="cd-h">Layer 3 — Teacher</div><div class="cd-t">Workflow Integration</div><div class="cd-b">Rubric grading with auto-evidence saves 30+ min/assignment/section. Teachers won't go back.</div></div>
</div>

<div class="divider"></div>

### Habit Formation Features

| Feature              | Mechanism                                    | Lock-In Type           |
| -------------------- | -------------------------------------------- | ---------------------- |
| Streak system        | Loss aversion — losing a 30-day streak hurts | Behavioral habit       |
| Badge collection     | Sunk cost of earned achievements             | Achievement investment |
| Level progression    | Level 12 student won't restart at Level 1    | Progress investment    |
| Leaderboard position | Social status within peer group              | Social identity        |
| Daily habit tracker  | Login/Submit/Journal/Read becomes routine    | Behavioral routine     |
| Team challenges      | Social accountability                        | Social obligation      |

### Workflow Integration

| Feature                        | Time Saved                  | Replaces                      |
| ------------------------------ | --------------------------- | ----------------------------- |
| Rubric grading → auto evidence | 30+ min/assignment/section  | Manual OBE data entry         |
| AI feedback drafts             | 5–10 min/student/assignment | Writing feedback from scratch |
| At-risk early warning          | 7 days earlier detection    | Manual student monitoring     |
| Adaptive quiz generation       | Hours of question creation  | Manual question writing       |

<div class="co"><strong>The Flywheel:</strong> Teacher grades with rubric → Evidence auto-generated → Student sees CLO progress + earns XP → Student engages more → More evidence → Richer attainment data → Better accreditation reports → Institution renews → More courses → Cycle accelerates.</div>

### Retention Signals

| Signal                | Healthy             | At Risk   | Intervention                 |
| --------------------- | ------------------- | --------- | ---------------------------- |
| Teacher weekly active | >80%                | <50%      | 1:1 training session         |
| Student DAU/MAU       | >60%                | <30%      | Review gamification tuning   |
| Evidence generation   | Matches grading 1:1 | Gaps      | Check rubric usage           |
| 7-day streak rate     | >40% students       | <20%      | Review notifications         |
| Assignment creation   | Steady/increasing   | Declining | Teacher reverting to old LMS |

</div>

<!-- ══════════ S6: EXPANSION ══════════ -->
<div class="ns s6-expansion">
<span class="sl">Scale</span>

## 6. Expansion Mechanics

<p class="ns-sub">How we grow from 1 course to campus-wide to multi-institution network.</p>

<div class="jf">
  <span class="js">1 Course</span><span class="ja">→</span>
  <span class="js">Department (5–15)</span><span class="ja">→</span>
  <span class="js js-a">Campus Rollout</span><span class="ja">→</span>
  <span class="js">Multi-Institution</span>
</div>

### Stage 1: Course → Department (Semester 1 → 2)

**Trigger:** Pilot results show measurable improvement in engagement and evidence coverage.

| Feature                          | Why It Pulls Expansion                   | Value at Scale               |
| -------------------------------- | ---------------------------------------- | ---------------------------- |
| Curriculum matrix (PLO × Course) | Only valuable with multiple courses      | Shows gaps across department |
| Cross-course CLO heatmap         | Meaningless with 1 course                | Identifies curriculum holes  |
| Coordinator dashboard            | Boring with 1 course, actionable with 10 | Aggregated intelligence      |
| Gap analysis view                | Requires multi-course data               | Accreditation preparation    |

<div class="co"><strong>🦉 Key Insight:</strong> The coordinator dashboard is intentionally designed to be most valuable at department scale. This creates natural pull for expansion.</div>

### Stage 2: Department → Campus (Semester 2 → 3)

**Trigger:** Department-level attainment data impresses the dean. Accreditation visit approaching.

New capabilities: Admin dashboard with institution-wide KPIs, accreditation report export (CNA-Q/ABET/HEC), cross-program comparison, cohort trends, graduate attribute tracking, competency framework alignment, institution-wide audit logs.

### Stage 3: Campus → Multi-Institution (Year 2+)

| Channel                | Mechanism                                     | Product Tie-In           |
| ---------------------- | --------------------------------------------- | ------------------------ |
| Case study             | Published results from pilot                  | Admin dashboard exports  |
| Accreditation referral | CNA-Q evaluators see Edeviser reports         | Report templates         |
| University network     | Qatar's 12 universities are tightly connected | Same product, new tenant |
| Faculty mobility       | Teachers move between institutions            | Same UX, same workflow   |

<div class="hb">
  <h3>🦊 Win 1 → Present at CNA-Q Workshop → 3 Approach Us</h3>
  <p>Qatar has 12 universities and 30+ colleges in a single city. Shared accreditation bodies, faculty who teach at multiple institutions, Ministry mandates that apply to all.</p>
</div>
</div>

<!-- ══════════ S7: PRODUCT MAPPING ══════════ -->
<div class="ns">
<span class="sl">Product-Led Growth</span>

## 7. Product → Growth Mapping

<p class="ns-sub">Every feature maps to a growth outcome. Nothing is built without a clear purpose.</p>

### What Drives Adoption (First 2 Weeks)

| Product Feature            | Why It Drives Adoption                    | Time to Value         |
| -------------------------- | ----------------------------------------- | --------------------- |
| Bulk CSV import            | 100 students in 2 minutes                 | Minutes               |
| Rubric builder + templates | First assignment in 5 minutes             | Minutes               |
| Auto evidence generation   | First grade → first evidence record       | Seconds               |
| Curriculum matrix          | Live CLO coverage — replaces spreadsheets | After 2–3 assignments |
| Student onboarding wizard  | 7 questions, <3 min                       | Minutes               |
| Arabic/English bilingual   | No localization barrier                   | Immediate             |

<div class="divider"></div>

### What Drives Retention (Weeks 2–8)

| Product Feature          | Dependency Created | Who It Locks In |
| ------------------------ | ------------------ | --------------- |
| Streak system + freeze   | Loss aversion      | Student         |
| XP + levels + badges     | Sunk cost          | Student         |
| AI feedback drafts       | Time savings       | Teacher         |
| Immutable evidence trail | Data gravity       | Institution     |
| Adaptive quizzes         | Flow state         | Student         |
| Team challenges          | Social obligation  | Student         |

<div class="divider"></div>

### What Drives Expansion (Month 2+)

| Product Feature                  | Who It Convinces      | Why It Pulls Expansion                  |
| -------------------------------- | --------------------- | --------------------------------------- |
| Curriculum matrix (multi-course) | Coordinator           | Only valuable with 5+ courses           |
| Admin dashboard                  | Admin / Dean          | Only valuable with multiple departments |
| Accreditation report export      | QA Director           | Replaces weeks of manual work           |
| Gap analysis view                | Coordinator           | Identifies curriculum holes             |
| Graduate attribute tracking      | QA Director           | National qualification framework        |
| Course file generation           | Teacher / Coordinator | Massive time saver at scale             |

</div>

<!-- ══════════ S8: PRICING ══════════ -->
<div class="ns s8-pricing">
<span class="sl">Revenue Model</span>

## 8. Pricing & Revenue Model

<p class="ns-sub">Tiered pricing that encourages expansion. Per-student cost decreases as the institution scales.</p>

<div class="cr">
  <div class="cd"><div class="cd-h">Starter (Pilot)</div><div class="cd-t">$30K–50K/yr</div><div class="cd-b">Up to 500 students · $60–100/student · $10K implementation · 1 department, basic reports</div></div>
  <div class="cd cd-f"><div class="cd-h">Growth (Recommended)</div><div class="cd-t">$50K–100K/yr</div><div class="cd-b">500–2,000 students · $50–100/student · $20K implementation · Multi-department, AI features, advanced analytics</div></div>
  <div class="cd"><div class="cd-h">Enterprise</div><div class="cd-t">$100K–250K/yr</div><div class="cd-b">2,000+ students · $50–125/student · $40K implementation · Campus-wide, SSO, custom reports</div></div>
</div>

<div class="co"><strong>Volume incentive:</strong> A department paying $50K for 500 students ($100/student) sees the rate drop to $50/student at campus scale.</div>

| Period  | Institutions | ARR (USD) | Milestone                          |
| ------- | ------------ | --------- | ---------------------------------- |
| Q4 2026 | 1 (pilot)    | ~$15K     | First paid contract                |
| Q2 2027 | 3            | ~$120K    | Department-level at 2 institutions |
| Q4 2027 | 5            | ~$250K    | Campus rollout at lead institution |
| Q2 2028 | 8            | ~$500K    | Multi-institution, GCC expansion   |

<div class="sr">
  <div class="st"><div class="st-v">$15K</div><div class="st-l">First Contract</div></div>
  <div class="st"><div class="st-v">$250K</div><div class="st-l">Year 1 ARR</div></div>
  <div class="st"><div class="st-v">$500K</div><div class="st-l">Year 2 ARR</div></div>
  <div class="st"><div class="st-v">$7.2B</div><div class="st-l">GCC EdTech TAM</div></div>
</div>
</div>

<!-- ══════════ S9: MOAT ══════════ -->
<div class="ns s9-moat">
<span class="sl">Defensibility</span>

## 9. Competitive Moat

<p class="ns-sub">Five layers of defensibility that compound over time.</p>

| Moat Layer                  | What It Is                          | Why Competitors Can't Replicate               |
| --------------------------- | ----------------------------------- | --------------------------------------------- |
| **Dual-engine fusion**      | Compliance + engagement in one loop | Requires deep domain knowledge of both        |
| **Immutable evidence**      | Append-only, auditable records      | 2 semesters = switching loses audit trail     |
| **Behavioral lock-in**      | Streaks, XP, badges, levels         | Students/teachers resist losing progress      |
| **Accreditation alignment** | Templates for CNA-Q, ABET, HEC      | Body-specific knowledge, first-mover in Qatar |
| **Cluster dynamics**        | 12 universities in 1 city           | Win 2–3 and word-of-mouth does the rest       |

<div class="hb">
  <h3>🦉 The Moat Deepens With Time</h3>
  <p>Every semester adds more evidence records (data gravity), more student progress (behavioral lock-in), more teacher workflows (integration dependency), and more institutional reports (compliance dependency). Switching cost increases exponentially.</p>
</div>

<div class="divider"></div>

### Competitive Landscape

| Competitor Type | Examples                   | What They Don't Do                                                  |
| --------------- | -------------------------- | ------------------------------------------------------------------- |
| Traditional LMS | Moodle, Blackboard, Canvas | No OBE mapping, no gamification, no evidence automation             |
| OBE-Only Tools  | Xitracs, AEFIS, Watermark  | No engagement, no gamification, no real-time feedback               |
| Gamification    | Classcraft, Kahoot         | No OBE compliance, no evidence, no accreditation reports            |
| **Edeviser**    | —                          | **The only platform where grading = evidence = XP = accreditation** |

</div>

<!-- ══════════ S10: RISK ══════════ -->
<div class="ns s10-risk">
<span class="sl">Risk Management</span>

## 10. Risk Matrix & Mitigations

<p class="ns-sub">Honest assessment of what could go wrong and how we address each scenario.</p>

| Risk                             | Prob.  | Impact | Mitigation                                       |
| -------------------------------- | ------ | ------ | ------------------------------------------------ |
| Procurement cycles slow (3–6 mo) | High   | High   | Pilot-first bypasses procurement — pilot is free |
| Teachers resist new tools        | High   | High   | Near-zero friction: grade with rubric = done     |
| Students don't engage            | Medium | Medium | Core value is compliance. Gamification is bonus  |
| Competitor enters Qatar          | Low    | High   | Production-ready now. 12+ months to replicate    |
| Accreditation changes            | Medium | Medium | Configurable templates. CQI module adapts        |
| Pilot doesn't convert            | Medium | High   | Target institutions with imminent accreditation  |
| Data privacy concerns            | Medium | High   | RLS on every table, FERPA-aligned                |
| Arabic localization              | Medium | Medium | Native review, RTL-first design                  |

<div class="sr">
  <div class="st" style="border-top: 3px solid #ef4444;"><div class="st-v" style="color:#ef4444;">2</div><div class="st-l">High × High</div></div>
  <div class="st" style="border-top: 3px solid #f59e0b;"><div class="st-v" style="color:#f59e0b;">4</div><div class="st-l">Medium Risk</div></div>
  <div class="st" style="border-top: 3px solid #22c55e;"><div class="st-v" style="color:#22c55e;">2</div><div class="st-l">Low Risk</div></div>
</div>

<div class="co co-o"><strong>🦊 The two high-risk items (procurement + teacher resistance) are both addressed by the same strategy:</strong> free pilot with near-zero teacher friction.</div>
</div>

<!-- ══════════ S11: TIMELINE ══════════ -->
<div class="ns s11-timeline">
<span class="sl">Execution Roadmap</span>

## 11. 12-Month Execution Timeline

<p class="ns-sub">Quarter-by-quarter milestones from Qatar market entry to commercial operations.</p>

### Q2 2026 (Apr–Jun): Market Entry

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 1–2: Qatar Setup</div><div class="tx">Founder relocation, QFC entity, QID processing, QSTP application. Product: RLS audit, load testing, CNA-Q templates, Arabic review.</div></div></div>
<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 3: First Outreach</div><div class="tx">Contact Qatar University, UDST, HBKU. Discovery calls. Demo prep with CNA-Q templates.</div></div></div>

### Q3 2026 (Jul–Sep): Pilot Phase

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 4–5: First Pilot</div><div class="tx">1 university, 1–2 departments, 200–500 students. Weekly check-ins. Bridge Program reimbursement submitted.</div></div></div>
<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 6: Results & Iteration</div><div class="tx">Top 10 feedback items addressed. Pilot results presentation. Bridge reimbursement arrives (~PKR 1.4M).</div></div></div>

### Q4 2026 (Oct–Dec): Conversion

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 7–8: First Paid Contract</div><div class="tx">Pilot converts to paid. Department rollout (5–15 courses). Second institution pilot begins.</div></div></div>
<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 9: Scale v2</div><div class="tx">Expand to 2–3 departments. AI features at scale. Case study drafted.</div></div></div>

### Q1 2027 (Jan–Mar): Commercial Launch

<div class="ti"><div class="td"></div><div class="tc"><div class="tt">Month 10–12: Commercial Operations</div><div class="tx">2–3 paying institutions. Campus rollout at lead. Case study published. CNA-Q workshop. ARR: $120K+.</div></div></div>

<div class="divider"></div>

### Milestone Summary

| Month | Milestone                                          | Revenue    |
| ----- | -------------------------------------------------- | ---------- |
| 1–3   | Qatar setup complete, legal entity operational     | —          |
| 4–6   | Pilot running at 1 university                      | —          |
| 6–7   | Bridge reimbursement, runway extends to 12+ months | —          |
| 7–8   | First paid contract signed                         | ~$15K ARR  |
| 9–10  | Second institution pilot, department expansion     | ~$50K ARR  |
| 12    | Commercial operations, 2–3 institutions            | ~$120K ARR |

<div class="sr sr-bottom">
  <div class="st"><div class="st-v">3–5</div><div class="st-l">Days to Pilot</div></div>
  <div class="st"><div class="st-v">2–4</div><div class="st-l">Weeks Pilot</div></div>
  <div class="st"><div class="st-v">12</div><div class="st-l">Months to $120K</div></div>
  <div class="st"><div class="st-v">PKR 606K</div><div class="st-l">Buffer at M12</div></div>
</div>
</div>

<!-- ══════════ S12: SUMMARY ══════════ -->
<div class="ns">
<span class="sl">Summary</span>

## 12. The Growth Equation

<p class="ns-sub">One formula that captures the entire strategy.</p>

<div class="hb" style="text-align: center;">
  <h3 style="font-size: 15px; margin-bottom: 10px;">The Edeviser Growth Formula</h3>
  <p style="font-size: 16px; font-weight: 800; color: white;">Compliance Pain (Wedge) × Free Pilot (Entry) × Dual-Engine Flywheel (Retention) × Cluster Market (Expansion) = Compounding Institutional Growth</p>
</div>

<div class="tc2">
  <div>

### What We Sell (Acquisition)

- Accreditation compliance automation
- "Grade once, report automatically"
- Zero-infrastructure SaaS deployment
- Arabic/English bilingual from day 1

### What Keeps Them (Retention)

- Immutable evidence trail (data gravity)
- Student streaks, XP, badges (lock-in)
- Teacher workflow efficiency (time savings)
- Real-time attainment dashboards

  </div>
  <div>

### What Grows Them (Expansion)

- Coordinator dashboard (valuable at scale)
- Cross-program analytics
- Accreditation report export
- Graduate attribute tracking

### What Spreads Us (Referral)

- Case studies from pilot institutions
- CNA-Q workshop presentations
- Faculty mobility between institutions
- Qatar's tight-knit HE community

  </div>
</div>

<div class="df">
  <img src="../public/logos/e deviser logo 2.jpg" alt="Edeviser" style="width: 120px; margin-bottom: 6px; border-radius: 4px;" /><br>
  <strong>Edeviser</strong> — Human-Centric OBE + Gamification Platform<br>
  B2B Institutional Growth Playbook v3.0 — April 2026<br>
  <span style="color: var(--teal); font-weight: 700;">Every learning interaction counts.</span>
</div>
</div>

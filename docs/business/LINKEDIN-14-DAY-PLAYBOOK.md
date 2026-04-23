---
pdf_options:
  format: A4
  margin: 18mm 16mm 22mm 16mm
  headerTemplate: '<div style="width:100%;font-size:7.5px;color:#94A3B8;padding:0 18mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>Edeviser — LinkedIn 14-Day Launch Playbook</span><span>Confidential</span></div>'
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
  --amber: #F59E0B;
  --teal-soft: #ECFDF5;
  --blue-soft: #EFF6FF;
  --amber-soft: #FFFBEB;
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

h2, h3, h4 { page-break-after: avoid; }
tr { page-break-inside: avoid; }
.callout, .hero-banner, .card-row, .stat-row { page-break-inside: avoid; }

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
.cover h1 { font-size: 34px; font-weight: 900; color: var(--navy); line-height: 1.15; margin: 0 0 10px 0; }
.cover h1 span { background: var(--grad-tb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.cover-sub { font-size: 13px; color: var(--mute); font-weight: 500; max-width: 480px; margin: 0 auto 20px; line-height: 1.5; }
.cover-line { width: 60px; height: 3px; background: var(--grad-tb); border-radius: 2px; margin: 16px auto; }
.cover-meta { display: flex; gap: 28px; justify-content: center; margin-top: 16px; }
.cover-meta-item { text-align: center; }
.cover-ml { font-size: 8px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--teal); display: block; margin-bottom: 3px; }
.cover-mv { font-size: 12px; font-weight: 600; color: var(--navy); }

h2 { font-size: 20px; font-weight: 800; color: var(--navy); margin: 0 0 4px 0; padding-bottom: 6px; border-bottom: 3px solid var(--teal); display: inline-block; }
h3 { font-size: 14px; font-weight: 700; color: var(--navy); margin: 16px 0 6px 0; }
h4 { font-size: 12px; font-weight: 700; color: var(--ink); margin: 12px 0 4px 0; }
p { margin: 4px 0; }

.sl { font-size: 8px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--teal); margin-bottom: 2px; display: block; }
.ns { page-break-before: always; padding-top: 2px; }
.ns-sub { font-size: 12px; color: var(--mute); max-width: 560px; margin: 2px 0 10px 0; }
.divider { height: 1px; background: linear-gradient(90deg, var(--teal), var(--border), transparent); margin: 14px 0; opacity: 0.5; }

.sr { display: flex; gap: 10px; margin: 12px 0; flex-wrap: wrap; }
.st { flex: 1; min-width: 100px; background: white; border: 1px solid var(--border); border-radius: 10px; padding: 12px 10px; text-align: center; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
.st::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--grad-tb); }
.st-v { font-size: 22px; font-weight: 900; color: var(--navy); line-height: 1.1; }
.st-l { font-size: 8px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--mute); margin-top: 3px; }

.cr { display: flex; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
.cd { flex: 1; min-width: 140px; background: white; border: 1px solid var(--border); border-radius: 12px; padding: 14px; box-shadow: var(--shadow-card); position: relative; overflow: hidden; }
.cd::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--grad-tb); opacity: 0.6; }
.cd-h { font-size: 8px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--teal); margin-bottom: 4px; }
.cd-t { font-size: 15px; font-weight: 800; color: var(--navy); margin-bottom: 3px; }
.cd-b { font-size: 11px; color: var(--mute); line-height: 1.45; }
.cd-f { background: var(--grad-tb); border-color: transparent; box-shadow: var(--shadow-md); }
.cd-f::before { display: none; }
.cd-f .cd-h, .cd-f .cd-t, .cd-f .cd-b { color: white; }

.hb { background: var(--grad-hero); border-radius: 12px; padding: 20px 22px; color: white; margin: 12px 0; box-shadow: var(--shadow-lg); position: relative; overflow: hidden; }
.hb::after { content: ''; position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(19,191,166,0.15) 0%, transparent 70%); border-radius: 50%; }
.hb h3 { color: white; font-size: 16px; margin: 0 0 6px 0; position: relative; z-index: 1; }
.hb p { color: rgba(255,255,255,0.8); font-size: 12px; margin: 0; position: relative; z-index: 1; line-height: 1.5; }

table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 10px 0; font-size: 11px; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); }
thead th { background: var(--navy); color: white; font-size: 8px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 7px 8px; text-align: left; }
tbody td { padding: 6px 8px; border-bottom: 1px solid var(--border); }
tbody tr:nth-child(even) { background: var(--grey-soft); }
tbody tr:last-child td { border-bottom: none; }

.co { background: var(--teal-soft); border-left: 3px solid var(--teal); border-radius: 0 8px 8px 0; padding: 10px 14px; margin: 10px 0; font-size: 11px; box-shadow: var(--shadow-sm); line-height: 1.5; }
.co-b { background: var(--blue-soft); border-left-color: var(--blue); }
.co-o { background: #FFF7ED; border-left-color: #F97316; }
.co-a { background: var(--amber-soft); border-left-color: var(--amber); }
.co strong { color: var(--navy); }

.jf { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin: 12px 0; font-size: 10px; font-weight: 700; }
.js { background: white; border: 1px solid var(--border); border-radius: 6px; padding: 5px 10px; color: var(--navy); box-shadow: var(--shadow-sm); }
.js-a { background: var(--grad-tb); color: white; border-color: transparent; box-shadow: var(--shadow-md); }
.ja { color: var(--teal); font-size: 12px; font-weight: 900; }

ul, ol { padding-left: 16px; margin: 4px 0; }
li { margin-bottom: 3px; font-size: 11px; line-height: 1.45; }

blockquote { border-left: 3px solid var(--teal); background: var(--teal-soft); margin: 10px 0; padding: 10px 14px; border-radius: 0 8px 8px 0; font-style: italic; color: var(--navy); font-weight: 500; font-size: 11px; }

.df { margin-top: 28px; padding-top: 12px; border-top: 2px solid var(--teal); text-align: center; font-size: 10px; color: var(--mute); }
</style>


<!-- ══════════ COVER ══════════ -->
<div class="cover">
<img class="cover-logo" src="../public/logos/e deviser logo 2.jpg" alt="Edeviser" />
<div class="cover-badge">MARKETING STRATEGY — CONFIDENTIAL</div>

# LinkedIn 14-Day <span>Launch Playbook</span>

<div class="cover-sub">Character-driven brand strategy for Gulf market entry. 14 posts. 5 mascots. One interconnected brand universe that makes OBE feel human.</div>
<div class="cover-line"></div>
<div class="cover-meta">
  <div class="cover-meta-item"><span class="cover-ml">Version</span><span class="cover-mv">1.0</span></div>
  <div class="cover-meta-item"><span class="cover-ml">Date</span><span class="cover-mv">April 2026</span></div>
  <div class="cover-meta-item"><span class="cover-ml">Market</span><span class="cover-mv">Qatar (GCC)</span></div>
  <div class="cover-meta-item"><span class="cover-ml">Audience</span><span class="cover-mv">Marketing + Design</span></div>
</div>
</div>


<!-- ══════════ TOC ══════════ -->
<div class="ns">
<span class="sl">Navigation</span>

## Table of Contents

| # | Section | Focus |
|---|---------|-------|
| 1 | Strategy Overview | Why characters, not corporate posts |
| 2 | The Edeviser Character Cast | 5 mascots and their roles |
| 3 | Design System for Posts | Visual constants, colors, typography |
| 4 | Content Pillars | 6 rotating themes across 14 days |
| 5 | The 14-Day Post Calendar | Day-by-day detailed playbook |
| 6 | Post Summary Table | Quick reference for designer |
| 7 | Brand Consistency Rules | What ties it all together |
| 8 | Engagement Playbook | Post-publishing actions |
| 9 | Post-14-Day Continuation | What comes next |

<div class="hb">
  <h3>🦊 The Core Idea</h3>
  <p>Edeviser is not a faceless platform. It is a world populated by characters that represent the real people in higher education. Every post features these characters in situations that faculty, students, and administrators instantly recognize. The humor is knowing, not silly. The information is real, not dumbed down. The vibe is "the friend who works in education and actually gets it."</p>
</div>
</div>


<!-- ══════════ S1: STRATEGY ══════════ -->
<div class="ns">
<span class="sl">Strategic Foundation</span>

## 1. Strategy Overview

<p class="ns-sub">Why we are building a character-driven brand universe instead of posting corporate updates.</p>

### The Problem with EdTech on LinkedIn

Most EdTech companies post the same way: stock photos of smiling students, generic "we're excited to announce" updates, and corporate jargon about "transforming education." It all blurs together. Nobody stops scrolling.

### Our Approach: The Duolingo Playbook, Adapted for B2B

Duolingo turned a green owl into a cultural icon with 80M+ DAU. We are applying the same principle — brand characters that people form relationships with — but adapted for a B2B LinkedIn audience of deans, faculty, coordinators, and students in the Gulf region.

<div class="sr">
  <div class="st"><div class="st-v">596%</div><div class="st-l">Carousel vs Text Engagement</div></div>
  <div class="st"><div class="st-v">3-5x</div><div class="st-l">Carousel Reach vs Single</div></div>
  <div class="st"><div class="st-v">41%</div><div class="st-l">Higher Recall with Mascots</div></div>
  <div class="st"><div class="st-v">50%</div><div class="st-l">B2B Decisions Are Emotional</div></div>
</div>

<div class="co"><strong>Key Insight:</strong> The 2026 LinkedIn algorithm prioritizes "dwell time" above almost every other metric. Characters and visual storytelling keep people swiping. Carousels generate 3-5x more reach than single-image posts.</div>

<div class="divider"></div>

### The Narrative Arc (14 Days)

<div class="jf">
  <span class="js">Problem</span><span class="ja">→</span>
  <span class="js">Context</span><span class="ja">→</span>
  <span class="js js-a">Solution Concept</span><span class="ja">→</span>
  <span class="js">Qatar Milestone</span><span class="ja">→</span>
  <span class="js">Authority</span><span class="ja">→</span>
  <span class="js">Story</span><span class="ja">→</span>
  <span class="js">Vision</span>
</div>

- **Days 1-3:** The problem (OBE is broken, students are invisible)
- **Days 4-6:** Gulf context + emotional connection
- **Day 7:** Product concept reveal (Dual-Engine Architecture)
- **Day 8:** Qatar QFC incorporation announcement
- **Days 9-10:** Authority building (what accreditation bodies actually want)
- **Days 11-12:** Storytelling (Noor's transformation, Dean's dashboard dream)
- **Days 13-14:** Gulf vision + brand promise

<div class="co co-o"><strong>🦊 No hard sell until Day 7.</strong> The first 6 posts build credibility and emotional connection. The product concept appears on Day 7 as a natural answer to the problems raised. This is the Duolingo playbook: earn attention first, then reveal what you are building.</div>
</div>


<!-- ══════════ S2: CHARACTERS ══════════ -->
<div class="ns">
<span class="sl">Brand Identity</span>

## 2. The Edeviser Character Cast

<p class="ns-sub">5 mascots that represent the real people in higher education. They appear in every post, building recognition and emotional connection.</p>

<div class="cr">
  <div class="cd">
    <div class="cd-h">🦊 The Fox — Lead Mascot</div>
    <div class="cd-t">Foxi</div>
    <div class="cd-b">The Edeviser AI assistant and narrator. Clever, warm, slightly mischievous. Knows everything about OBE but explains it like a friend. The "face" of Edeviser — appears in every post.</div>
  </div>
  <div class="cd">
    <div class="cd-h">🦉 The Owl — Faculty</div>
    <div class="cd-t">Prof. Hoot</div>
    <div class="cd-b">The exhausted faculty member. Overworked, coffee-addicted, loves teaching but drowning in paperwork. Relatable to every professor in the Gulf.</div>
  </div>
</div>

<div class="cr">
  <div class="cd">
    <div class="cd-h">🦅 The Eagle — Admin</div>
    <div class="cd-t">Dean Talon</div>
    <div class="cd-b">The administrator and decision-maker. Strategic, results-oriented, under pressure from accreditation bodies. Needs data, not drama.</div>
  </div>
  <div class="cd">
    <div class="cd-h">🪶 The Falcon — Coordinator</div>
    <div class="cd-t">Saqr (صقر)</div>
    <div class="cd-b">The Gulf region coordinator. Bilingual, culturally grounded, bridging tradition and innovation. Named "Saqr" (falcon in Arabic) to resonate with Gulf audiences.</div>
  </div>
</div>

<div class="cr">
  <div class="cd cd-f">
    <div class="cd-h">🐱 The Cat — Student</div>
    <div class="cd-t">Noor (نور)</div>
    <div class="cd-b">The student. Curious, digital-native, wants to learn but hates busywork. Represents the student voice. Named "Noor" (light in Arabic). Phone always in hand, amber eyes (XP color).</div>
  </div>
</div>

<div class="divider"></div>

### Character Visual Specifications (For Designer)

| Character | Color Palette | Key Props | Expression Range | Visual Style |
|-----------|--------------|-----------|-----------------|-------------|
| **Foxi** | Teal-to-blue gradient fur (brand colors) | Tiny graduation cap tilted sideways, clipboard | Confident, mischievous, warm, pointing, waving | Minimalist flat illustration. Expressive eyes. |
| **Prof. Hoot** | Warm brown tones | Round glasses, coffee mug (always), messy feathers | Exhausted, relieved, surprised, dead-inside-but-professional | Dark circles under eyes. Relatable. |
| **Dean Talon** | Gold and navy tones | Subtle tie, tablet showing dashboards | Strategic, confident, impressed, concerned | Sharp, well-groomed. Executive energy. |
| **Saqr** | Teal accents, elegant | Subtle keffiyeh-inspired pattern, curriculum map | Proud, thoughtful, presenting, bridging | Elegant. Cultural without being stereotypical. |
| **Noor** | Bright amber eyes (XP color) | Headphones around neck, phone in hand | Curious, bored, determined, celebrating, confident | Young, energetic. Digital-native body language. |

<div class="co co-b"><strong>Illustration Style:</strong> Flat, minimal detail, expressive poses. Think Headspace meets Duolingo. Not cartoonish, not corporate. Characters should feel warm and approachable on LinkedIn — professional enough for deans, fun enough for students.</div>
</div>


<!-- ══════════ S3: DESIGN SYSTEM ══════════ -->
<div class="ns">
<span class="sl">Visual Identity</span>

## 3. Design System for LinkedIn Posts

<p class="ns-sub">Every post shares these visual constants so the feed looks like one cohesive brand, not random content.</p>

### Color Palette

<div class="sr">
  <div class="st"><div class="st-v" style="color:#13BFA6;">■</div><div class="st-l">Teal #13BFA6</div></div>
  <div class="st"><div class="st-v" style="color:#1F6FEB;">■</div><div class="st-l">Blue #1F6FEB</div></div>
  <div class="st"><div class="st-v" style="color:#0B1220;">■</div><div class="st-l">Navy #0B1220</div></div>
  <div class="st"><div class="st-v" style="color:#F59E0B;">■</div><div class="st-l">Amber #F59E0B</div></div>
  <div class="st"><div class="st-v" style="color:#FFFFFF; text-shadow: 0 0 2px #ccc;">■</div><div class="st-l">White #FFFFFF</div></div>
</div>

### Typography & Layout

| Element | Specification |
|---------|--------------|
| Font | Clean sans-serif (Inter or Noto Sans). Bold headlines, light body. Arabic: Noto Sans Arabic |
| Carousel frame | Consistent border/margin. Edeviser logo watermark bottom-right. Slide number indicator top-right |
| Single post frame | Character + bold text overlay. Gradient background (brand teal-to-blue or dark navy) |
| Carousel size | 1080×1080px (square) or 1080×1350px (portrait, higher engagement) |
| Single post size | 1200×1200px (square) |

### Recurring Visual Motifs

| Motif | Where It Appears | Purpose |
|-------|-----------------|---------|
| XP sparkles (amber) | Student-focused slides | Gamification visual language |
| Streak flames (red-orange) | Habit/engagement slides | Energy, momentum |
| Bloom's color pills | OBE educational slides | Domain expertise signal |
| Graduation caps | Cover slides, celebrations | Education context |
| Coffee mugs | Prof. Hoot scenes | Faculty relatability |
| Doha skyline (stylized) | Gulf-focused posts | Regional grounding |
| Islamic geometric patterns | Border accents on Gulf posts | Cultural respect, not decoration |

### Brand Gradients (Match Product)

| Gradient | CSS | Usage |
|----------|-----|-------|
| Brand Primary | `linear-gradient(93.65deg, #14B8A6 5%, #0382BD 79%)` | Card headers, CTA slides |
| Hero Dark | `linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)` | Cover slides, dramatic moments |
| Warm Sunrise | Teal → Amber → Gold | Hopeful/celebratory slides |

<div class="co"><strong>Logo Placement:</strong> Edeviser logo appears as a small watermark (bottom-right) on every carousel slide and every single-image post. On cover slides and CTA slides, the logo is larger and centered. The logo from <code>public/logos/e deviser logo 2.jpg</code> is the primary mark.</div>

<div class="divider"></div>

### Bilingual Design Rules

- Arabic appears in Gulf-focused posts (Days 4, 8, 13, 14) and milestone announcements
- Arabic text uses Noto Sans Arabic, right-aligned when standalone
- Bilingual slides: English headline top, Arabic translation bottom, separated by a thin teal line
- Arabic is woven in naturally as part of the brand identity, not as a separate "Arabic version"
- Character names Saqr (صقر) and Noor (نور) always include Arabic script on first mention
</div>


<!-- ══════════ S4: CONTENT PILLARS ══════════ -->
<div class="ns">
<span class="sl">Content Strategy</span>

## 4. Content Pillars

<p class="ns-sub">6 rotating themes that ensure every audience segment is covered across the 14 days.</p>

| Pillar | What It Covers | Character Lead | Target Audience |
|--------|---------------|----------------|-----------------|
| **OBE Reality Check** | The broken state of OBE implementation, what ABET actually requires vs. what we do | Prof. Hoot, Saqr | Faculty, coordinators |
| **Student Experience** | Why students are disengaged, the feedback loop problem, gamification as a solution | Noor, Foxi | Students, progressive faculty |
| **Institutional Intelligence** | Data-driven decisions, accreditation readiness, admin dashboards | Dean Talon, Foxi | Deans, VPs, administrators |
| **Gulf Focus** | Qatar/GCC education landscape, QNV 2030, bilingual challenges, regional OBE mandates | Saqr, Dean Talon | Gulf education leaders |
| **Product Glimpse** | Subtle feature reveals through character stories, never a product screenshot dump | Foxi (narrator) | All audiences |
| **Company Milestone** | Qatar incorporation, team updates, founder journey | All characters | Network, investors, partners |

<div class="hb">
  <h3>🎯 Posting Rhythm</h3>
  <p>14 posts over 14 days (1 post/day). Mix: 6 carousels + 8 single-image posts. Best times for Gulf LinkedIn: Sunday–Thursday, 8–10 AM GST or 12–1 PM GST. Qatar incorporation announcement lands on Day 8 after building audience context.</p>
</div>
</div>


<!-- ══════════ S5: THE 14 POSTS ══════════ -->
<div class="ns">
<span class="sl">The Playbook</span>

## 5. The 14-Day Post Calendar

<p class="ns-sub">Each post includes: LinkedIn caption, slide-by-slide content, and detailed design direction for the designer.</p>

---

### DAY 1 — Carousel (7 slides) | "The OBE Machine Is Eating Us"

<div class="co co-o"><strong>Pillar:</strong> OBE Reality Check &nbsp;|&nbsp; <strong>Lead:</strong> Prof. Hoot &nbsp;|&nbsp; <strong>Goal:</strong> Hook. Establish credibility. Make faculty feel seen.</div>

**LinkedIn Caption:**

> Every university visit. Same conversation. CLOs. PLOs. PEOs. Bloom's C1 to C6. Every question tagged. Every mark entered part by part. We built a machine. But the machine is eating us. MIT does not do it this way. ABET does not require it. So why are we? Swipe to see what OBE was supposed to be vs. what it became.

| Slide | Content | Design Direction for Designer |
|-------|---------|-------------------------------|
| 1 (Cover) | "The OBE Machine Is Eating Us" | Dark navy gradient. Prof. Hoot slumped over desk buried in papers, coffee spilled. Papers have tiny CLO/PLO labels. Edeviser logo bottom-right. Dramatic, moody lighting. |
| 2 | "What faculty actually do every semester:" — Tag every question to a Bloom's verb, enter marks part by part, map CLOs to PLOs, fill compliance spreadsheets | Prof. Hoot running on a hamster wheel made of spreadsheet cells. Each spoke labeled with an OBE task. Teal accent lines. |
| 3 | "What ABET actually requires:" — A systematic process. Evidence of outcomes. Honest corrective action. That is it. | Clean, minimal. Three teal checkmarks. Foxi in corner holding magnifying glass, pointing at the simplicity. |
| 4 | "The hyper-granular approach is a regional interpretation, not a universal ABET mandate." | Split: left = tangled web of mappings (chaotic, red-tinted). Right = clean simple flow (calm, teal-tinted). Saqr in middle gesturing toward clean side. |
| 5 | "How MIT, Carnegie Mellon, and Stanford do OBE:" — Focus on meaningful evidence. Assess at program level. No verb policing. | Three stylized university crests. Prof. Hoot looking through binoculars, surprised. Speech bubble: "Wait, they don't do this?" |
| 6 | "OBE in its original spirit: Rigorous without being punishing. Better graduates, not better paperwork." | Warm, hopeful. Noor and Prof. Hoot standing together, smiling. Sunrise gradient (teal to amber). |
| 7 (CTA) | "We are building something that brings OBE back to its purpose. Follow along." | Brand gradient background. Foxi centered, waving. Edeviser logo prominent. |

<div class="divider"></div>

### DAY 2 — Single Post | "The Bloom's Verb Debate"

<div class="co"><strong>Pillar:</strong> OBE Reality (humor) &nbsp;|&nbsp; <strong>Lead:</strong> Prof. Hoot &nbsp;|&nbsp; <strong>Goal:</strong> Relatability. Get faculty to tag colleagues.</div>

**LinkedIn Caption:**

> Every OBE committee meeting ever: "Is 'analyze' a C4 or C5?" "It depends on the context." "But the rubric says..." [3 hours later]. Tag a colleague who has lived this.

**Design Direction:** Prof. Hoot at a long meeting table with 5 empty coffee cups. Whiteboard behind him covered in crossed-out Bloom's verbs. Expression: dead inside but still professional. Speech bubbles floating with verb debate quotes. Text overlay top: "Every. Single. Semester." Bloom's taxonomy color pills scattered (purple, blue, green, yellow, orange, red). Edeviser logo bottom-right.

<div class="divider"></div>

### DAY 3 — Carousel (6 slides) | "What Your Students Actually Experience"

<div class="co co-b"><strong>Pillar:</strong> Student Experience &nbsp;|&nbsp; <strong>Lead:</strong> Noor &nbsp;|&nbsp; <strong>Goal:</strong> Shift perspective. Show the student side of the OBE problem.</div>

**LinkedIn Caption:**

> We talk about CLOs, PLOs, and accreditation all day. But have you asked your students what they experience? Here is what Noor sees. Swipe. It might change how you think about your next semester.

| Slide | Content | Design Direction |
|-------|---------|-----------------|
| 1 (Cover) | "What Your Students Actually Experience" | Dark navy. Noor centered, looking at phone, confused. Phone screen glowing. |
| 2 | Timeline: Monday submits → 3 weeks of nothing → Gets a grade. No feedback. Just a number. | Timeline flowing downward. Noor waiting at each node, progressively more bored. Grade drops as cold red number. |
| 3 | "She does not know which skills she is building. She does not know how this connects to her career." | Three question marks floating around Noor: "What skill?", "Why this?", "Am I growing?". Muted palette. |
| 4 | "The institution has all the data. But none of it reaches the student." | Split screen: Left = Dean Talon's dashboard full of charts. Right = Noor's empty screen. Wall between them. |
| 5 | "What if the student could see their own growth? What if every submission felt like progress?" | Bright, hopeful. Noor smiling, phone showing XP bar, streak flame, CLO progress. Foxi next to her. Teal-to-amber gradient. |
| 6 (CTA) | "The feedback loop is broken. We are fixing it. Follow Edeviser." | Brand gradient. Foxi and Noor together. Edeviser logo. |

<div class="divider"></div>

### DAY 4 — Single Post | "Saqr's Gulf Education Fact"

<div class="co"><strong>Pillar:</strong> Gulf Focus &nbsp;|&nbsp; <strong>Lead:</strong> Saqr &nbsp;|&nbsp; <strong>Goal:</strong> Position as Gulf-aware. Bilingual.</div>

**LinkedIn Caption:**

> Qatar has 12 universities and 30+ technical colleges. QNV 2030 mandates world-class education outcomes. But most are still using spreadsheets. The Gulf does not have a quality problem. It has a tooling problem. قطر لا تعاني من مشكلة في الجودة. بل في الأدوات.

**Design Direction:** Saqr standing confidently in front of stylized Doha skyline (towers silhouette). Holding tablet showing curriculum matrix. Bilingual: English headline top, Arabic bottom. Teal and gold palette. Subtle Islamic geometric pattern in background border. Data callouts floating: "12 universities", "30+ colleges", "QNV 2030". Edeviser logo bottom-right.

<div class="divider"></div>

### DAY 5 — Carousel (7 slides) | "5 Things ABET Does NOT Require"

<div class="co co-o"><strong>Pillar:</strong> OBE Reality (educational) &nbsp;|&nbsp; <strong>Lead:</strong> Foxi + Prof. Hoot &nbsp;|&nbsp; <strong>Goal:</strong> Thought leadership. Save-worthy content.</div>

**LinkedIn Caption:**

> This might be controversial. After studying how MIT, Stanford, and Carnegie Mellon implement OBE under ABET, we found something surprising. 5 things you are probably doing that ABET does not mandate. Save this for your next curriculum committee meeting.

| Slide | Content | Design Direction |
|-------|---------|-----------------|
| 1 (Cover) | "5 Things ABET Does NOT Require (That You Are Probably Doing)" | Bold red "NOT" on white. Foxi holding clipboard with items crossed out. Prof. Hoot in background, shocked. |
| 2 | "1. Question-level CLO tagging." | Big red X over exam paper with tiny CLO tags. Foxi pointing with "nope" expression. |
| 3 | "2. Bloom's verb policing for every assessment." | Prof. Hoot erasing whiteboard of Bloom's verbs. Relief on face. Foxi thumbs up. |
| 4 | "3. Part-by-part mark entry into OBE software." | Massive spreadsheet being crumpled into ball. Foxi tossing it into bin. |
| 5 | "4. Mapping every single assessment to every single CLO." | Left: overwhelming spider web. Right: clean sampled approach. |
| 6 | "5. Identical OBE processes across all departments." | Different department icons (gear, chart, flask) each with own simple flow. |
| 7 (CTA) | "OBE should serve graduates, not generate paperwork. Follow Edeviser." | Warm gradient. All characters in a line. Foxi center. Edeviser logo. |

<div class="divider"></div>

### DAY 6 — Single Post | "The Grading Night"

<div class="co co-b"><strong>Pillar:</strong> Faculty + Student &nbsp;|&nbsp; <strong>Lead:</strong> Prof. Hoot + Noor &nbsp;|&nbsp; <strong>Goal:</strong> Emotional connection. Show both sides.</div>

**LinkedIn Caption:**

> 11 PM. Prof. Hoot is grading 47 submissions. For each one: rubric criteria, marks per CLO, feedback, attainment, spreadsheet. Meanwhile, Noor submitted 3 weeks ago and has heard nothing. She thinks nobody cares. He cares. He is just buried. The system failed both of them.

**Design Direction:** Split screen illustration. Left: Prof. Hoot at desk at night, lamp on, papers everywhere, clock showing 11 PM. Right: Noor in dorm, looking at phone showing "No updates", disappointed. Moody warm lighting on Prof. Hoot's side. Cool blue-tinted on Noor's side. Dotted line connects them but is broken in the middle. Text bottom: "The system failed both of them." Edeviser logo bottom-right.

<div class="divider"></div>

### DAY 7 — Carousel (8 slides) | "The Dual-Engine"

<div class="co co-a"><strong>Pillar:</strong> Product Glimpse &nbsp;|&nbsp; <strong>Lead:</strong> Foxi (narrator) &nbsp;|&nbsp; <strong>Goal:</strong> First real product concept reveal.</div>

**LinkedIn Caption:**

> What if accreditation compliance and student engagement were not two separate problems? What if every time a teacher graded, the system auto-generated evidence AND rewarded the student? We call it the Dual-Engine Architecture. Swipe to see how it works. No screenshots. Just the idea.

| Slide | Content | Design Direction |
|-------|---------|-----------------|
| 1 (Cover) | "What if compliance and engagement were the same thing?" | Dark navy. Foxi holding two glowing orbs: teal (compliance), amber (engagement). |
| 2 | "Today, universities run two separate machines that do not talk to each other." | Two disconnected gears. Prof. Hoot operating one, Noor stuck in other. Red X between. |
| 3 | "Engine 1: OBE Core. Grade → Evidence → CLO → PLO → ILO → Report. Always ready." | Clean flow diagram. Foxi walking along path. Teal color scheme. |
| 4 | "Engine 2: Habit Core. Submit → XP → Streak → Badge → Progress bar fills." | Noor's journey with gamification elements. Amber/gold scheme. |
| 5 | "The magic: they are the same event." | Two gears now interlocked, spinning. Green glow. Foxi conducting on top. |
| 6 | "For the teacher: Grade once. Evidence auto-generated. No separate OBE form." | Prof. Hoot relaxed, feet up, coffee in hand. Single checkmark floating. |
| 7 | "For the student: Every submission feels like progress." | Noor jumping with joy. Phone glowing with XP/level/streak. Confetti. |
| 8 (CTA) | "Compliance generates engagement. Engagement generates evidence. One loop. Edeviser." | Brand gradient. Interlocked gears as symbol. All 5 characters in row. Edeviser logo prominent. |

<div class="divider"></div>

### DAY 8 — Single Post | "We Are Now in Qatar" 🇶🇦

<div class="hb">
  <h3>🏢 Company Milestone — Qatar QFC Incorporation</h3>
  <p>This is the anchor post of the 14-day campaign. It lands after 7 days of context-building, so the audience already understands what Edeviser is and why Qatar matters.</p>
</div>

**LinkedIn Caption:**

> It is official. Edeviser is now incorporated in Qatar through the Qatar Financial Centre. We came here because the Gulf is where OBE meets ambition. Where QNV 2030 demands world-class education outcomes. We are not here to sell software. We are here to partner with universities that want accreditation without the burnout. Doha, we are ready. الدوحة، نحن جاهزون.

**Design Direction:** All 5 characters standing together in front of stylized Doha skyline. Foxi center holding QFC certificate (stylized). Saqr looking proud. Prof. Hoot and Dean Talon flanking. Noor taking a selfie of the group. Celebratory but professional. Golden hour lighting. Teal and gold palette. Text: "Edeviser is now in Qatar." Bilingual Arabic line at bottom. Subtle confetti (teal and gold). Edeviser logo prominent.

<div class="divider"></div>

### DAY 9 — Carousel (6 slides) | "What Accreditation Bodies Actually Want"

<div class="co"><strong>Pillar:</strong> Institutional Intelligence &nbsp;|&nbsp; <strong>Lead:</strong> Dean Talon + Foxi &nbsp;|&nbsp; <strong>Goal:</strong> Speak to decision-makers.</div>

**LinkedIn Caption:**

> Deans and QA directors: this one is for you. We studied what ABET, AACSB, and NCAAA actually evaluate. It is simpler than you think. 6 slides. Save this before your next self-study.

| Slide | Content | Design Direction |
|-------|---------|-----------------|
| 1 (Cover) | "What Accreditation Bodies Actually Want to See" | Dean Talon adjusting glasses, looking at document. Professional, authoritative. Dark navy. |
| 2 | "1. Evidence that graduates achieve program outcomes." | Dean Talon pointing at simple evidence chain. Icons: student work, survey, data chart. |
| 3 | "2. A systematic process. Key word: systematic. Not exhaustive." | Foxi drawing cycle: Plan → Assess → Analyze → Improve. Circle diagram. |
| 4 | "3. Closing the loop. Did you use the data? Did anything change?" | Loop diagram. Arrow to "improve" is broken. Foxi repairing with wrench. |
| 5 | "4. Faculty engagement in the process. Not data entry. Discussion and decisions." | Prof. Hoot in meeting, engaged and talking (not buried in spreadsheets). |
| 6 (CTA) | "Accreditation is about improvement, not documentation. That is what we do." | Brand gradient. Dean Talon and Foxi side by side. Edeviser logo. |

<div class="divider"></div>

### DAY 10 — Single Post | "Foxi's Hot Take"

<div class="co co-o"><strong>Pillar:</strong> OBE Reality (opinion) &nbsp;|&nbsp; <strong>Lead:</strong> Foxi &nbsp;|&nbsp; <strong>Goal:</strong> Engagement bait. Spark debate.</div>

**LinkedIn Caption:**

> Foxi's hot take of the week: "If your OBE process requires more hours than your actual teaching, you are not doing OBE. You are doing paperwork cosplaying as education." Agree or disagree? Drop your take below.

**Design Direction:** Foxi leaning against wall, arms crossed, one eyebrow raised. Confident, slightly provocative. Bold quote card on dark navy background. Quote in large white text. Foxi on right third. Teal accent on quote marks. Amber highlight on "paperwork cosplaying as education." Designed to be screenshot-worthy. Edeviser logo bottom-right.

<div class="divider"></div>

### DAY 11 — Carousel (7 slides) | "The Student Nobody Saw Coming"

<div class="co co-b"><strong>Pillar:</strong> Student + Gamification &nbsp;|&nbsp; <strong>Lead:</strong> Noor &nbsp;|&nbsp; <strong>Goal:</strong> Storytelling. Show gamification through narrative.</div>

**LinkedIn Caption:**

> This is Noor. Start of semester: invisible. Average grades. No engagement. By week 8: top 10% of her program. Not because the content changed. Because the system changed. Swipe to see what happened.

| Slide | Content | Design Direction |
|-------|---------|-----------------|
| 1 (Cover) | "The Student Nobody Saw Coming" | Dark, moody. Noor's silhouette barely visible. Mysterious. |
| 2 | "Week 1: First login. 10 XP. A small flame: Day 1 streak." | Noor looking at phone, mildly curious. Tiny flame. Muted colors. |
| 3 | "Week 2: On-time submission. 50 XP. 7-day streak. Badge: 7-Day Warrior." | Noor smiling, showing phone to friend. Badge animation. Colors warming. |
| 4 | "Week 4: Checks CLO progress. First time she sees which skills she is building." | Noor looking at progress dashboard. CLO bars visible. Focused, determined. |
| 5 | "Week 6: First reflection journal. 20 XP. She has never reflected on her learning before." | Noor writing on phone. Warm, contemplative mood. |
| 6 | "Week 8: Level 5. Top 10%. 30-day streak. 4 badges. Teacher notices." | Noor standing tall. Badges floating. Leaderboard showing her name. Prof. Hoot impressed in background. |
| 7 (CTA) | "Noor did not change. The system around her did. That is what Edeviser builds." | All characters. Noor center. Brand gradient. Edeviser logo. |

<div class="divider"></div>

### DAY 12 — Single Post | "The Dean's Dashboard Dream"

<div class="co"><strong>Pillar:</strong> Institutional Intelligence &nbsp;|&nbsp; <strong>Lead:</strong> Dean Talon &nbsp;|&nbsp; <strong>Goal:</strong> Speak to administrators. Paint the vision.</div>

**LinkedIn Caption:**

> Dean Talon's dream: Open one dashboard. See institution-wide PLO attainment. Drill down to any program, course, student. Export PDF in 30 seconds. No spreadsheet compilation. No 2-week data sprint. Just evidence. Always current. That is not a dream. That is what we built.

**Design Direction:** Dean Talon in modern office, tablet in hand showing clean dashboard with PLO attainment heatmap. Relaxed, confident. Window behind showing Gulf city skyline. Navy, teal, gold accents. Executive feel. Dashboard on tablet looks real but illustrated. No text overlay on image. Edeviser logo bottom-right.

<div class="divider"></div>

### DAY 13 — Carousel (6 slides) | "OBE: Gulf Edition vs. Global Reality"

<div class="co co-a"><strong>Pillar:</strong> Gulf Focus + OBE Reality &nbsp;|&nbsp; <strong>Lead:</strong> Saqr + Foxi &nbsp;|&nbsp; <strong>Goal:</strong> Regional relevance.</div>

**LinkedIn Caption:**

> The Gulf is investing billions in education. QNV 2030. Saudi Vision 2030. UAE Centennial 2071. Every institution chasing accreditation. But the tools have not caught up with the ambition. Swipe. This is why we moved to Qatar.

| Slide | Content | Design Direction |
|-------|---------|-----------------|
| 1 (Cover) | "OBE: Gulf Edition vs. Global Reality" | Stylized geometric Gulf map. Saqr on Qatar. Foxi on globe. |
| 2 | "The Gulf ambition: World-class graduates. $7.2B GCC EdTech by 2027." | Saqr presenting data. Gold and teal infographic. Upward arrows. |
| 3 | "The current reality: Manual processes. Spreadsheets. Faculty burnout." | Contrast: ambition (gold, upward) vs. reality (grey, flat). Honest. |
| 4 | "Global best practice: Program-level assessment. Sampling. Faculty-led improvement." | Three stylized flags. Simple flows. Foxi as tour guide. |
| 5 | "The Gulf opportunity: Leapfrog. Build the right approach from the start." | Saqr and Foxi pointing forward. Arabic and English side by side. Bright, optimistic. |
| 6 (CTA) | "We moved to Qatar because this is where the future of education is being built." | Brand gradient. Subtle Islamic geometric border. Bilingual. Edeviser logo. |

<div class="divider"></div>

### DAY 14 — Single Post | "Foxi's Promise"

<div class="hb">
  <h3>🦊 The Closing Post — Setting Up What Comes Next</h3>
  <p>This post closes the 14-day arc and invites the audience into the ongoing story. All 5 characters appear together for the final time in this sprint.</p>
</div>

**LinkedIn Caption:**

> 14 days ago, we started a conversation. About OBE that serves graduates, not paperwork. About students who deserve to see their own growth. About faculty who should teach, not do data entry. About a Gulf region building the future of education. This is just the beginning. Foxi, Prof. Hoot, Dean Talon, Saqr, and Noor are not going anywhere. Neither are we. Follow Edeviser. هذه مجرد البداية.

**Design Direction:** All 5 characters walking together toward a horizon. Foxi in front, looking back at viewer with warm smile and wave. Sunrise/sunset gradient (teal to amber to gold). Cinematic, wide format. Emotional but not cheesy. Characters walking INTO the future, Foxi inviting you along. Text top: "This is just the beginning." Arabic at bottom. Edeviser logo centered below characters.
</div>


<!-- ══════════ S6: SUMMARY TABLE ══════════ -->
<div class="ns">
<span class="sl">Quick Reference</span>

## 6. Post Summary Table (Designer Cheat Sheet)

| Day | Type | Title | Lead Character | Slides | Pillar | Mood |
|-----|------|-------|---------------|--------|--------|------|
| 1 | Carousel | The OBE Machine Is Eating Us | Prof. Hoot | 7 | OBE Reality Check | Dramatic, empathetic |
| 2 | Single | The Bloom's Verb Debate | Prof. Hoot | — | OBE Reality (humor) | Funny, relatable |
| 3 | Carousel | What Your Students Actually Experience | Noor | 6 | Student Experience | Eye-opening, emotional |
| 4 | Single | Gulf Education Fact | Saqr | — | Gulf Focus | Professional, bilingual |
| 5 | Carousel | 5 Things ABET Does NOT Require | Foxi + Prof. Hoot | 7 | OBE Reality (educational) | Bold, shareable |
| 6 | Single | The Grading Night | Prof. Hoot + Noor | — | Faculty + Student | Empathetic, moody |
| 7 | Carousel | The Dual-Engine | Foxi (narrator) | 8 | Product Glimpse | Visionary, exciting |
| 8 | Single | We Are Now in Qatar 🇶🇦 | All characters | — | Company Milestone | Celebratory, professional |
| 9 | Carousel | What Accreditation Bodies Want | Dean Talon + Foxi | 6 | Institutional Intel | Authoritative, practical |
| 10 | Single | Foxi's Hot Take | Foxi | — | OBE Reality (opinion) | Bold, provocative |
| 11 | Carousel | The Student Nobody Saw Coming | Noor | 7 | Student + Gamification | Storytelling, inspiring |
| 12 | Single | The Dean's Dashboard Dream | Dean Talon | — | Institutional Intel | Aspirational, clean |
| 13 | Carousel | OBE: Gulf Edition vs. Global Reality | Saqr + Foxi | 6 | Gulf Focus | Regional, ambitious |
| 14 | Single | Foxi's Promise | All characters | — | Brand / All | Warm, cinematic, hopeful |
</div>


<!-- ══════════ S7: BRAND RULES ══════════ -->
<div class="ns">
<span class="sl">Brand Consistency</span>

## 7. What Ties It All Together

<p class="ns-sub">7 rules that make 14 posts feel like one interconnected brand, not random content.</p>

<div class="cr">
  <div class="cd">
    <div class="cd-h">Rule 1</div>
    <div class="cd-t">Characters in Every Post</div>
    <div class="cd-b">Even single-image posts feature at least one character. The audience builds a relationship with them, not with a logo. Foxi appears in every post, even as a small corner cameo.</div>
  </div>
  <div class="cd">
    <div class="cd-h">Rule 2</div>
    <div class="cd-t">Visual Constants Never Change</div>
    <div class="cd-b">Same color palette, same illustration style, same typography, same frame layout. A viewer scrolling past should recognize an Edeviser post before reading a word.</div>
  </div>
</div>

<div class="cr">
  <div class="cd">
    <div class="cd-h">Rule 3</div>
    <div class="cd-t">Emotional Arc Across 14 Days</div>
    <div class="cd-b">Posts follow a narrative: Problem → Insight → Solution → Authority → Story → Vision. Each post builds on the last. Not random.</div>
  </div>
  <div class="cd">
    <div class="cd-h">Rule 4</div>
    <div class="cd-t">Foxi Is the Thread</div>
    <div class="cd-b">Even when not the lead, Foxi appears reacting, pointing, or narrating. Over time, people associate the teal fox with "the OBE people who actually get it."</div>
  </div>
</div>

<div class="cr">
  <div class="cd">
    <div class="cd-h">Rule 5</div>
    <div class="cd-t">Bilingual Touches Are Natural</div>
    <div class="cd-b">Arabic appears in Gulf-focused posts and milestones. Woven in as part of the brand identity, not a separate "Arabic version."</div>
  </div>
  <div class="cd">
    <div class="cd-h">Rule 6</div>
    <div class="cd-t">No Hard Sell Until Day 7</div>
    <div class="cd-b">First 6 posts build credibility. Product concept on Day 7 as a natural answer. Qatar announcement on Day 8 lands with context. Earn attention first.</div>
  </div>
</div>

<div class="cr">
  <div class="cd cd-f">
    <div class="cd-h">Rule 7</div>
    <div class="cd-t">Every Post Has a Clear Action</div>
    <div class="cd-b">Tag a colleague. Save this. Swipe. Agree or disagree. Follow. The CTA varies but is always present and natural. Never "check out our website."</div>
  </div>
</div>

<div class="co co-o"><strong>What This Is NOT:</strong> Not corporate announcements with stock photos. Not alternating funny/serious with no connection. Not product screenshots with feature lists. Not "we are excited to announce" energy. Not English-only ignoring the Gulf. Not talking AT the audience but WITH them through characters they recognize.</div>
</div>


<!-- ══════════ S8: ENGAGEMENT ══════════ -->
<div class="ns">
<span class="sl">Post-Publishing</span>

## 8. Engagement Playbook

<p class="ns-sub">What to do in the first 2 hours after every post goes live.</p>

### For Each Post (First 2 Hours)

1. Founders comment with a personal take (not "great post!" — a real opinion or story)
2. Reply to every comment within 1 hour. Use character voice where appropriate ("Prof. Hoot would agree")
3. Share to relevant LinkedIn groups (Gulf Education, OBE practitioners, EdTech founders)
4. Cross-post key carousels to founder personal profiles with personal framing

### Hashtag Strategy

| Always Use (Brand) | Rotate By Topic | Gulf-Specific |
|-------------------|----------------|---------------|
| #Edeviser | #OBE #BloomsTaxonomy | #Qatar #QNV2030 |
| #EdTech | #Accreditation #ABET | #GulfEducation |
| #HigherEducation | #FacultyLife #StudentSuccess | #NCAAA #AACSB |

### Target Metrics (14-Day Sprint)

<div class="sr">
  <div class="st"><div class="st-v">50K+</div><div class="st-l">Total Impressions</div></div>
  <div class="st"><div class="st-v">5%+</div><div class="st-l">Carousel Engagement</div></div>
  <div class="st"><div class="st-v">500+</div><div class="st-l">New Followers</div></div>
  <div class="st"><div class="st-v">200+</div><div class="st-l">Saves</div></div>
  <div class="st"><div class="st-v">5+</div><div class="st-l">Educator DMs</div></div>
</div>
</div>


<!-- ══════════ S9: CONTINUATION ══════════ -->
<div class="ns">
<span class="sl">Beyond Day 14</span>

## 9. Post-14-Day: What Comes Next

<p class="ns-sub">The 14-day sprint establishes the brand universe. Here is how it continues.</p>

### Weekly Cadence (Ongoing)

3–4 posts per week: 2 carousels + 1–2 singles

### New Content Series

<div class="cr">
  <div class="cd">
    <div class="cd-h">Weekly Series</div>
    <div class="cd-t">Foxi Explains</div>
    <div class="cd-b">Educational carousel. Foxi breaks down one OBE concept per week in plain language. Save-worthy, shareable.</div>
  </div>
  <div class="cd">
    <div class="cd-h">Weekly Series</div>
    <div class="cd-t">Prof. Hoot's Week</div>
    <div class="cd-b">Faculty humor and relatability. One post per week showing the reality of academic life through Prof. Hoot.</div>
  </div>
</div>

<div class="cr">
  <div class="cd">
    <div class="cd-h">Bi-Weekly Series</div>
    <div class="cd-t">Noor's Progress</div>
    <div class="cd-b">Ongoing student story. Track Noor's semester journey — new badges, streak milestones, CLO breakthroughs.</div>
  </div>
  <div class="cd">
    <div class="cd-h">Monthly Series</div>
    <div class="cd-t">Saqr's Gulf Report</div>
    <div class="cd-b">Regional insights. Accreditation news, university updates, QNV 2030 progress — through Saqr's lens.</div>
  </div>
</div>

### Future Expansions

- **Video:** Short character animations (15–30 sec) for higher engagement. Foxi narrating OBE concepts
- **User-Generated:** Invite faculty to share OBE frustrations. Feature them with character illustrations
- **Events:** Character-branded webinar invitations. "Join Foxi and Dean Talon for a live session on accreditation readiness"
- **New Characters:** Parent character, QA auditor character — the universe is extensible as the audience grows

<div class="hb">
  <h3>🦊 The Long Game</h3>
  <p>The characters grow with the brand. By month 3, people should see a teal fox and think "Edeviser." By month 6, faculty should tag @Edeviser when they complain about OBE paperwork. That is the Duolingo effect — applied to higher education.</p>
</div>

<div class="df">
  <strong>Edeviser</strong> — LinkedIn 14-Day Launch Playbook v1.0<br/>
  April 2026 · Confidential · For Internal + Design Team Use
</div>
</div>

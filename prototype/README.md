# Edeviser — Clickable Prototype (Variation A)

A **frontend-only** clickable prototype of the AI-first learning ecosystem across five roles
(Student, Teacher, Parent, Coordinator, Admin).

> ⚠️ This is a mockup. It is **not connected to any backend** — all data is fake/hardcoded,
> the "AI" replies are scripted, and nothing here talks to the real database or the real app.
> It exists only for design review and is safe to delete at any time.

## How to view it

**Start page:** open `roles.html` (the role chooser). Or `start.html`.

- Use the floating dock (bottom-center on desktop, top-right on mobile) to:
  - toggle **📱 Mobile / 💻 Laptop** view,
  - **switch role**,
  - jump between screens.
- Role dashboards look best in **💻 Laptop** mode.

### Option 1 — just open the files
Open `roles.html` in any browser. (Needs internet: it loads Tailwind + fonts from a CDN.)

### Option 2 — run a tiny local server
```bash
npx serve .
# then open the printed http://localhost:3000/roles.html
```

## How to share with a reviewer (live link)

From **inside this `prototype/` folder** (so only the prototype is deployed, never the real app):
```bash
npx vercel deploy --prod
```
Vercel will ask for a project name (e.g. `edeviser-prototype`) and give you a shareable URL.
`vercel.json` redirects the root URL to the role chooser.

### How to remove it later
```bash
npx vercel remove edeviser-prototype   # or delete the project in the Vercel dashboard
```
Removing the deployment (or deleting the git branch it lives on) has **zero impact** on the real app.

## Structure
- `roles.html` / `start.html` — entry / role chooser
- `dashboard.html`, `lesson.html`, `review.html`, `tutor.html`, `path.html`, … — student experience
- `teacher-*.html`, `parent-*.html`, `coordinator-*.html`, `admin-*.html` — other roles
- `shared.css` / `shared.js` — the role-aware shell (nav, rail, search, notifications)

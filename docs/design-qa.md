# Calendar prototype design QA

**Source visual truth**

- User-provided calendar reference screenshot (July 2026 prototype layout, 1916 × 786 px).
- Repository source prototype: `prototype/calendar.html` and its calendar styles in `prototype/shared.css`.

**Implementation evidence**

- Local authenticated route: `http://127.0.0.1:4173/student/calendar`
- Screenshot: `output/playwright/calendar-shell-qa.png`
- Viewport: 1916 × 786 CSS px, device scale factor 1.
- State: local student demo login, English, Month view, live calendar/timetable/deadline queries loaded.

**Comparison**

Full-view comparison verified the shared dashboard header and left navigation remain present, while the calendar content uses the prototype month grid, Monday-first day order, colored event chips, legend, and a dedicated right rail for classes, deadlines, and tasks.

Focused checks verified the Month/Agenda toggle, previous/next month controls, Today control, Add task links, live timetable cards, deadline urgency pills, and planner task empty state.

**Findings**

- No actionable P0, P1, or P2 visual findings remain.
- P3: The live route opens on the current month (August 2026) and live student data, while the static reference shows July 2026 sample data. This is intentional so the UI remains connected to the existing calendar, timetable, deadline, and planner hooks.

**Comparison history**

- Initial iteration incorrectly replaced the shared app chrome with a standalone header. Fixed by restoring `StudentLayout`/`RoleAppShell` and retaining the existing dashboard header/sidebar.
- Final iteration removes the generic student fallback rail only for `/student/calendar`, leaving the prototype calendar cards as the page-owned right rail.

**Final result:** passed

---

# Journal prototype design QA

**Source visual truth**

- User-provided Journal reference screenshot (reflection composer, journey
  tracker, daily prompt, and past-entry timeline).
- Repository source prototype: `prototype/journal.html` and its scoped journal
  styles.

**Implementation evidence**

- Local authenticated route: `http://127.0.0.1:4173/student/journal`
- State: local student demo login, English, live journal/course queries loaded.
- The shared dashboard header and left navigation remain provided by
  `RoleAppShell`; the page owns only the prototype-style journal body.

**Comparison**

The local route now follows the prototype's body structure: Today's Reflection
composer with word/character feedback and prompt chips, Foxi encouragement,
XP-gated save action, Journaling Journey metrics and seven-day streak, daily
prompt callout, and timeline-style Past Entries. Existing query, course-picker,
mutation, habit-log, and XP behavior remains unchanged.

**Findings**

- No actionable P0, P1, or P2 visual findings remain.
- Live entries and metrics intentionally reflect the authenticated local demo
  data rather than the prototype's static sample values.

**Final result:** passed

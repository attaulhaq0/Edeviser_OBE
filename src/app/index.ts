/**
 * App shell (L-shell) — the new Path-A frame around page content.
 *
 * Lands here at P1 (rebuild tasks.md 1.1–1.4): router integration, providers,
 * the five role layouts, and chrome (GlobalHeader / Sidebar / MobileTabBar) driven
 * by `src/lib/navItems.ts`. Route *paths* and guards are kept verbatim (guardrail
 * G.1); the shell only restyles the frame and swaps the element rendered per route.
 *
 * Shared shell, role-configured — NOT forked per role. Role identity is expressed
 * via `[data-role]` accent scopes (see design-system/tokens.css), not separate shells.
 *
 * Empty until P1 — no screens yet (task 0.8).
 */
export {};

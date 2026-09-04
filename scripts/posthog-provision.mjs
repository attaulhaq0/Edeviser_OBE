#!/usr/bin/env node
// =============================================================================
// PostHog dashboard provisioner — Edeviser (US region)
// =============================================================================
// Creates the four canonical Edeviser dashboards + their trend insights in a
// PostHog project via the official API (v2 /api/projects/:id/… endpoints).
//
// Requires (env):
//   POSTHOG_PERSONAL_API_KEY  — org admin personal API key (with insights:write)
//   POSTHOG_PROJECT_ID        — numeric project id (Project settings → API)
//   POSTHOG_HOST              — default https://us.i.posthog.com
//
// Usage:
//   node scripts/posthog-provision.mjs
//
// Definitions mirror docs/specs/continuous-verification/design.md §Dashboards.
// IDEMPOTENT: safe to re-run — existing dashboards/insights (matched by name)
// are skipped; insights orphaned by earlier buggy runs are re-attached.
//
// No external dependencies (global fetch, Node >= 18).
// =============================================================================

const HOST = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY ?? "";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? "";

if (!API_KEY || !PROJECT_ID) {
  console.error(
    "Missing env: set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID first."
  );
  process.exit(1);
}

const BASE = `${HOST}/api/projects/${PROJECT_ID}`;

/** Trend insight: unique/appearances of an event series over time. */
const trend = (
  name,
  event,
  {
    kind = "unique",
    math = null,
    breakdown = null,
    formula = null,
    anonymize = true,
  } = {}
) => ({
  name,
  filters: {
    insight: "TRENDS",
    events: [
      {
        id: event,
        type: "events",
        name: event,
        math: math ?? (kind === "unique" ? "dau" : "total"),
      },
    ],
    date_from: "-30d",
    display: "ActionsLineGraph",
    interval: "day",
    ...(breakdown ? { breakdown } : {}),
    ...(anonymize ? { filter_test_accounts: true } : {}),
  },
});

/** Funnel insight: conversion between ordered events. */
const funnel = (name, events) => ({
  name,
  filters: {
    insight: "FUNNELS",
    events: events.map((e) => ({ id: e, type: "events", name: e })),
    date_from: "-30d",
    display: "FunnelViz",
    filter_test_accounts: true,
  },
});

/** Dashboards (mirrors design.md §Dashboards). */
const DASHBOARDS = [
  {
    name: "Investor — Users & Engagement",
    insights: [
      trend("Daily active users (real)", "$pageview", { kind: "unique" }),
      trend("Weekly active users (real)", "$pageview", {
        kind: "weekly",
        math: "weekly_active",
      }),
      trend("Sessions started", "$session_id"),
      trend("Sign-ups", "$identify", { math: "dau" }),
      funnel("Signup → first submission", [
        "$identify",
        "assignment_submitted",
      ]),
      trend("Pageviews by role", "$pageview", { breakdown: "role" }),
    ],
  },
  {
    name: "Engine Health — OBE",
    insights: [
      trend("Submissions", "assignment_submitted"),
      trend("Quizzes attempted", "quiz_attempt_submitted"),
      trend("Marketplace purchases", "marketplace_item_purchased"),
      trend("Tutor messages", "tutor_message_sent"),
    ],
  },
  {
    name: "Engine Health — Habit/Gamification",
    insights: [
      trend("Logins (daily)", "$identify", { kind: "unique" }),
      trend("Streak milestone views", "streak_milestone_seen"),
      trend("Badge views", "badge_viewed"),
      trend("Purchases by category", "marketplace_item_purchased", {
        breakdown: "item_category",
      }),
      trend("Tutor response rating (avg)", "tutor_response_rated", {
        math: "avg",
        anonymize: true,
      }),
    ],
  },
  {
    name: "QA & Broken Chains (+AI)",
    insights: [
      trend("Runtime exceptions", "$exception", { kind: "total" }),
      trend("Route errors shown", "route_error_shown"),
      trend("Failed purchases", "marketplace_purchase_failed"),
      trend("Grade→XP drift (graded vs xp_grade_awarded)", "xp_grade_awarded", {
        kind: "total",
      }),
      funnel("Grade release → XP award", ["grade_viewed", "xp_grade_awarded"]),
    ],
  },
];

const request = async (pathOrUrl, init) => {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `${init?.method ?? "GET"} ${pathOrUrl} ${res.status}: ${text.slice(
        0,
        300
      )}`
    );
  }
  return res.json();
};

const get = (pathOrUrl) => request(pathOrUrl);
const post = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path, body) =>
  request(path, { method: "PATCH", body: JSON.stringify(body) });

/** Paginate any PostHog list endpoint into a flat results array. */
const listAll = async (path) => {
  const results = [];
  let next = path;
  while (next) {
    const page = await get(next);
    results.push(...(page.results ?? []));
    next = page.next ?? null;
  }
  return results;
};

const main = async () => {
  // ---------------------------------------------------------------------------
  // Idempotency: index existing dashboards and insights by name BEFORE writing.
  // Re-runs skip what exists, attach orphaned insights, and never duplicate.
  // ---------------------------------------------------------------------------
  const dashboardByName = new Map();
  for (const d of await listAll("/dashboards/?limit=100")) {
    dashboardByName.set(d.name, d.id);
  }

  // insight name -> { id, dashboardIds }
  const insightByName = new Map();
  for (const i of await listAll("/insights/?limit=100")) {
    insightByName.set(i.name, { id: i.id, dashboardIds: i.dashboards ?? [] });
  }

  for (const dashboard of DASHBOARDS) {
    let dashboardId = dashboardByName.get(dashboard.name);
    if (dashboardId) {
      console.log(
        `⏭️  Dashboard "${dashboard.name}" exists (id=${dashboardId}) — reusing`
      );
    } else {
      const created = await post("/dashboards/", {
        name: dashboard.name,
        pinned: false,
      });
      dashboardId = created.id;
      dashboardByName.set(dashboard.name, dashboardId);
      console.log(`✅ Dashboard "${dashboard.name}" -> id=${dashboardId}`);
    }

    for (const insight of dashboard.insights) {
      const existing = insightByName.get(insight.name);
      if (existing) {
        if (existing.dashboardIds.includes(dashboardId)) {
          console.log(`   ⏭️  insight "${insight.name}" — already attached`);
        } else {
          // Orphaned by a previous buggy run (wrong attachment field): repair.
          await patch(`/insights/${existing.id}/`, {
            dashboards: [...existing.dashboardIds, dashboardId],
          });
          console.log(
            `   🔧 insight "${insight.name}" — attached to dashboard id=${dashboardId}`
          );
        }
        continue;
      }
      await post("/insights/", {
        name: insight.name,
        filters: insight.filters,
        dashboards: [dashboardId], // attach + cascade-delete with the dashboard
      });
      insightByName.set(insight.name, {
        id: null,
        dashboardIds: [dashboardId],
      });
      console.log(`   └ insight "${insight.name}"`);
    }
  }
  console.log(
    "\nDone. Safe to re-run — existing dashboards/insights are skipped."
  );
};

main().catch((err) => {
  console.error("Provision failed:", err.message);
  process.exit(1);
});

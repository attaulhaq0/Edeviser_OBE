// Unit tests for scripts/audit/realtime-filter-scan.ts
//
// Covers Task 14.4 / Req 12.4: every realtime subscription must pass a
// filter clause. Two subscription shapes are detected — the centralized
// `useRealtime({ … })` hook call and the direct
// `supabase.channel(name).on('postgres_changes', config, cb)` call.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanRealtimeFilters } from "../realtime-filter-scan.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-realtime-"));
  process.chdir(workspaceDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

const writeHookFile = (relPath: string, content: string) => {
  const full = join(workspaceDir, "src", "hooks", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

describe("scanRealtimeFilters (Task 14.4, Req 12.4)", () => {
  it("returns empty when src/hooks/ is missing", () => {
    expect(scanRealtimeFilters()).toEqual([]);
  });

  it("passes when every useRealtime call has a filter clause", () => {
    writeHookFile(
      "useTeamRealtime.ts",
      `import { useRealtime } from '@/hooks/useRealtime';
export const useTeamRealtime = (institutionId: string) =>
  useRealtime({
    table: 'teams',
    event: '*',
    filter: \`institution_id=eq.\${institutionId}\`,
    onPayload: () => {},
  });
`
    );
    expect(scanRealtimeFilters()).toEqual([]);
  });

  it("flags a Major finding when useRealtime has no filter (non-tenant table)", () => {
    writeHookFile(
      "useTeamLeaderboard.ts",
      `import { useRealtime } from '@/hooks/useRealtime';
export const useTeamLeaderboard = () =>
  useRealtime({
    table: 'teams',
    event: 'UPDATE',
    onPayload: () => {},
    pollingFn: () => {},
    pollingInterval: 30_000,
  });
`
    );
    const findings = scanRealtimeFilters();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.requirementId).toBe("12.4");
    expect(findings[0]?.detail?.table).toBe("teams");
    expect(findings[0]?.detail?.subscriptionShape).toBe("useRealtime");
    expect(findings[0]?.detail?.tenantScoped).toBe(false);
  });

  it("escalates to Critical when the unfiltered table is tenant-scoped", () => {
    writeHookFile(
      "useNotifications.ts",
      `import { useRealtime } from '@/hooks/useRealtime';
export const useAllNotifications = () =>
  useRealtime({
    table: 'notifications',
    event: 'INSERT',
    onPayload: () => {},
  });
`
    );
    const findings = scanRealtimeFilters();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Critical");
    expect(findings[0]?.detail?.tenantScoped).toBe(true);
    expect(findings[0]?.detail?.table).toBe("notifications");
  });

  it("flags direct supabase.channel().on(postgres_changes) without filter", () => {
    writeHookFile(
      "useDirectChannel.ts",
      `import { supabase } from '@/lib/supabase';
export const subscribe = () =>
  supabase
    .channel('custom-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {})
    .subscribe();
`
    );
    const findings = scanRealtimeFilters();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.detail?.subscriptionShape).toBe("direct-channel");
  });

  it("does not flag direct channel with a filter clause", () => {
    writeHookFile(
      "useDirectChannelFiltered.ts",
      `import { supabase } from '@/lib/supabase';
export const subscribe = (userId: string) =>
  supabase
    .channel('user-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: \`user_id=eq.\${userId}\` }, () => {})
    .subscribe();
`
    );
    expect(scanRealtimeFilters()).toEqual([]);
  });

  it("skips src/hooks/useRealtime.ts itself — it passes the filter through", () => {
    writeHookFile(
      "useRealtime.ts",
      `import { supabase } from '@/lib/supabase';
export const useRealtime = (opts) => {
  supabase
    .channel('x')
    .on('postgres_changes', { event: opts.event, schema: 'public', table: opts.table, filter: opts.filter }, () => {})
    .subscribe();
};
`
    );
    // Even though the filter is a variable, the implementation file is
    // excluded from scanning because its filter is provided by callers.
    expect(scanRealtimeFilters()).toEqual([]);
  });

  it("counts multiple violations in one file independently", () => {
    writeHookFile(
      "useMultiple.ts",
      `import { useRealtime } from '@/hooks/useRealtime';

export const a = () =>
  useRealtime({
    table: 'teams',
    event: '*',
    onPayload: () => {},
  });

export const b = () =>
  useRealtime({
    table: 'xp_transactions',
    event: 'INSERT',
    onPayload: () => {},
  });

export const c = () =>
  useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: 'user_id=eq.123',
    onPayload: () => {},
  });
`
    );
    const findings = scanRealtimeFilters();
    expect(findings).toHaveLength(2);
    const tables = findings.map((f) => f.detail?.table).sort();
    expect(tables).toEqual(["teams", "xp_transactions"]);
    // xp_transactions is tenant-scoped → Critical.
    const xpFinding = findings.find(
      (f) => f.detail?.table === "xp_transactions"
    );
    expect(xpFinding?.severity).toBe("Critical");
  });

  it("handles object literals with nested braces in values", () => {
    writeHookFile(
      "useNested.ts",
      `import { useRealtime } from '@/hooks/useRealtime';
export const use = (id: string) =>
  useRealtime({
    table: 'teams',
    event: '*',
    filter: id ? \`institution_id=eq.\${id}\` : undefined,
    onPayload: (payload: { new: { id: string } }) => {
      // arrow fn body with braces shouldn't confuse the matcher
      return { ok: true };
    },
  });
`
    );
    expect(scanRealtimeFilters()).toEqual([]);
  });

  it("records line numbers for each finding", () => {
    writeHookFile(
      "useLineLocation.ts",
      `import { useRealtime } from '@/hooks/useRealtime';

export const use = () =>
  useRealtime({
    table: 'teams',
    event: '*',
    onPayload: () => {},
  });
`
    );
    const findings = scanRealtimeFilters();
    expect(findings).toHaveLength(1);
    // Call site begins on line 4 in the fixture above (1-indexed).
    expect(findings[0]?.location?.line).toBe(4);
  });
});

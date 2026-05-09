// Unit tests for scripts/audit/audit-log-coverage.ts
//
// Covers Task 13.5 / Req 13.5: "every admin mutation writes to audit_logs".
// Each test plants a synthetic hook file under a tmpdir and asserts the
// scanner's in-scope / out-of-scope decisions.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanAuditLogCoverage } from "../audit-log-coverage.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-log-cov-"));
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

const writeExceptions = (body: unknown) => {
  const dir = join(workspaceDir, "audit", "baselines");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "audit-log-coverage-exceptions.json"),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

describe("scanAuditLogCoverage (Task 13.5, Req 13.5)", () => {
  it("returns empty when src/hooks/ is missing", () => {
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("does NOT flag a file that does not import logAuditEvent (out of scope)", () => {
    writeHookFile(
      "useStudentSelfService.ts",
      `import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useSubmitAssignment = () =>
  useMutation({
    mutationFn: async (input: { id: string }) => {
      await supabase.from('submissions').insert(input);
    },
  });
`
    );
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("passes a properly-logged admin mutation (in-scope, compliant)", () => {
    writeHookFile(
      "useILOs.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useCreateILO = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      const { data: row, error } = await supabase.from('learning_outcomes')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: 'create',
        entity_type: 'ilo',
        entity_id: row.id,
      });
      return row;
    },
  });
`
    );
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("flags a Blocker when an in-scope file writes to DB without logging", () => {
    writeHookFile(
      "useILOs.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useCreateILO = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('learning_outcomes').insert(data);
      // forgot to call logAuditEvent — this is the regression
    },
  });

export const useUpdateILO = (id: string) =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('learning_outcomes').update(data).eq('id', id);
      await logAuditEvent({ action: 'update', entity_type: 'ilo', entity_id: id });
    },
  });
`
    );
    const findings = scanAuditLogCoverage();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Blocker");
    expect(findings[0]?.requirementId).toBe("13.5");
    expect(findings[0]?.detail?.rule).toBe("admin-mutation-missing-audit-log");
  });

  it("does NOT flag a mutation that only invokes an Edge Function", () => {
    writeHookFile(
      "useBulkImport.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

// First mutation uses DB writes and logs — compliant.
export const useCreateThing = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('things').insert(data);
      await logAuditEvent({ action: 'create', entity_type: 'thing', entity_id: 'x' });
    },
  });

// Second mutation delegates to an Edge Function — excused from direct
// client-side audit log because the Edge Function logs server-side.
export const useBulkImport = () =>
  useMutation({
    mutationFn: async (rows: unknown[]) => {
      const { data } = await supabase.functions.invoke('bulk-import-users', {
        body: { rows },
      });
      return data;
    },
  });
`
    );
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("does NOT flag a mutation that only reads (no insert/update/delete)", () => {
    writeHookFile(
      "useReadOnlyMutation.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useCheckExists = () =>
  useMutation({
    mutationFn: async (id: string) => {
      // Just a read; no audit event needed.
      const { data } = await supabase.from('things').select('id').eq('id', id);
      return data;
    },
  });
`
    );
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("handles multiple mutations in one file — flags only the non-compliant ones", () => {
    writeHookFile(
      "useMultiple.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useCreateGood = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('t').insert(data);
      await logAuditEvent({ action: 'create', entity_type: 't', entity_id: 'x' });
    },
  });

export const useCreateBad = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('t').delete().eq('id', 1);
      // no log
    },
  });

export const useUpdateGood = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('t').update(data);
      await logAuditEvent({ action: 'update', entity_type: 't', entity_id: 'y' });
    },
  });
`
    );
    const findings = scanAuditLogCoverage();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.bodyPreview).toContain(".delete()");
  });

  it("handles nested braces in mutation bodies (arrow functions, objects)", () => {
    writeHookFile(
      "useNested.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useNested = () =>
  useMutation({
    mutationFn: async (data: { x: number }) => {
      const transformed = (() => {
        return { ...data, y: data.x * 2 };
      })();
      await supabase.from('t').insert(transformed);
      await logAuditEvent({
        action: 'create',
        entity_type: 't',
        entity_id: 'z',
        changes: { nested: { deep: true } },
      });
    },
  });
`
    );
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("handles string literals containing braces without confusing the matcher", () => {
    writeHookFile(
      "useStringBraces.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useWeird = () =>
  useMutation({
    mutationFn: async () => {
      const bracesInString = "}}{ foo }{ bar {{";
      await supabase.from('t').delete().eq('note', bracesInString);
      await logAuditEvent({ action: 'delete', entity_type: 't', entity_id: 'a' });
    },
  });
`
    );
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  // ─── Exception baseline ──────────────────────────────────────────────────

  it("suppresses a file listed in the exception baseline with a rationale", () => {
    writeHookFile(
      "useDiscussions.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useCreatePost = () =>
  useMutation({
    mutationFn: async (input: { content: string }) => {
      await supabase.from('discussion_threads').insert(input);
    },
  });
`
    );
    writeExceptions({
      fileLevel: [
        {
          file: "src/hooks/useDiscussions.ts",
          rationale:
            "Student-authored content; author_id makes traceability intrinsic.",
        },
      ],
    });
    expect(scanAuditLogCoverage()).toEqual([]);
  });

  it("treats an expired exception as an active Minor finding", () => {
    writeHookFile(
      "useCLOs.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useReorderCLOs = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('clos').update(data);
    },
  });
`
    );
    writeExceptions({
      fileLevel: [
        {
          file: "src/hooks/useCLOs.ts",
          rationale: "Temporary — backlog item EDU-1234",
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      ],
    });
    const findings = scanAuditLogCoverage();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Minor");
    expect(findings[0]?.detail?.expiredException).toBe(true);
  });

  it("still suppresses when expiresAt is in the future", () => {
    writeHookFile(
      "useCLOs.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useReorderCLOs = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('clos').update(data);
    },
  });
`
    );
    // Use a far-future date that's after today (we inject "now" via the
    // scanner's optional parameter).
    writeExceptions({
      fileLevel: [
        {
          file: "src/hooks/useCLOs.ts",
          rationale: "Temporary — backlog item EDU-1234",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(scanAuditLogCoverage(new Date("2026-05-08T00:00:00.000Z"))).toEqual(
      []
    );
  });

  it("ignores a malformed exceptions JSON without crashing", () => {
    writeHookFile(
      "useILOs.ts",
      `import { useMutation } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLogger';
import { supabase } from '@/lib/supabase';

export const useCreateILO = () =>
  useMutation({
    mutationFn: async (data: unknown) => {
      await supabase.from('learning_outcomes').insert(data);
    },
  });
`
    );
    mkdirSync(join(workspaceDir, "audit", "baselines"), { recursive: true });
    writeFileSync(
      join(
        workspaceDir,
        "audit",
        "baselines",
        "audit-log-coverage-exceptions.json"
      ),
      "{ malformed",
      "utf8"
    );
    // Malformed baseline means no suppressions — the finding still fires.
    const findings = scanAuditLogCoverage();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Blocker");
  });
});

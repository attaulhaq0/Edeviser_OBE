// Unit tests for scripts/audit/pagination-scan.ts (Task 14.3, Req 12.3).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanListPagePagination } from "../pagination-scan.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-pagination-"));
  process.chdir(workspaceDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

const writePage = (relPath: string, content: string) => {
  const full = join(workspaceDir, "src", "pages", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

const writeExceptions = (body: unknown) => {
  const dir = join(workspaceDir, "audit", "baselines");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "pagination-exceptions.json"),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

describe("scanListPagePagination", () => {
  it("returns empty when src/pages/ is missing", () => {
    expect(scanListPagePagination()).toEqual([]);
  });

  it("flags a list page with no pagination signal as Major", () => {
    writePage(
      "admin/outcomes/ILOListPage.tsx",
      `import { useILOs } from '@/hooks/useILOs';
export const ILOListPage = () => {
  const { data } = useILOs();
  return <ul>{data?.map(x => x.id)}</ul>;
};
`
    );
    const findings = scanListPagePagination();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Major");
    expect(findings[0]?.requirementId).toBe("12.3");
  });

  it("accepts hook called with { page } object", () => {
    writePage(
      "admin/outcomes/ILOListPage.tsx",
      `import { useILOs } from '@/hooks/useILOs';
export const ILOListPage = () => {
  const { data } = useILOs({ page: 1 });
  return <ul />;
};
`
    );
    expect(scanListPagePagination()).toEqual([]);
  });

  it("accepts useVirtualizer", () => {
    writePage(
      "teacher/grading/GradeListPage.tsx",
      `import { useVirtualizer } from '@tanstack/react-virtual';
export const GradeListPage = () => {
  const virt = useVirtualizer({ count: 1000, getScrollElement: () => null });
  return <div />;
};
`
    );
    expect(scanListPagePagination()).toEqual([]);
  });

  it("accepts useInfiniteQuery", () => {
    writePage(
      "student/feed/FeedListPage.tsx",
      `import { useInfiniteQuery } from '@tanstack/react-query';
export const FeedListPage = () => {
  const q = useInfiniteQuery({ queryKey: ['x'], queryFn: () => [] });
  return <div />;
};
`
    );
    expect(scanListPagePagination()).toEqual([]);
  });

  it("accepts direct .limit() on a supabase query", () => {
    writePage(
      "admin/activity/ActivityListPage.tsx",
      `import { supabase } from '@/lib/supabase';
export const ActivityListPage = () => {
  supabase.from('activity').select().limit(50);
  return <div />;
};
`
    );
    expect(scanListPagePagination()).toEqual([]);
  });

  it("accepts nuqs URL-param pagination", () => {
    writePage(
      "admin/users/UserListPage.tsx",
      `import { useQueryState } from 'nuqs';
export const UserListPage = () => {
  const [page] = useQueryState('page', { defaultValue: '1' });
  return <div>{page}</div>;
};
`
    );
    expect(scanListPagePagination()).toEqual([]);
  });

  it("only scans ListPage.tsx files (not other .tsx files)", () => {
    writePage(
      "admin/dashboard/Dashboard.tsx",
      `export const Dashboard = () => <div />;`
    );
    expect(scanListPagePagination()).toEqual([]);
  });

  it("respects file-level exception baseline", () => {
    writePage(
      "admin/badges/BadgeListPage.tsx",
      `export const BadgeListPage = () => <ul />;`
    );
    writeExceptions({
      fileLevel: [
        {
          file: "src/pages/admin/badges/BadgeListPage.tsx",
          rationale:
            "Fixed list of 20 seeded badges — pagination inappropriate.",
        },
      ],
    });
    expect(scanListPagePagination()).toEqual([]);
  });

  it("surfaces expired exceptions as Minor findings", () => {
    writePage(
      "admin/badges/BadgeListPage.tsx",
      `export const BadgeListPage = () => <ul />;`
    );
    writeExceptions({
      fileLevel: [
        {
          file: "src/pages/admin/badges/BadgeListPage.tsx",
          rationale: "Temporary",
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      ],
    });
    const findings = scanListPagePagination();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Minor");
    expect(findings[0]?.detail?.expiredException).toBe(true);
  });
});

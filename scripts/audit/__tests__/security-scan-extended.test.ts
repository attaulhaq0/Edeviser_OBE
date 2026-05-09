// Unit tests for the extended security-scan.ts rules:
//   - Task 13.3 / Req 13.3: zodResolver presence on every useForm call
//   - Task 13.4 / Req 13.4: Edge Function body validation scan

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  scanEdgeFunctionBodyValidation,
  scanZodResolverPresence,
} from "../security-scan.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-security-ext-"));
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

// ─── Task 13.3: zodResolver presence ─────────────────────────────────────

describe("scanZodResolverPresence (Task 13.3, Req 13.3)", () => {
  it("returns empty when src/pages/ does not exist", () => {
    expect(scanZodResolverPresence()).toEqual([]);
  });

  it("flags a useForm call without zodResolver", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "LoginForm.tsx"),
      `import { useForm } from 'react-hook-form';
const LoginForm = () => {
  const form = useForm({
    defaultValues: { email: '' },
  });
  return <form />;
};`
    );
    const findings = scanZodResolverPresence();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.requirementId).toBe("13.3");
    expect(findings[0]?.severity).toBe("Major");
  });

  it("does not flag a useForm call with zodResolver", () => {
    mkdirSync(join(workspaceDir, "src", "pages"), { recursive: true });
    writeFileSync(
      join(workspaceDir, "src", "pages", "LoginForm.tsx"),
      `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/schemas';
const LoginForm = () => {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });
  return <form />;
};`
    );
    expect(scanZodResolverPresence()).toEqual([]);
  });
});

// ─── Task 13.4: Edge Function body validation ─────────────────────────────

describe("scanEdgeFunctionBodyValidation (Task 13.4, Req 13.4)", () => {
  it("returns a Trivial finding when supabase/functions/ does not exist", () => {
    const findings = scanEdgeFunctionBodyValidation();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("Trivial");
    expect(findings[0]?.requirementId).toBe("13.4");
  });

  it("flags an Edge Function that reads req.json() and calls supabase.from without safeParse", () => {
    mkdirSync(join(workspaceDir, "supabase", "functions", "my-fn"), {
      recursive: true,
    });
    writeFileSync(
      join(workspaceDir, "supabase", "functions", "my-fn", "index.ts"),
      `import { serve } from 'https://deno.land/std/http/server.ts';
serve(async (req) => {
  const body = await req.json();
  const { data } = await supabase.from('users').select('*');
  return new Response(JSON.stringify(data));
});`
    );
    const findings = scanEdgeFunctionBodyValidation();
    // Should NOT include the Trivial "dir missing" finding
    const critical = findings.filter((f) => f.severity === "Critical");
    expect(critical.length).toBeGreaterThan(0);
    expect(critical[0]?.requirementId).toBe("13.4");
  });

  it("does not flag an Edge Function that uses safeParse before side effects", () => {
    mkdirSync(join(workspaceDir, "supabase", "functions", "safe-fn"), {
      recursive: true,
    });
    writeFileSync(
      join(workspaceDir, "supabase", "functions", "safe-fn", "index.ts"),
      `import { serve } from 'https://deno.land/std/http/server.ts';
import { z } from 'https://esm.sh/zod';
const schema = z.object({ name: z.string() });
serve(async (req) => {
  const raw = await req.json();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return new Response('bad', { status: 400 });
  const { data } = await supabase.from('users').select('*');
  return new Response(JSON.stringify(data));
});`
    );
    const findings = scanEdgeFunctionBodyValidation().filter(
      (f) => f.severity === "Critical"
    );
    expect(findings).toHaveLength(0);
  });
});

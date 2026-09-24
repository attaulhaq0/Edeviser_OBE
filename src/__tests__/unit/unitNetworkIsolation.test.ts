// @vitest-environment node
// No external request is made: forwarding behavior uses a fake native transport.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { guardUnitSupabaseFetch, UNIT_NETWORK_ERROR, UNIT_SUPABASE_URL, UNIT_SUPABASE_ANON_KEY } from "@/__tests__/helpers/unitNetwork";

describe("unit Supabase environment and network boundary", () => {
  it("uses fake values in process and import-meta environments without depending on CI", () => {
    expect(process.env.VITE_SUPABASE_URL).toBe(UNIT_SUPABASE_URL);
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBe(UNIT_SUPABASE_ANON_KEY);
    expect(import.meta.env.VITE_SUPABASE_URL).toBe(UNIT_SUPABASE_URL);
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBe(UNIT_SUPABASE_ANON_KEY);
  });
  it("does not stack duplicate wrappers when setup repeats in a worker", () => {
    const native = vi.fn<typeof fetch>();
    const guarded = guardUnitSupabaseFetch(native);
    expect(guardUnitSupabaseFetch(guarded)).toBe(guarded);
    expect(native).not.toHaveBeenCalled();
  });
  it("installs the unit guard before test modules execute", async () => {
    await expect(globalThis.fetch(`${UNIT_SUPABASE_URL}/__unit_guard_probe__`)).rejects.toThrow(UNIT_NETWORK_ERROR);
  });
  it.each(["string", "URL", "Request"] as const)("blocks the exact unit origin for %s inputs", async (kind) => {
    const native = vi.fn<typeof fetch>().mockResolvedValue(new Response("not used"));
    const guarded = guardUnitSupabaseFetch(native);
    const url = `${UNIT_SUPABASE_URL}/rest/v1/profiles`;
    const input = kind === "string" ? url : kind === "URL" ? new URL(url) : new Request(url);
    await expect(guarded(input)).rejects.toThrow(UNIT_NETWORK_ERROR);
    expect(native).not.toHaveBeenCalled();
  });
  it("does not confuse an origin-prefix lookalike with the unit service", async () => {
    const response = new Response("fake response");
    const native = vi.fn<typeof fetch>().mockResolvedValue(response);
    const guarded = guardUnitSupabaseFetch(native);
    const request = "http://localhost:543210/example";
    // Invalid URLs retain native validation behavior; this fake transport is
    // intentional and cannot contact an external or loopback server.
    expect(await guarded(request)).toBe(response);
    expect(native).toHaveBeenCalledExactlyOnceWith(request, undefined);
  });
  it("preserves explicit mocked non-Supabase HTTP behavior and arguments", async () => {
    const response = new Response("fake");
    const native = vi.fn<typeof fetch>().mockResolvedValue(response);
    const init = { method: "POST", body: "fixture" };
    expect(await guardUnitSupabaseFetch(native)("https://example.invalid/api", init)).toBe(response);
    expect(native).toHaveBeenCalledExactlyOnceWith("https://example.invalid/api", init);
  });
  it("does not attach the unit environment/setup to the separate Preview RLS config", () => {
    const config = readFileSync(resolve("vitest.integration.config.ts"), "utf8");
    expect(config).toContain("setupFiles: []");
    expect(config).not.toContain("unitNetwork");
    expect(config).not.toContain("UNIT_SUPABASE_URL");
  });
});

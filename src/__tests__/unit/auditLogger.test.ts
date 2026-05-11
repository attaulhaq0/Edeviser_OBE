// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAuditEvent, type AuditLogEntry } from "@/lib/auditLogger";

const mockInsert = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

import { supabase } from "@/lib/supabase";

describe("logAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("inserts into audit_logs with mapped field names and filtered changes", async () => {
    const entry: AuditLogEntry = {
      action: "create",
      entity_type: "user",
      entity_id: "user-123",
      changes: {
        role: "student",
        full_name: "Test User",
        email: "test@example.com",
      },
      performed_by: "admin-456",
    };

    await logAuditEvent(entry);

    expect(supabase.from).toHaveBeenCalledWith("audit_logs");
    // email should be filtered out (not in allowlist), role and is_active are allowed
    expect(mockInsert).toHaveBeenCalledWith({
      action: "create",
      target_type: "user",
      target_id: "user-123",
      diff: { role: "student" },
      actor_id: "admin-456",
    });
  });

  it("accepts null changes", async () => {
    const entry: AuditLogEntry = {
      action: "delete",
      entity_type: "programs",
      entity_id: "prog-789",
      changes: null,
      performed_by: "admin-456",
    };

    await logAuditEvent(entry);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ diff: null })
    );
  });

  it("logs error to console on supabase failure without throwing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValue({ error: { message: "RLS violation" } });

    const entry: AuditLogEntry = {
      action: "update",
      entity_type: "courses",
      entity_id: "course-1",
      changes: { name: { before: "A", after: "B" } },
      performed_by: "admin-1",
    };

    await expect(logAuditEvent(entry)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[AuditLogger] Failed to log audit event:",
      "RLS violation"
    );

    consoleSpy.mockRestore();
  });

  it("catches unexpected exceptions without throwing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockRejectedValue(new Error("Network down"));

    const entry: AuditLogEntry = {
      action: "create",
      entity_type: "learning_outcomes",
      entity_id: "ilo-1",
      changes: { title: { before: null, after: "New ILO" } },
      performed_by: "admin-1",
    };

    await expect(logAuditEvent(entry)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[AuditLogger] Unexpected error:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

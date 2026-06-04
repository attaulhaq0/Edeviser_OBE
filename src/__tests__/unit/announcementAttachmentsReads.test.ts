// Feature: qa-partner-review-remediation — Req 15.3, 15.4
// Unit tests for announcement attachment upload validation + the
// announcement_reads mark-as-read upsert (idempotent via onConflict) and the
// attachment upload hook (validate → storage upload → metadata insert).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockUpsert = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockStorageUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
// Declared via vi.hoisted so they exist before the hoisted vi.mock factory runs.
const { mockGetUser, mockAuditInsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAuditInsert: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    // Table-aware: audit_logs inserts resolve cleanly (logAuditEvent awaits the
    // insert result directly); all other tables use the upsert/insert spies.
    from: vi.fn((table: string) => {
      if (table === "audit_logs") {
        return { insert: mockAuditInsert };
      }
      return { upsert: mockUpsert, insert: mockInsert };
    }),
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  },
}));

import {
  validateAnnouncementAttachmentFile,
  FileValidationError,
} from "@/lib/fileUpload";
import {
  useMarkAnnouncementRead,
  useUploadAnnouncementAttachment,
} from "@/hooks/useAnnouncements";

// ─── Helpers ────────────────────────────────────────────────────────────────

const createFile = (name: string, type: string, sizeBytes: number): File => {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

// ─── Validation (Req 15.3) ────────────────────────────────────────────────────

describe("validateAnnouncementAttachmentFile", () => {
  it("accepts a PDF under 10MB", () => {
    const file = createFile("syllabus.pdf", "application/pdf", 5 * 1024 * 1024);
    expect(() => validateAnnouncementAttachmentFile(file)).not.toThrow();
  });

  it("accepts a PNG image", () => {
    const file = createFile("diagram.png", "image/png", 1_000_000);
    expect(() => validateAnnouncementAttachmentFile(file)).not.toThrow();
  });

  it("rejects a file larger than 10MB", () => {
    const file = createFile("big.pdf", "application/pdf", 11 * 1024 * 1024);
    expect(() => validateAnnouncementAttachmentFile(file)).toThrow(
      FileValidationError
    );
    expect(() => validateAnnouncementAttachmentFile(file)).toThrow(
      /10MB limit/
    );
  });

  it("rejects an unsupported file type", () => {
    const file = createFile("clip.mp4", "video/mp4", 100_000);
    expect(() => validateAnnouncementAttachmentFile(file)).toThrow(
      FileValidationError
    );
    expect(() => validateAnnouncementAttachmentFile(file)).toThrow(
      /Unsupported file type/
    );
  });

  it("rejects filenames containing path-traversal sequences", () => {
    const file = createFile("../escape.pdf", "application/pdf", 1000);
    expect(() => validateAnnouncementAttachmentFile(file)).toThrow(
      FileValidationError
    );
  });
});

// ─── Upload hook (Req 15.3) ────────────────────────────────────────────────────

describe("useUploadAnnouncementAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockAuditInsert.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: "teacher-1" } } });
  });

  it("validates first and never uploads an oversized file", async () => {
    const { result } = renderHook(() => useUploadAnnouncementAttachment(), {
      wrapper: createWrapper(),
    });

    const oversized = createFile(
      "huge.pdf",
      "application/pdf",
      11 * 1024 * 1024
    );

    await expect(
      result.current.mutateAsync({ announcementId: "ann-1", file: oversized })
    ).rejects.toThrow(FileValidationError);

    expect(mockStorageUpload).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("uploads under an {announcementId}/ prefix then inserts metadata", async () => {
    mockStorageUpload.mockResolvedValue({ error: null });
    mockSingle.mockResolvedValue({
      data: {
        id: "att-1",
        announcement_id: "ann-1",
        storage_path: "ann-1/uuid-notes.pdf",
        file_name: "notes.pdf",
        content_type: "application/pdf",
        size_bytes: 1000,
        created_at: "2024-01-01",
      },
      error: null,
    });

    const { result } = renderHook(() => useUploadAnnouncementAttachment(), {
      wrapper: createWrapper(),
    });

    const file = createFile("notes.pdf", "application/pdf", 1000);
    const created = await result.current.mutateAsync({
      announcementId: "ann-1",
      file,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const uploadedPath = mockStorageUpload.mock.calls[0]?.[0] as string;
    expect(uploadedPath.startsWith("ann-1/")).toBe(true);

    // Metadata row carries the storage path + file facts.
    const insertedRow = mockInsert.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(insertedRow.announcement_id).toBe("ann-1");
    expect(insertedRow.file_name).toBe("notes.pdf");
    expect(insertedRow.content_type).toBe("application/pdf");
    expect(insertedRow.size_bytes).toBe(1000);
    expect(created.id).toBe("att-1");

    // Audit trail: the upload is recorded with the resolved actor (Req 13.5).
    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    const auditRow = mockAuditInsert.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(auditRow.action).toBe("create");
    expect(auditRow.target_type).toBe("announcement_attachment");
    expect(auditRow.actor_id).toBe("teacher-1");
  });

  it("does not insert metadata when the storage upload fails", async () => {
    mockStorageUpload.mockResolvedValue({
      error: { message: "Bucket not found" },
    });

    const { result } = renderHook(() => useUploadAnnouncementAttachment(), {
      wrapper: createWrapper(),
    });

    const file = createFile("notes.pdf", "application/pdf", 1000);
    await expect(
      result.current.mutateAsync({ announcementId: "ann-1", file })
    ).rejects.toThrow(/Attachment upload failed/);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ─── Mark-as-read upsert (Req 15.4) ───────────────────────────────────────────

describe("useMarkAnnouncementRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockAuditInsert.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: "student-1" } } });
  });

  it("upserts announcement_reads with the conflict target for idempotency", async () => {
    const { result } = renderHook(() => useMarkAnnouncementRead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      announcementId: "ann-1",
      studentId: "student-1",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      { announcement_id: "ann-1", student_id: "student-1" },
      { onConflict: "announcement_id,student_id" }
    );

    // Audit trail: the read receipt is recorded with the student as actor.
    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    const auditRow = mockAuditInsert.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(auditRow.target_type).toBe("announcement_read");
    expect(auditRow.actor_id).toBe("student-1");
  });

  it("throws when the upsert returns an error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "denied" } });

    const { result } = renderHook(() => useMarkAnnouncementRead(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        announcementId: "ann-1",
        studentId: "student-1",
      })
    ).rejects.toMatchObject({ message: "denied" });
  });
});

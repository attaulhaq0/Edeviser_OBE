// =============================================================================
// Tutor Attachment Upload — Unit tests
// Tests tutor chat attachment validation and upload logic (Req 4.5)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  },
}));

import {
  validateTutorAttachmentFile,
  uploadTutorAttachmentFile,
  FileValidationError,
} from "@/lib/fileUpload";

// ─── Helpers ────────────────────────────────────────────────────────────────

const createFile = (name: string, type: string, sizeBytes: number): File => {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
};

const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("validateTutorAttachmentFile", () => {
  it("accepts a JPEG image under 5MB", () => {
    const file = createFile("photo.jpg", "image/jpeg", 4 * 1024 * 1024);
    expect(() => validateTutorAttachmentFile(file)).not.toThrow();
  });

  it("accepts a PNG image under 5MB", () => {
    const file = createFile("photo.png", "image/png", 1_000_000);
    expect(() => validateTutorAttachmentFile(file)).not.toThrow();
  });

  it("accepts a PDF document under 10MB", () => {
    const file = createFile("notes.pdf", "application/pdf", 8 * 1024 * 1024);
    expect(() => validateTutorAttachmentFile(file)).not.toThrow();
  });

  it("accepts a DOCX document under 10MB", () => {
    const file = createFile("essay.docx", DOCX_TYPE, 9 * 1024 * 1024);
    expect(() => validateTutorAttachmentFile(file)).not.toThrow();
  });

  it("rejects an image larger than 5MB", () => {
    const file = createFile("big.png", "image/png", 6 * 1024 * 1024);
    expect(() => validateTutorAttachmentFile(file)).toThrow(
      FileValidationError
    );
    expect(() => validateTutorAttachmentFile(file)).toThrow(/5MB limit/);
  });

  it("rejects a document larger than 10MB", () => {
    const file = createFile("huge.pdf", "application/pdf", 11 * 1024 * 1024);
    expect(() => validateTutorAttachmentFile(file)).toThrow(
      FileValidationError
    );
    expect(() => validateTutorAttachmentFile(file)).toThrow(/10MB limit/);
  });

  it("rejects unsupported file types", () => {
    const file = createFile("clip.mp4", "video/mp4", 100_000);
    expect(() => validateTutorAttachmentFile(file)).toThrow(
      FileValidationError
    );
    expect(() => validateTutorAttachmentFile(file)).toThrow(
      /Unsupported file type/
    );
  });

  it("rejects SVG images (not in the allowed image set)", () => {
    const file = createFile("icon.svg", "image/svg+xml", 10_000);
    expect(() => validateTutorAttachmentFile(file)).toThrow(
      FileValidationError
    );
  });
});

describe("uploadTutorAttachmentFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads under the user folder and returns a signed URL", async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed/abc" },
      error: null,
    });

    const file = createFile("photo.png", "image/png", 500_000);
    const url = await uploadTutorAttachmentFile({ file, userId: "user-1" });

    expect(mockUpload).toHaveBeenCalledOnce();
    // Path must be scoped to the user's own folder (RLS prefix).
    const uploadedPath = mockUpload.mock.calls[0]?.[0] as string;
    expect(uploadedPath.startsWith("user-1/")).toBe(true);
    expect(url).toBe("https://storage.example.com/signed/abc");
  });

  it("validates the file before attempting upload", async () => {
    const file = createFile("big.png", "image/png", 6 * 1024 * 1024);
    await expect(
      uploadTutorAttachmentFile({ file, userId: "user-1" })
    ).rejects.toThrow(FileValidationError);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("throws when the storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "Bucket not found" } });

    const file = createFile("photo.png", "image/png", 500_000);
    await expect(
      uploadTutorAttachmentFile({ file, userId: "user-1" })
    ).rejects.toThrow("Attachment upload failed: Bucket not found");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("throws when a signed URL cannot be produced", async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "object not found" },
    });

    const file = createFile("notes.pdf", "application/pdf", 500_000);
    await expect(
      uploadTutorAttachmentFile({ file, userId: "user-1" })
    ).rejects.toThrow(/Failed to sign attachment URL/);
  });

  it("rejects filenames containing path-traversal sequences", async () => {
    mockUpload.mockResolvedValue({ error: null });

    const file = createFile("../escape.png", "image/png", 500_000);
    await expect(
      uploadTutorAttachmentFile({ file, userId: "user-1" })
    ).rejects.toThrow(FileValidationError);
  });
});

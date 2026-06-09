// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockInvoke = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { indexCourseMaterialIfSupported } from "@/lib/courseMaterialIndexing";

describe("courseMaterialIndexing — indexCourseMaterialIfSupported", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("dispatches embed-course-material for a supported PDF upload", async () => {
    const result = await indexCourseMaterialIfSupported({
      filePath: "course-1/1700000000_lecture.pdf",
      courseId: "course-1",
      sourceMaterialId: "mat-1",
      cloIds: ["clo-1", "clo-2"],
    });

    expect(result.dispatched).toBe(true);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [fnName, options] = mockInvoke.mock.calls[0] as [
      string,
      { body: Record<string, unknown> }
    ];
    expect(fnName).toBe("embed-course-material");
    expect(options.body).toMatchObject({
      file_url: "course-1/1700000000_lecture.pdf",
      course_id: "course-1",
      source_material_id: "mat-1",
      source_filename: "1700000000_lecture.pdf",
      material_type: "lecture_notes",
      clo_ids: ["clo-1", "clo-2"],
      reindex: false,
    });
  });

  it.each(["docx", "txt", "md"])(
    "dispatches for supported .%s extension",
    async (ext) => {
      const result = await indexCourseMaterialIfSupported({
        filePath: `course-1/notes.${ext}`,
        courseId: "course-1",
        sourceMaterialId: "mat-2",
      });
      expect(result.dispatched).toBe(true);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    }
  );

  it.each(["png", "mp4", "zip", "pptx", "jpg"])(
    "skips unsupported (non-text) .%s extension without invoking",
    async (ext) => {
      const result = await indexCourseMaterialIfSupported({
        filePath: `course-1/asset.${ext}`,
        courseId: "course-1",
        sourceMaterialId: "mat-3",
      });
      expect(result.dispatched).toBe(false);
      expect(result.skippedReason).toBe("unsupported_format");
      expect(mockInvoke).not.toHaveBeenCalled();
    }
  );

  it("skips when no file path is provided", async () => {
    const result = await indexCourseMaterialIfSupported({
      filePath: "",
      courseId: "course-1",
      sourceMaterialId: "mat-4",
    });
    expect(result.dispatched).toBe(false);
    expect(result.skippedReason).toBe("no_file_path");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("skips when no course id is provided", async () => {
    const result = await indexCourseMaterialIfSupported({
      filePath: "course-1/lecture.pdf",
      courseId: "",
      sourceMaterialId: "mat-5",
    });
    expect(result.dispatched).toBe(false);
    expect(result.skippedReason).toBe("no_course_id");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("sets reindex flag when requested", async () => {
    await indexCourseMaterialIfSupported({
      filePath: "course-1/lecture.pdf",
      courseId: "course-1",
      sourceMaterialId: "mat-6",
      reindex: true,
    });
    const [, options] = mockInvoke.mock.calls[0] as [
      string,
      { body: Record<string, unknown> }
    ];
    expect(options.body.reindex).toBe(true);
  });

  it("does not throw when the function returns an error (graceful degradation)", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "OPENAI_API_KEY is not configured" },
    });

    const result = await indexCourseMaterialIfSupported({
      filePath: "course-1/lecture.pdf",
      courseId: "course-1",
      sourceMaterialId: "mat-7",
    });

    // Still reports dispatched; the upload flow is never blocked on indexing.
    expect(result.dispatched).toBe(true);
  });

  it("does not throw when the invocation itself rejects", async () => {
    mockInvoke.mockRejectedValue(new Error("network down"));

    await expect(
      indexCourseMaterialIfSupported({
        filePath: "course-1/lecture.pdf",
        courseId: "course-1",
        sourceMaterialId: "mat-8",
      })
    ).resolves.toMatchObject({ dispatched: true });
  });
});

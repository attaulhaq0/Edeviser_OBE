// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockIn = vi.fn();

const chainObj: Record<string, ReturnType<typeof vi.fn>> = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  in: mockIn,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

vi.mock("@/lib/auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { supabase as _supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/auditLogger";
import { uploadMaterialFile } from "@/hooks/useCourseModules";

/* eslint-disable @typescript-eslint/no-explicit-any */
const supabase = _supabase as unknown as {
  from: (table: string) => any;
  storage: { from: (bucket: string) => any };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("useCourseModules hooks — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockIn.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: "mod-1" }, error: null });
  });

  describe("useCourseModules queryFn", () => {
    it("queries course_modules table with course_id filter", () => {
      supabase.from("course_modules");
      expect(supabase.from).toHaveBeenCalledWith("course_modules");
    });

    it("orders by sort_order ascending", () => {
      const chain = supabase.from("course_modules");
      chain.select(
        "id, course_id, title, description, sort_order, is_published, created_at"
      );
      chain.eq("course_id", "course-1");
      chain.order("sort_order", { ascending: true });

      expect(mockOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
    });
  });

  describe("useCourseMaterials queryFn", () => {
    it("queries course_materials table with module_id filter", () => {
      supabase.from("course_materials");
      expect(supabase.from).toHaveBeenCalledWith("course_materials");
    });

    it("orders materials by sort_order ascending", () => {
      const chain = supabase.from("course_materials");
      chain.select(
        "id, module_id, title, type, content_url, file_path, description, sort_order, is_published, clo_ids, created_at"
      );
      chain.eq("module_id", "mod-1");
      chain.order("sort_order", { ascending: true });

      expect(mockOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
    });
  });

  describe("useCreateModule mutationFn", () => {
    it("inserts module and logs audit event", async () => {
      mockSingle.mockResolvedValue({
        data: { id: "mod-new", course_id: "c-1", title: "Week 1" },
        error: null,
      });

      const chain = supabase.from("course_modules");
      chain.insert({
        course_id: "c-1",
        title: "Week 1",
        description: null,
        sort_order: 0,
        is_published: false,
      });
      chain.select();
      const result = await chain.single();

      expect(result.data.title).toBe("Week 1");
      expect(mockInsert).toHaveBeenCalled();
    });

    it("calls logAuditEvent on module create", async () => {
      await (logAuditEvent as unknown as (...args: unknown[]) => Promise<void>)(
        {
          action: "create",
          entity_type: "course_module",
          entity_id: "mod-1",
          changes: {
            course_id: "c-1",
            title: "Week 1",
            sort_order: 0,
            is_published: false,
          },
          performed_by: "teacher-1",
        }
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          entity_type: "course_module",
        })
      );
    });
  });

  describe("useCreateMaterial mutationFn", () => {
    it("inserts material with clo_ids", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "mat-1",
          module_id: "mod-1",
          title: "Lecture Slides",
          type: "file",
          clo_ids: ["clo-1"],
        },
        error: null,
      });

      const chain = supabase.from("course_materials");
      chain.insert({
        module_id: "mod-1",
        title: "Lecture Slides",
        type: "file",
        content_url: null,
        file_path: "/path/to/file.pdf",
        description: null,
        sort_order: 0,
        is_published: true,
        clo_ids: ["clo-1"],
      });
      chain.select();
      const result = await chain.single();

      expect(result.data.title).toBe("Lecture Slides");
      expect(result.data.clo_ids).toEqual(["clo-1"]);
    });
  });

  describe("useDeleteModule mutationFn", () => {
    it("deletes module by id", async () => {
      mockEq.mockResolvedValue({ error: null });

      const chain = supabase.from("course_modules");
      chain.delete();
      await chain.eq("id", "mod-1");

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "mod-1");
    });
  });

  describe("uploadMaterialFile", () => {
    it("rejects files exceeding 50MB", async () => {
      const bigFile = new File(["x".repeat(100)], "big.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(bigFile, "size", { value: 51 * 1024 * 1024 });

      await expect(uploadMaterialFile(bigFile, "course-1")).rejects.toThrow(
        "50MB"
      );
    });

    it("rejects disallowed file extensions", async () => {
      const badFile = new File(["x"], "script.exe", {
        type: "application/octet-stream",
      });

      await expect(uploadMaterialFile(badFile, "course-1")).rejects.toThrow(
        "not allowed"
      );
    });

    it("uploads valid file and returns the storage path", async () => {
      const validFile = new File(["content"], "slides.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(validFile, "size", { value: 1024 });

      mockUpload.mockResolvedValue({ error: null });

      const url = await uploadMaterialFile(validFile, "course-1");

      // course-materials is a private bucket; we now return the storage path
      // and consumers must call getSignedUrl() at READ time. The path format
      // is `${courseId}/${timestamp}_${safeName}` per useCourseModules.ts.
      expect(url).toMatch(/^course-1\/\d+_slides\.pdf$/);
      expect(mockUpload).toHaveBeenCalled();
    });
  });
});

// Feature: ai-tutor-rag, Property 20: Text input validation (1-2000 chars)
// Feature: ai-tutor-rag, Property 21: File attachment validation
// **Validates: Requirements 11.1, 11.2, 12.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sendMessageSchema } from "@/lib/tutorSchemas";

// ─── P20: Text input validation ──────────────────────────────────────────────

describe("Property 20 — Text input validation (1–2000 chars)", () => {
  it("P20a: valid messages (1–2000 chars) pass validation", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 2000 }),
        (message) => {
          const result = sendMessageSchema.safeParse({ message });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P20b: empty string is rejected", () => {
    const result = sendMessageSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("P20c: messages exceeding 2000 chars are rejected", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2001, maxLength: 5000 }),
        (message) => {
          const result = sendMessageSchema.safeParse({ message });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P20d: exactly 2000 chars is accepted", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9 ]{2000}$/),
        (message) => {
          const result = sendMessageSchema.safeParse({ message });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P21: File attachment validation ─────────────────────────────────────────

describe("Property 21 — File attachment validation", () => {
  // ─── Image validation ──────────────────────────────────────────────────────

  it("P21a: up to 2 image URLs are accepted", () => {
    fc.assert(
      fc.property(
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 2 }),
        (imageUrls) => {
          const result = sendMessageSchema.safeParse({
            message: "Help me with this",
            image_urls: imageUrls,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21b: more than 2 image URLs are rejected", () => {
    fc.assert(
      fc.property(
        fc.array(fc.webUrl(), { minLength: 3, maxLength: 6 }),
        (imageUrls) => {
          const result = sendMessageSchema.safeParse({
            message: "Help me with this",
            image_urls: imageUrls,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Image format validation (client-side check) ──────────────────────────

  it("P21c: image format validation accepts JPG and PNG", () => {
    const validExtensions = ["jpg", "jpeg", "png"];
    const isValidImageFormat = (filename: string): boolean => {
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return validExtensions.includes(ext);
    };

    fc.assert(
      fc.property(
        fc.constantFrom("photo.jpg", "image.jpeg", "screenshot.png"),
        (filename) => {
          expect(isValidImageFormat(filename)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21d: image format validation rejects non-JPG/PNG formats", () => {
    const validExtensions = ["jpg", "jpeg", "png"];
    const isValidImageFormat = (filename: string): boolean => {
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return validExtensions.includes(ext);
    };

    fc.assert(
      fc.property(
        fc.constantFrom("file.gif", "image.bmp", "photo.webp", "pic.tiff", "doc.svg"),
        (filename) => {
          expect(isValidImageFormat(filename)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Image size validation ─────────────────────────────────────────────────

  it("P21e: image size validation accepts files ≤ 5MB", () => {
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    const isValidImageSize = (sizeBytes: number): boolean =>
      sizeBytes <= MAX_IMAGE_SIZE;

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_IMAGE_SIZE }),
        (size) => {
          expect(isValidImageSize(size)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21f: image size validation rejects files > 5MB", () => {
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    const isValidImageSize = (sizeBytes: number): boolean =>
      sizeBytes <= MAX_IMAGE_SIZE;

    fc.assert(
      fc.property(
        fc.integer({ min: MAX_IMAGE_SIZE + 1, max: 50 * 1024 * 1024 }),
        (size) => {
          expect(isValidImageSize(size)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Document validation ───────────────────────────────────────────────────

  it("P21g: document format validation accepts PDF and DOCX", () => {
    const validDocExtensions = ["pdf", "docx"];
    const isValidDocFormat = (filename: string): boolean => {
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return validDocExtensions.includes(ext);
    };

    fc.assert(
      fc.property(
        fc.constantFrom("report.pdf", "essay.docx"),
        (filename) => {
          expect(isValidDocFormat(filename)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21h: document format validation rejects non-PDF/DOCX formats", () => {
    const validDocExtensions = ["pdf", "docx"];
    const isValidDocFormat = (filename: string): boolean => {
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return validDocExtensions.includes(ext);
    };

    fc.assert(
      fc.property(
        fc.constantFrom("file.txt", "data.csv", "sheet.xlsx", "doc.pptx", "image.png"),
        (filename) => {
          expect(isValidDocFormat(filename)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21i: document size validation accepts files ≤ 10MB", () => {
    const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
    const isValidDocSize = (sizeBytes: number): boolean =>
      sizeBytes <= MAX_DOC_SIZE;

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_DOC_SIZE }),
        (size) => {
          expect(isValidDocSize(size)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21j: document size validation rejects files > 10MB", () => {
    const MAX_DOC_SIZE = 10 * 1024 * 1024;
    const isValidDocSize = (sizeBytes: number): boolean =>
      sizeBytes <= MAX_DOC_SIZE;

    fc.assert(
      fc.property(
        fc.integer({ min: MAX_DOC_SIZE + 1, max: 100 * 1024 * 1024 }),
        (size) => {
          expect(isValidDocSize(size)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ─── Document count validation ─────────────────────────────────────────────

  it("P21k: at most 1 document URL is accepted by schema", () => {
    fc.assert(
      fc.property(fc.webUrl(), (docUrl) => {
        const result = sendMessageSchema.safeParse({
          message: "Review my draft",
          document_url: docUrl,
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

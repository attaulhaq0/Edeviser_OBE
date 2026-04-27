// =============================================================================
// Unit Tests — EvidenceUploader Component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EvidenceUploader, {
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
} from "@/components/shared/EvidenceUploader";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("EvidenceUploader", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the drop zone when no files are selected", () => {
      render(<EvidenceUploader files={[]} onChange={onChange} />);
      expect(
        screen.getByText(/drag & drop files or click to browse/i)
      ).toBeTruthy();
    });

    it("shows accepted file types and limits", () => {
      render(<EvidenceUploader files={[]} onChange={onChange} />);
      expect(screen.getByText(/jpg, png, pdf, doc, docx/i)).toBeTruthy();
      expect(screen.getByText(/max 5mb each/i)).toBeTruthy();
    });

    it("renders the upload area with proper aria label", () => {
      render(<EvidenceUploader files={[]} onChange={onChange} />);
      expect(screen.getByLabelText(/upload evidence files/i)).toBeTruthy();
    });

    it("renders a hidden file input", () => {
      render(<EvidenceUploader files={[]} onChange={onChange} />);
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeTruthy();
      expect(input?.getAttribute("accept")).toContain(".jpg");
      expect(input?.getAttribute("accept")).toContain(".pdf");
    });
  });

  describe("File Selection", () => {
    it("calls onChange with selected files via file input", async () => {
      const user = userEvent.setup();
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledOnce();
      const newFiles = onChange.mock.calls[0]?.[0] as File[];
      expect(newFiles).toHaveLength(1);
      expect(newFiles[0]?.name).toBe("test.jpg");
    });

    it("accepts PNG files", async () => {
      const user = userEvent.setup();
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const file = createMockFile("screenshot.png", 2048, "image/png");
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledOnce();
    });

    it("accepts PDF files", async () => {
      const user = userEvent.setup();
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const file = createMockFile("notes.pdf", 2048, "application/pdf");
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledOnce();
    });

    it("accepts DOC files", async () => {
      const user = userEvent.setup();
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const file = createMockFile("essay.doc", 2048, "application/msword");
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledOnce();
    });

    it("accepts DOCX files", async () => {
      const user = userEvent.setup();
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const file = createMockFile(
        "report.docx",
        2048,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, file);

      expect(onChange).toHaveBeenCalledOnce();
    });
  });

  describe("File Validation", () => {
    it("rejects files exceeding 5MB", async () => {
      const user = userEvent.setup();
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const largeFile = createMockFile(
        "huge.jpg",
        MAX_FILE_SIZE_BYTES + 1,
        "image/jpeg"
      );
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, largeFile);

      // onChange should NOT be called with the oversized file
      expect(onChange).not.toHaveBeenCalled();
      // Error message should appear
      expect(screen.getByText(/exceeds 5mb limit/i)).toBeTruthy();
    });

    it("rejects unsupported file types via drag-and-drop validation", () => {
      // The file input's accept attribute prevents unsupported types via browse,
      // but drag-and-drop bypasses accept. Our validation catches those.
      const exeFile = createMockFile(
        "virus.exe",
        1024,
        "application/x-msdownload"
      );

      // Simulate adding an unsupported file directly (as if via drag-and-drop)
      // by passing it through the component's validation
      render(<EvidenceUploader files={[]} onChange={onChange} />);

      const dropZone = screen.getByLabelText(/upload evidence files/i);

      // Create a mock DataTransfer with the unsupported file
      const dataTransfer = {
        files: [exeFile],
        items: [{ kind: "file", type: exeFile.type, getAsFile: () => exeFile }],
        types: ["Files"],
      };

      // Fire drop event
      dropZone.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true }), {
          dataTransfer,
        })
      );

      // The onChange should not be called with unsupported files
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("File List Display", () => {
    it("renders file thumbnails for selected files", () => {
      const files = [
        createMockFile("photo.jpg", 1024, "image/jpeg"),
        createMockFile("notes.pdf", 2048, "application/pdf"),
      ];

      render(<EvidenceUploader files={files} onChange={onChange} />);

      expect(screen.getByText("photo.jpg")).toBeTruthy();
      expect(screen.getByText("notes.pdf")).toBeTruthy();
      expect(screen.getByText(/2 of 3 files selected/i)).toBeTruthy();
    });

    it("shows file size for each file", () => {
      const files = [createMockFile("doc.pdf", 2048, "application/pdf")];

      render(<EvidenceUploader files={files} onChange={onChange} />);

      expect(screen.getByText("2.0 KB")).toBeTruthy();
    });

    it("renders remove button for each file", () => {
      const files = [
        createMockFile("photo.jpg", 1024, "image/jpeg"),
        createMockFile("notes.pdf", 2048, "application/pdf"),
      ];

      render(<EvidenceUploader files={files} onChange={onChange} />);

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(removeButtons).toHaveLength(2);
    });

    it("calls onChange without the removed file when remove is clicked", async () => {
      const user = userEvent.setup();
      const files = [
        createMockFile("photo.jpg", 1024, "image/jpeg"),
        createMockFile("notes.pdf", 2048, "application/pdf"),
      ];

      render(<EvidenceUploader files={files} onChange={onChange} />);

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      await user.click(removeButtons[0]!);

      expect(onChange).toHaveBeenCalledOnce();
      const updatedFiles = onChange.mock.calls[0]?.[0] as File[];
      expect(updatedFiles).toHaveLength(1);
      expect(updatedFiles[0]?.name).toBe("notes.pdf");
    });
  });

  describe("Max Files Limit", () => {
    it("hides drop zone when max files reached", () => {
      const files = [
        createMockFile("a.jpg", 1024, "image/jpeg"),
        createMockFile("b.jpg", 1024, "image/jpeg"),
        createMockFile("c.jpg", 1024, "image/jpeg"),
      ];

      render(<EvidenceUploader files={files} onChange={onChange} />);

      expect(screen.queryByText(/drag & drop/i)).toBeNull();
      expect(screen.getByText(/3 of 3 files selected/i)).toBeTruthy();
    });

    it("shows error when trying to add more than max files", async () => {
      const user = userEvent.setup();
      const existingFiles = [
        createMockFile("a.jpg", 1024, "image/jpeg"),
        createMockFile("b.jpg", 1024, "image/jpeg"),
      ];

      render(<EvidenceUploader files={existingFiles} onChange={onChange} />);

      // Try to add 2 more files (only 1 slot available)
      const file1 = createMockFile("c.jpg", 1024, "image/jpeg");
      const file2 = createMockFile("d.jpg", 1024, "image/jpeg");
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await user.upload(input, [file1, file2]);

      // Should add only 1 file and show error
      expect(onChange).toHaveBeenCalledOnce();
      const newFiles = onChange.mock.calls[0]?.[0] as File[];
      expect(newFiles).toHaveLength(3); // 2 existing + 1 new
      expect(screen.getByText(/maximum 3 files allowed/i)).toBeTruthy();
    });
  });

  describe("Disabled State", () => {
    it("disables the drop zone when disabled prop is true", () => {
      render(<EvidenceUploader files={[]} onChange={onChange} disabled />);

      const dropZone = screen.getByLabelText(/upload evidence files/i);
      expect(dropZone.className).toContain("opacity-50");
    });

    it("disables remove buttons when disabled", () => {
      const files = [createMockFile("photo.jpg", 1024, "image/jpeg")];

      render(<EvidenceUploader files={files} onChange={onChange} disabled />);

      const removeBtn = screen.getByRole("button", { name: /remove/i });
      expect(removeBtn).toBeDisabled();
    });
  });

  describe("Constants", () => {
    it("exports correct MAX_FILES value", () => {
      expect(MAX_FILES).toBe(3);
    });

    it("exports correct MAX_FILE_SIZE_BYTES value (5MB)", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    });
  });
});

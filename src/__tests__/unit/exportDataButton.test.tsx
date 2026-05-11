// @vitest-environment happy-dom
// =============================================================================
// ExportDataButton — Unit tests
// Tests GDPR data export button with format selector (Req 64.1, 64.5)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockInvoke = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import ExportDataButton from "@/components/shared/ExportDataButton";
import { toast } from "sonner";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ExportDataButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("renders format selector and download button", () => {
    render(<ExportDataButton studentId="student-1" />);
    expect(
      screen.getByRole("combobox", { name: /export format/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /download my data/i })
    ).toBeDefined();
  });

  it("calls Edge Function with json format by default and shows success toast", async () => {
    mockInvoke.mockResolvedValue({
      data: { download_url: "https://storage.example.com/export.json" },
      error: null,
    });

    render(<ExportDataButton studentId="student-1" />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("export-student-data", {
        body: { student_id: "student-1", format: "json" },
      });
    });

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        "https://storage.example.com/export.json",
        "_blank"
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Data exported as JSON");
    });
  });

  it("shows error toast when Edge Function returns an error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Internal server error" },
    });

    render(<ExportDataButton studentId="student-1" />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Internal server error");
    });
  });

  it("shows error toast when no download URL is returned", async () => {
    mockInvoke.mockResolvedValue({
      data: { download_url: null },
      error: null,
    });

    render(<ExportDataButton studentId="student-1" />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No download URL returned");
    });
  });

  it("disables button during export", async () => {
    let resolveExport: (value: unknown) => void;
    const exportPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });
    mockInvoke.mockReturnValue(exportPromise);

    render(<ExportDataButton studentId="student-1" />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /download my data/i });
      expect(btn.hasAttribute("disabled")).toBe(true);
    });

    resolveExport!({
      data: { download_url: "https://example.com/file.json" },
      error: null,
    });

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /download my data/i });
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
  });
});

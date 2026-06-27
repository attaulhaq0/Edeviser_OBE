// @vitest-environment happy-dom
// =============================================================================
// AvatarUpload — Unit / regression tests
//
// Guards the "Choose file" regression: the trigger button must open the hidden
// file input. The previous implementation wrapped a real <button> inside a
// <label htmlFor>, which the HTML spec defines as a no-op (a label's activation
// behavior does nothing when the event targets an interactive descendant), so
// the file dialog never opened in any browser. The fix triggers the input via
// a ref + onClick. This component is shared by every role's profile page
// (parent + student routed; admin/coordinator/teacher per-role variants), so
// one fix covers them all.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUploadAvatar = vi.fn();
let mockIsPending = false;

vi.mock("@/hooks/useAvatarUpload", () => ({
  useAvatarUpload: () => ({
    uploadAvatar: mockUploadAvatar,
    isPending: mockIsPending,
    error: null,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import AvatarUpload from "@/components/shared/AvatarUpload";

const renderComponent = (currentUrl: string | null = null) =>
  render(
    <I18nextProvider i18n={i18n}>
      <AvatarUpload userId="user-1" currentUrl={currentUrl} />
    </I18nextProvider>
  );

const getFileInput = () =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AvatarUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders a hidden file input that accepts image types", () => {
    renderComponent();
    const input = getFileInput();
    expect(input).not.toBeNull();
    expect(input.className).toContain("hidden");
    expect(input.accept).toBe("image/png,image/jpeg,image/webp");
  });

  it("renders the Choose file button (not wrapped in a <label>)", () => {
    renderComponent();
    const button = screen.getByRole("button", { name: /choose file/i });
    expect(button).toBeDefined();
    // Regression guard: a <label> ancestor would re-introduce the no-op bug.
    expect(button.closest("label")).toBeNull();
  });

  it("opens the file dialog when the Choose file button is clicked", () => {
    renderComponent();
    const input = getFileInput();
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: /choose file/i }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("shows a preview and the Upload action after a valid file is selected", async () => {
    renderComponent();
    const input = getFileInput();
    const file = new File([new Uint8Array(1024)], "photo.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upload photo/i })
      ).toBeDefined();
    });
    expect(screen.getByText("photo.png")).toBeDefined();
  });

  it("uploads the selected file when Upload is clicked", async () => {
    mockUploadAvatar.mockResolvedValue(undefined);
    renderComponent();
    const input = getFileInput();
    const file = new File([new Uint8Array(1024)], "photo.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [file] } });

    const uploadBtn = await screen.findByRole("button", {
      name: /upload photo/i,
    });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledWith({ file });
    });
  });
});

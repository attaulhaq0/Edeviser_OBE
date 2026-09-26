// =============================================================================
// ErrorState, UploadProgress, ReconnectBanner — Unit tests
// Validates: Requirements 66.1, 66.2, 66.3, 66.4
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorState from "@/components/shared/ErrorState";
import UploadProgress, {
  formatFileSize,
} from "@/components/shared/UploadProgress";
import ReconnectBanner from "@/components/shared/ReconnectBanner";
import RealtimeStatusBanner from "@/components/shared/RealtimeStatusBanner";
import { AlertTriangle } from "lucide-react";

// ─── ErrorState ──────────────────────────────────────────────────────────────

describe("ErrorState", () => {
  it('renders default title "Something went wrong"', () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<ErrorState title="Upload Failed" message="Try again" />);
    expect(screen.getByText("Upload Failed")).toBeInTheDocument();
  });

  it("renders the error message", () => {
    render(<ErrorState message="Connection timed out" />);
    expect(screen.getByText("Connection timed out")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    const btn = screen.getByText("Try Again");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });

  it("renders custom retry label", () => {
    render(
      <ErrorState
        message="Error"
        onRetry={() => {}}
        retryLabel="Retry Upload"
      />
    );
    expect(screen.getByText("Retry Upload")).toBeInTheDocument();
  });

  it("renders custom icon", () => {
    render(
      <ErrorState
        message="Error"
        icon={<AlertTriangle data-testid="custom-icon" className="h-8 w-8" />}
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders fallback children content", () => {
    render(
      <ErrorState message="Error">
        <p>Fallback content here</p>
      </ErrorState>
    );
    expect(screen.getByText("Fallback content here")).toBeInTheDocument();
  });
});

// ─── UploadProgress ──────────────────────────────────────────────────────────

describe("UploadProgress", () => {
  it("renders file name and size", () => {
    render(
      <UploadProgress
        progress={50}
        fileName="assignment.pdf"
        fileSize={1024 * 500}
        status="uploading"
      />
    );
    expect(screen.getByText("assignment.pdf")).toBeInTheDocument();
    expect(screen.getByText("500.0 KB")).toBeInTheDocument();
  });

  it("exposes named upload progress with its visible fill width", () => {
    render(
      <UploadProgress
        progress={75}
        fileName="test.pdf"
        fileSize={1024}
        status="uploading"
      />
    );
    const progressBar = screen.getByRole("progressbar", { name: "test.pdf" });
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    expect(progressBar.firstElementChild).toHaveStyle({ width: "75%" });
  });

  it.each([
    [-10, 0],
    [0, 0],
    [25, 25],
    [100, 100],
    [150, 100],
  ])("clamps progress %s to %s for both semantics and fill", (progress, expected) => {
    render(
      <UploadProgress
        progress={progress}
        fileName="test.pdf"
        fileSize={1024}
        status="uploading"
      />
    );
    const progressBar = screen.getByRole("progressbar", { name: "test.pdf" });
    expect(progressBar).toHaveAttribute("aria-valuenow", String(expected));
    expect(progressBar.firstElementChild).toHaveStyle({ width: `${expected}%` });
  });

  it("keeps simultaneous uploads independently named, including Arabic filenames", () => {
    render(
      <>
        <UploadProgress progress={20} fileName="assignment.pdf" fileSize={1024} status="uploading" />
        <UploadProgress progress={60} fileName="واجب.pdf" fileSize={2048} status="uploading" />
      </>
    );
    const first = screen.getByRole("progressbar", { name: "assignment.pdf" });
    const second = screen.getByRole("progressbar", { name: "واجب.pdf" });
    expect(first).toHaveAttribute("aria-valuenow", "20");
    expect(second).toHaveAttribute("aria-valuenow", "60");
    expect(first.getAttribute("aria-labelledby")).not.toBe(second.getAttribute("aria-labelledby"));
  });

  it("shows success icon when status is success", () => {
    const { container } = render(
      <UploadProgress
        progress={100}
        fileName="test.pdf"
        fileSize={1024}
        status="success"
      />
    );
    const successIcon = container.querySelector(".text-green-500");
    expect(successIcon).not.toBeNull();
  });

  it("shows error icon when status is error", () => {
    const { container } = render(
      <UploadProgress
        progress={30}
        fileName="test.pdf"
        fileSize={1024}
        status="error"
      />
    );
    const errorIcon = container.querySelector(".text-red-500");
    expect(errorIcon).not.toBeNull();
  });

  it("shows retry button on error when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(
      <UploadProgress
        progress={30}
        fileName="test.pdf"
        fileSize={1024}
        status="error"
        onRetry={onRetry}
      />
    );
    // The retry button is a ghost button with RefreshCw icon
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows cancel button during upload when onCancel is provided", () => {
    const onCancel = vi.fn();
    render(
      <UploadProgress
        progress={50}
        fileName="test.pdf"
        fileSize={1024}
        status="uploading"
        onCancel={onCancel}
      />
    );
    const cancelBtn = screen.getByRole("button");
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not show progress bar when status is success", () => {
    render(
      <UploadProgress
        progress={100}
        fileName="test.pdf"
        fileSize={1024}
        status="success"
      />
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("does not show progress bar when status is error", () => {
    render(
      <UploadProgress
        progress={30}
        fileName="test.pdf"
        fileSize={1024}
        status="error"
      />
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024 * 5)).toBe("5.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });
});

// ─── ReconnectBanner ─────────────────────────────────────────────────────────

describe("ReconnectBanner", () => {
  it("renders nothing when not disconnected", () => {
    const { container } = render(
      <ReconnectBanner isDisconnected={false} retryCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders banner when disconnected", () => {
    render(<ReconnectBanner isDisconnected={true} retryCount={0} />);
    expect(screen.getByText(/Live updates paused/)).toBeInTheDocument();
    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument();
  });

  it("shows retry count when > 0", () => {
    render(<ReconnectBanner isDisconnected={true} retryCount={3} />);
    expect(screen.getByText("(attempt 3)")).toBeInTheDocument();
  });

  it("does not show retry count when 0", () => {
    render(<ReconnectBanner isDisconnected={true} retryCount={0} />);
    expect(screen.queryByText(/attempt/)).not.toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<ReconnectBanner isDisconnected={true} retryCount={1} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has animated dots indicator", () => {
    render(<ReconnectBanner isDisconnected={true} retryCount={0} />);
    const dots = screen.getByText("...");
    expect(dots.className).toContain("animate-pulse");
  });
});

// ─── RealtimeStatusBanner (delegates to ReconnectBanner) ─────────────────────

describe("RealtimeStatusBanner", () => {
  it("renders nothing when isLive is true", () => {
    const { container } = render(<RealtimeStatusBanner isLive={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders ReconnectBanner when isLive is false", () => {
    render(<RealtimeStatusBanner isLive={false} retryCount={2} />);
    expect(screen.getByText(/Live updates paused/)).toBeInTheDocument();
    expect(screen.getByText("(attempt 2)")).toBeInTheDocument();
  });

  it("defaults retryCount to 0", () => {
    render(<RealtimeStatusBanner isLive={false} />);
    expect(screen.getByText(/Live updates paused/)).toBeInTheDocument();
    expect(screen.queryByText(/attempt/)).not.toBeInTheDocument();
  });
});

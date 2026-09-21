// @vitest-environment happy-dom
import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseCourseFileResponse } from "@/lib/courseFile";

const { invoke, analytics } = vi.hoisted(() => ({
  invoke: vi.fn(),
  analytics: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/lib/analyticsConsent", () => ({ captureAnalyticsEvent: analytics }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { useGenerateCourseFile } from "@/hooks/useCourseFile";

const input = {
  course_id: "11111111-1111-1111-1111-111111111111",
  semester_id: "22222222-2222-2222-2222-222222222222",
};
const valid = {
  success: true,
  pdf_base64: btoa("%PDF-1.4\nfixture"),
  file_type: "pdf",
  report_kind: "normalized_course_snapshot",
  course_name: "Course",
  course_code: "C1",
  semester: "Term",
  generated_at: "2026-09-19T12:00:00Z",
};
const NativeURL = URL;
const createUrl = vi.fn(() => "blob:course-file");
const revokeUrl = vi.fn();
const hook = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useGenerateCourseFile(), { wrapper });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    }
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("useGenerateCourseFile production mutation", () => {
  it("invokes the real hook, validates returned PDF, creates and disposes the download URL", async () => {
    invoke.mockResolvedValue({ data: valid, error: null });
    const { result, unmount } = hook();
    await act(async () => {
      const output = await result.current.mutateAsync(input);
      expect(output.download_url).toBe("blob:course-file");
      expect(output.course_name).toBe("Course");
    });
    expect(invoke).toHaveBeenCalledWith("generate-course-file", {
      body: input,
    });
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(analytics).toHaveBeenCalledWith(
      "course_file_snapshot_generated",
      input
    );
    unmount();
    expect(revokeUrl).toHaveBeenCalledWith("blob:course-file");
  });
  it("revokes previous downloads when retrying", async () => {
    invoke.mockResolvedValue({ data: valid, error: null });
    const { result, unmount } = hook();
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    expect(revokeUrl).toHaveBeenCalledTimes(1);
    unmount();
  });
  it.each([
    {
      status: 400,
      response: JSON.stringify({
        code: "SEMESTER_MISMATCH",
        detail: "PRIVATE SQL",
      }),
      key: "semesterMismatch",
    },
    {
      status: 403,
      response: JSON.stringify({ code: "COURSE_UNAVAILABLE" }),
      key: "courseUnavailable",
    },
    { status: 401, response: "not json", key: "unauthorized" },
    {
      status: 500,
      response: JSON.stringify({ error: "private SQL raw error" }),
      key: "failed",
    },
  ])(
    "propagates sanitized non2xx response $status through actual mutation",
    async ({ status, response, key }) => {
      invoke.mockResolvedValue({
        data: null,
        error: { context: new Response(response, { status }) },
      });
      const { result, unmount } = hook();
      await act(async () => {
        await expect(result.current.mutateAsync(input)).rejects.toThrow(
          `courseFileErrors.${key}`
        );
      });
      expect(createUrl).not.toHaveBeenCalled();
      expect(analytics).not.toHaveBeenCalled();
      unmount();
    }
  );
  it("propagates network errors without trusting their raw message", async () => {
    invoke.mockRejectedValue(new Error("raw network private detail"));
    const { result, unmount } = hook();
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow(
        "courseFileErrors.network"
      );
    });
    unmount();
  });
  it("rejects a logical failure returned with HTTP 200", async () => {
    invoke.mockResolvedValue({
      data: { success: false, code: "REPORT_TOO_LARGE" },
      error: null,
    });
    const { result, unmount } = hook();
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow(
        "courseFileErrors.tooLarge"
      );
    });
    unmount();
  });
  it.each([
    null,
    {},
    { ...valid, pdf_base64: "not pdf" },
    { ...valid, generated_at: "today" },
    { ...valid, pdf_base64: btoa("not PDF bytes") },
    {
      ...valid,
      pdf_base64: undefined,
      download_url: "https://old-server/report",
    },
  ])("rejects malformed/legacy successes: %j", async (data) => {
    invoke.mockResolvedValue({ data, error: null });
    const { result, unmount } = hook();
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow(
        "courseFileErrors.invalidResponse"
      );
    });
    expect(analytics).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
    unmount();
  });
  it("does not leak a Blob URL when response arrives after unmount", async () => {
    let settle: (value: { data: typeof valid; error: null }) => void = () => {};
    invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        })
    );
    const { result, unmount } = hook();
    let pending: Promise<unknown>;
    await act(async () => {
      pending = result.current.mutateAsync(input);
    });
    unmount();
    settle({ data: valid, error: null });
    await expect(pending!).rejects.toThrow("courseFileErrors.failed");
    expect(createUrl).not.toHaveBeenCalled();
  });
  it("enforces response bounds before decoding", () => {
    expect(() =>
      parseCourseFileResponse({
        ...valid,
        pdf_base64: "A".repeat(7 * 1024 * 1024),
      })
    ).toThrow("INVALID_RESPONSE");
  });
});

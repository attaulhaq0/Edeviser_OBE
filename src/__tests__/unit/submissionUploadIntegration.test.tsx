// @vitest-environment happy-dom
// Production hooks + upload/schema/signing helpers, mocked only at external boundaries.
// These tests are NOT a live PostgreSQL RLS certification.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  storageFrom: vi.fn(),
  sign: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
  habit: vi.fn(),
  audit: vi.fn(),
  perfectDay: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: { from: mocks.storageFrom },
    from: mocks.from,
  },
}));
vi.mock("@/lib/auditLogger", () => ({ logAuditEvent: mocks.audit }));
vi.mock("@/lib/perfectDay", () => ({
  awardPerfectDayIfComplete: mocks.perfectDay,
}));
vi.mock("@/hooks/useAuth", () => ({
  // Deliberately stale profile/session context must not determine upload identity.
  useAuth: () => ({
    user: { id: "stale-profile" },
    profile: { id: "stale-profile" },
  }),
}));

import {
  useCreateSubmission,
  useUploadSubmissionFile,
} from "@/hooks/useSubmissions";
import { FileValidationError, uploadSubmissionFile } from "@/lib/fileUpload";
import { getSignedUrl } from "@/lib/storageUrl";
import { submissionSchema } from "@/lib/schemas/submission";
import {
  createSubmissionIntent,
  SubmissionCancelledError,
  type SubmissionIntent,
} from "@/lib/submissionIntent";
let intent: SubmissionIntent;

const STUDENT = "11111111-1111-4111-8111-111111111111";
const FOREIGN_STUDENT = "22222222-2222-4222-8222-222222222222";
const INSTITUTION = "33333333-3333-4333-8333-333333333333";
const ASSIGNMENT = "44444444-4444-4444-8444-444444444444";
const file = () =>
  new File(["Learner answer"], "Data interpretation.txt", {
    type: "text/plain",
  });
const auth = (id: string | null = STUDENT, error: unknown = null) => ({
  data: { user: id ? { id } : null },
  error,
});
const metadata = (path: string) => ({
  intent,
  assignment_id: ASSIGNMENT,
  institution_id: INSTITUTION,
  file_url: path,
  is_late: false,
});
const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

afterEach(() => intent?.cancel());
beforeEach(() => {
  vi.clearAllMocks();
  intent = createSubmissionIntent(STUDENT);
  mocks.getUser.mockResolvedValue(auth());
  mocks.upload.mockResolvedValue({ error: null });
  mocks.storageFrom.mockReturnValue({
    upload: mocks.upload,
    createSignedUrl: mocks.sign,
  });
  mocks.sign.mockResolvedValue({
    data: { signedUrl: "https://example.invalid/signed-object" },
    error: null,
  });
  mocks.single.mockResolvedValue({
    data: { id: "submission-receipt" },
    error: null,
  });
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.habit.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "submissions") return { insert: mocks.insert };
    if (table === "habit_logs") return { upsert: mocks.habit };
    throw new Error(`Unexpected table ${table}`);
  });
});

describe("submission upload production integration", () => {
  it("uses actual authenticated UID first, generated safe filename second, then persists exactly that key", async () => {
    const selected = file();
    const { result } = renderHook(
      () => ({
        upload: useUploadSubmissionFile(),
        create: useCreateSubmission(),
      }),
      { wrapper: wrapper() }
    );
    let path = "";
    await act(async () => {
      // Extra stale/foreign fields from an old caller must not select the owner.
      const params = {
        file: selected,
        intent,
        studentId: FOREIGN_STUDENT,
        institutionId: INSTITUTION,
        assignmentId: ASSIGNMENT,
      };
      path = await result.current.upload.mutateAsync(params);
      await result.current.create.mutateAsync(metadata(path));
    });
    const [owner, name, extra] = path.split("/");
    expect(owner).toBe(STUDENT);
    expect(extra).toBeUndefined();
    expect(name).toMatch(/^[0-9a-f-]{36}-Data_interpretation\.txt$/);
    expect(name).not.toContain(STUDENT);
    expect(path).not.toContain(INSTITUTION);
    expect(path).not.toContain(ASSIGNMENT);
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    expect(mocks.storageFrom).toHaveBeenCalledWith("submissions");
    expect(mocks.upload).toHaveBeenCalledExactlyOnceWith(path, selected, {
      upsert: false,
    });
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith({
      assignment_id: ASSIGNMENT,
      student_id: STUDENT,
      file_url: path,
      is_late: false,
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ performed_by: STUDENT })
    );
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(await getSignedUrl("submissions", path)).toBe(
      "https://example.invalid/signed-object"
    );
    expect(mocks.sign).toHaveBeenCalledWith(path, 3600);
  });

  it("generates distinct immutable keys for concurrent same-name uploads", async () => {
    const selected = file();
    const paths = await Promise.all(
      Array.from({ length: 20 }, () =>
        uploadSubmissionFile({ file: selected, studentId: STUDENT })
      )
    );
    expect(new Set(paths).size).toBe(paths.length);
    expect(
      mocks.upload.mock.calls.every((call) => call[2]?.upsert === false)
    ).toBe(true);
  });

  it("sanitizes Unicode and separator characters without letting the filename create folders", async () => {
    const path = await uploadSubmissionFile({
      file: new File(["answer"], "تقرير/section\\answer #1.txt"),
      studentId: STUDENT,
    });
    expect(path.split("/")).toHaveLength(2);
    expect(path.split("/")[1]).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(path.endsWith(".txt")).toBe(true);
  });

  it.each(["../answer.txt", "answer..txt", "payload.exe"])(
    "rejects unsafe file %s before storage",
    async (name) => {
      await expect(
        uploadSubmissionFile({
          file: new File(["answer"], name),
          studentId: STUDENT,
        })
      ).rejects.toBeInstanceOf(FileValidationError);
      expect(mocks.storageFrom).not.toHaveBeenCalled();
    }
  );

  it.each(["", "../owner", `${STUDENT}/other`, "stale-profile"])(
    "rejects malformed owner %s before storage",
    async (studentId) => {
      await expect(
        uploadSubmissionFile({ file: file(), studentId })
      ).rejects.toThrow();
      expect(mocks.storageFrom).not.toHaveBeenCalled();
    }
  );

  it.each([auth(null), auth(STUDENT, { message: "Expired token" })])(
    "fails closed on unavailable or failed authenticated identity",
    async (response) => {
      mocks.getUser.mockResolvedValue(response);
      const { result } = renderHook(() => useUploadSubmissionFile(), {
        wrapper: wrapper(),
      });
      await act(async () => {
        await expect(
          result.current.mutateAsync({ file: file(), intent })
        ).rejects.toBeInstanceOf(SubmissionCancelledError);
      });
      expect(mocks.storageFrom).not.toHaveBeenCalled();
    }
  );

  it("propagates Storage RLS denial without retrying as another owner/bucket", async () => {
    mocks.upload.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });
    const { result } = renderHook(() => useUploadSubmissionFile(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ file: file(), intent })
      ).rejects.toThrow(/row-level security/);
    });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.storageFrom).toHaveBeenCalledExactlyOnceWith("submissions");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects a foreign-user object if authentication changes between upload and metadata insert", async () => {
    const { result } = renderHook(
      () => ({
        upload: useUploadSubmissionFile(),
        create: useCreateSubmission(),
      }),
      { wrapper: wrapper() }
    );
    await act(async () => {
      const path = await result.current.upload.mutateAsync({
        file: file(),
        intent,
      });
      mocks.getUser.mockResolvedValue(auth(FOREIGN_STUDENT));
      await expect(
        result.current.create.mutateAsync(metadata(path))
      ).rejects.toBeInstanceOf(SubmissionCancelledError);
    });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each([
    `${FOREIGN_STUDENT}/answer.txt`,
    `${INSTITUTION}/${ASSIGNMENT}/${STUDENT}/answer.txt`,
    `submissions/${STUDENT}/answer.txt`,
    `https://example.invalid/${STUDENT}/answer.txt`,
    `${STUDENT}/../answer.txt`,
    `${STUDENT}/%2e%2e/answer.txt`,
  ])(
    "refuses foreign/malformed metadata reference %s before a DB write",
    async (path) => {
      const { result } = renderHook(() => useCreateSubmission(), {
        wrapper: wrapper(),
      });
      await act(async () => {
        await expect(
          result.current.mutateAsync(metadata(path))
        ).rejects.toThrow();
      });
      expect(mocks.from).not.toHaveBeenCalled();
    }
  );

  it.each([
    { code: "42P01", message: 'relation "assignments" does not exist' },
    { code: "42501", message: "assignment scope denied" },
  ])(
    "preserves DB failure $code without audit/habit success or scope substitution",
    async (error) => {
      mocks.single.mockResolvedValue({ data: null, error });
      const { result } = renderHook(() => useCreateSubmission(), {
        wrapper: wrapper(),
      });
      await act(async () => {
        await expect(
          result.current.mutateAsync(metadata(`${STUDENT}/answer.txt`))
        ).rejects.toMatchObject({
          name: "SubmissionRecordError",
          canRetry: true,
        });
      });
      expect(mocks.insert).toHaveBeenCalledTimes(1);
      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ assignment_id: ASSIGNMENT })
      );
      expect(mocks.audit).not.toHaveBeenCalled();
      expect(mocks.habit).not.toHaveBeenCalled();
    }
  );
});

describe("submission read compatibility", () => {
  it.each([
    `${STUDENT}/answer.txt`,
    `${STUDENT}/${ASSIGNMENT}/legacy.txt`,
    `${INSTITUTION}/${ASSIGNMENT}/${STUDENT}/legacy.txt`,
  ])(
    "leaves existing key opaque for server-authorized student/staff read: %s",
    async (path) => {
      await getSignedUrl("submissions", path);
      expect(mocks.sign).toHaveBeenCalledExactlyOnceWith(path, 3600);
    }
  );

  it("does not turn a denied foreign-user or foreign-institution read into a public URL", async () => {
    mocks.sign.mockResolvedValue({
      data: null,
      error: { message: "access denied" },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(
      await getSignedUrl("submissions", `${FOREIGN_STUDENT}/answer.txt`)
    ).toBeNull();
    expect(mocks.sign).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it("validates stored relative paths rather than requiring the old incorrect URL schema", () => {
    expect(
      submissionSchema.safeParse({
        ...metadata(`${STUDENT}/answer.txt`),
        student_id: STUDENT,
      }).success
    ).toBe(true);
    expect(
      submissionSchema.safeParse({
        ...metadata("https://example.invalid/signed"),
        student_id: STUDENT,
      }).success
    ).toBe(false);
  });
});

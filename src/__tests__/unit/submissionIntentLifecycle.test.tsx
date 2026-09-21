// @vitest-environment happy-dom
// Real form -> real mutations -> real intent/upload helpers. Only transport and
// unrelated page data/reward boundaries are mocked; no live actor/data writes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import i18n from "@/lib/i18n";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ASSIGNMENT = "44444444-4444-4444-8444-444444444444";
type Listener = (
  event: string,
  session: { user: { id: string } } | null
) => void;
const mocks = vi.hoisted(() => ({
  actor: "11111111-1111-4111-8111-111111111111" as string | null,
  listeners: new Set<Listener>(),
  getUser: vi.fn(),
  upload: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
  habit: vi.fn(),
  habitRead: vi.fn(),
  invoke: vi.fn(),
  audit: vi.fn(),
  perfect: vi.fn(),
  reward: vi.fn(),
  activity: vi.fn(),
  analytics: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: (listener: Listener) => {
        mocks.listeners.add(listener);
        return {
          data: {
            subscription: {
              unsubscribe: () => mocks.listeners.delete(listener),
            },
          },
        };
      },
    },
    storage: { from: () => ({ upload: mocks.upload }) },
    functions: { invoke: mocks.invoke },
    from: (table: string) => {
      if (table === "submissions") return { insert: mocks.insert };
      if (table === "habit_logs")
        return {
          upsert: mocks.habit,
          select: () => ({ eq: () => ({ eq: () => mocks.habitRead() }) }),
        };
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.actor ? { id: mocks.actor } : null,
    profile: {
      id: "stale-profile",
      institution_id: "33333333-3333-4333-8333-333333333333",
    },
  }),
}));
vi.mock("@/hooks/useSubmissions", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/hooks/useSubmissions")
  >();
  return {
    ...actual,
    useSubmissions: () => ({
      data: { data: [] },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    }),
  };
});
vi.mock("@/hooks/useAssignments", () => ({
  useAssignment: () => ({
    data: {
      id: "44444444-4444-4444-8444-444444444444",
      title: "Data Interpretation Challenge",
      description: "Interpret data",
      course_id: "course-1",
      due_date: "2099-07-29T17:00:00Z",
      total_marks: 100,
      clo_weights: [],
      late_window_hours: 4,
    },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/hooks/useStudentCourses", () => ({
  useStudentCourses: () => ({ data: [] }),
}));
vi.mock("@/hooks/useAdaptiveXP", () => ({
  useAssignmentDifficultyBonus: () => ({ data: null }),
}));
vi.mock("@/hooks/useReadHabitTimer", () => ({ useReadHabitTimer: vi.fn() }));
vi.mock("@/hooks/useOptimisticXP", () => ({
  useOptimisticXP: () => ({ awardXPOptimistic: mocks.reward }),
}));
vi.mock("@/lib/activityLogger", () => ({ logActivity: mocks.activity }));
vi.mock("@/lib/analyticsConsent", () => ({
  captureAnalyticsEvent: mocks.analytics,
}));
vi.mock("@/lib/auditLogger", () => ({ logAuditEvent: mocks.audit }));
vi.mock("@/lib/perfectDay", () => ({
  awardPerfectDayIfComplete: mocks.perfect,
}));
vi.mock("@/lib/storageUrl", () => ({ getSignedUrl: vi.fn(async () => null) }));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, info: mocks.info },
}));
import AssignmentDetailScreen from "@/features/student/assignments/AssignmentDetailScreen";

const authResult = (actor: string | null = A) => ({
  data: { user: actor ? { id: actor } : null },
  error: null,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const emit = (
  actor: string | null,
  event = actor ? "SIGNED_IN" : "SIGNED_OUT"
) => {
  mocks.actor = actor;
  for (const listener of [...mocks.listeners])
    listener(event, actor ? { user: { id: actor } } : null);
};
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};
const RoutedForm = () => {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(`/student/assignments/${B}`)}>
        Change assignment
      </button>
      <AssignmentDetailScreen />
    </>
  );
};
const page = (client: QueryClient) => (
  <QueryClientProvider client={client}>
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/student/assignments/${ASSIGNMENT}`]}>
        <Routes>
          <Route path="/student/assignments/:id" element={<RoutedForm />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  </QueryClientProvider>
);
const open = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, gcTime: 0 },
    },
  });
  const view = render(page(client));
  const select = (name = "answer.txt") => {
    const file = new File(["A's private answer"], name, { type: "text/plain" });
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    return file;
  };
  const submit = () =>
    fireEvent.click(
      screen.getByRole("button", { name: /submit assignment|submitting/i })
    );
  return { ...view, select, submit, client };
};
const noCompletion = () => {
  expect(mocks.reward).not.toHaveBeenCalled();
  expect(mocks.activity).not.toHaveBeenCalled();
  expect(mocks.analytics).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.refetch).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.listeners.clear();
  mocks.actor = A;
  mocks.getUser.mockImplementation(async () => authResult(mocks.actor));
  mocks.upload.mockResolvedValue({ error: null });
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.single.mockResolvedValue({ data: { id: "receipt" }, error: null });
  mocks.habit.mockResolvedValue({ error: null });
  mocks.audit.mockResolvedValue(undefined);
  mocks.perfect.mockResolvedValue(undefined);
  mocks.habitRead.mockResolvedValue({
    data: ["login", "submit", "journal", "read"].map((habit_type) => ({
      habit_type,
    })),
    error: null,
  });
  mocks.invoke.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("submission intent lifetime", () => {
  it.each([B, null])(
    "never retargets A's selected file when actor becomes %s before submit",
    async (actor) => {
      const view = open();
      view.select();
      act(() => emit(actor)); // Auth event without a React rerender, as across tabs.
      view.submit();
      await flush();
      expect(mocks.upload).not.toHaveBeenCalled();
      expect(mocks.insert).not.toHaveBeenCalled();
      noCompletion();
    }
  );

  it.each([
    "switch",
    "sign-out",
    "unmount",
    "replace",
    "clear",
    "route",
    "auth-render",
  ])("cancels delayed retry on %s", async (change) => {
    mocks.upload.mockResolvedValueOnce({
      error: { message: "Failed to fetch" },
    });
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.info).toHaveBeenCalledTimes(1);
    act(() => {
      if (change === "switch") emit(B);
      if (change === "sign-out") emit(null);
      if (change === "unmount") view.unmount();
      if (change === "replace") view.select("replacement.txt");
      if (change === "clear")
        fireEvent.click(screen.getByRole("button", { name: /clear file/i }));
      if (change === "route")
        fireEvent.click(
          screen.getByRole("button", { name: "Change assignment" })
        );
      if (change === "auth-render") {
        mocks.actor = B;
        view.rerender(page(view.client));
      }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    noCompletion();
    if (change === "unmount") expect(mocks.listeners.size).toBe(0);
  });

  it("allows same-user token refresh and retries the original File under A only", async () => {
    mocks.upload.mockResolvedValueOnce({
      error: { message: "Failed to fetch" },
    });
    const view = open();
    const file = view.select();
    view.submit();
    await flush();
    act(() => emit(A, "TOKEN_REFRESHED"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    for (const [path, uploaded] of mocks.upload.mock.calls) {
      expect(path.split("/")[0]).toBe(A);
      expect(uploaded).toBe(file);
    }
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.reward).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: A })
    );
    expect(mocks.listeners.size).toBe(0);
  });

  it("rejects a fresh different actor even if its auth event was not delivered", async () => {
    mocks.getUser.mockResolvedValue(authResult(B));
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    noCompletion();
  });

  it.each(["switch", "unmount"])(
    "rejects stale getUser(A) after %s during authentication await",
    async (change) => {
      const pending = deferred<ReturnType<typeof authResult>>();
      mocks.getUser.mockReturnValue(pending.promise);
      const view = open();
      view.select();
      view.submit();
      await flush();
      act(() => {
        if (change === "switch") emit(B);
        else view.unmount();
      });
      pending.resolve(authResult(A));
      await flush();
      expect(mocks.upload).not.toHaveBeenCalled();
      expect(mocks.insert).not.toHaveBeenCalled();
      noCompletion();
    }
  );

  it.each(["switch", "unmount", "replace"])(
    "suppresses late uploaded-object continuation after %s",
    async (change) => {
      const pending = deferred<{ error: null }>();
      mocks.upload.mockReturnValue(pending.promise);
      const view = open();
      view.select();
      view.submit();
      await flush();
      expect(mocks.upload.mock.calls[0]![0].split("/")[0]).toBe(A);
      act(() => {
        if (change === "switch") emit(B);
        else if (change === "unmount") view.unmount();
        else view.select("new.txt");
      });
      pending.resolve({ error: null });
      await flush();
      // The already-authorized A object may exist; no B upload or metadata follows.
      expect(mocks.upload).toHaveBeenCalledTimes(1);
      expect(mocks.insert).not.toHaveBeenCalled();
      noCompletion();
      expect(mocks.error).not.toHaveBeenCalled();
    }
  );

  it("checks actor again before metadata when only getUser observes the switch", async () => {
    mocks.getUser
      .mockResolvedValueOnce(authResult(A))
      .mockResolvedValueOnce(authResult(B));
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.insert).not.toHaveBeenCalled();
    noCompletion();
  });

  it.each(["switch", "unmount"])(
    "suppresses all post-record side effects after %s during DB await",
    async (change) => {
      const pending = deferred<{ data: { id: string }; error: null }>();
      mocks.single.mockReturnValue(pending.promise);
      const view = open();
      view.select();
      view.submit();
      await flush();
      expect(mocks.insert).toHaveBeenCalledTimes(1);
      act(() => {
        if (change === "switch") emit(B);
        else view.unmount();
      });
      pending.resolve({ data: { id: "receipt" }, error: null });
      await flush();
      expect(mocks.audit).not.toHaveBeenCalled();
      expect(mocks.habit).not.toHaveBeenCalled();
      expect(mocks.perfect).not.toHaveBeenCalled();
      noCompletion();
    }
  );

  it("suppresses habit/reward work if account changes during audit await", async () => {
    const pending = deferred<void>();
    mocks.audit.mockReturnValue(pending.promise);
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.audit).toHaveBeenCalledTimes(1);
    act(() => emit(B));
    pending.resolve();
    await flush();
    expect(mocks.habit).not.toHaveBeenCalled();
    expect(mocks.perfect).not.toHaveBeenCalled();
    noCompletion();
  });

  it("suppresses reward work if account changes during habit await", async () => {
    const pending = deferred<{ error: null }>();
    mocks.habit.mockReturnValue(pending.promise);
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.habit).toHaveBeenCalledTimes(1);
    act(() => emit(B));
    pending.resolve({ error: null });
    await flush();
    expect(mocks.perfect).not.toHaveBeenCalled();
    noCompletion();
  });
});

describe("real Perfect Day cancellation propagation", () => {
  it("passes the actor intent through the real helper and stops after a deferred habit lookup", async () => {
    const actual = await vi.importActual<typeof import("@/lib/perfectDay")>(
      "@/lib/perfectDay"
    );
    mocks.perfect.mockImplementation(actual.awardPerfectDayIfComplete);
    const pending = deferred<{ data: { habit_type: string }[]; error: null }>();
    mocks.habitRead.mockReturnValue(pending.promise);
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.habitRead).toHaveBeenCalledTimes(1);
    act(() => emit(B));
    pending.resolve({
      data: ["login", "submit", "journal", "read"].map((habit_type) => ({
        habit_type,
      })),
      error: null,
    });
    await flush();
    expect(mocks.invoke).not.toHaveBeenCalled();
    noCompletion();
  });

  it("does not start check-badges after switching during the real award-xp await", async () => {
    const actual = await vi.importActual<typeof import("@/lib/perfectDay")>(
      "@/lib/perfectDay"
    );
    mocks.perfect.mockImplementation(actual.awardPerfectDayIfComplete);
    const pending = deferred<{ data: object; error: null }>();
    mocks.invoke.mockReturnValueOnce(pending.promise);
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke.mock.calls[0]![1].body.student_id).toBe(A);
    act(() => emit(B));
    pending.resolve({ data: {}, error: null });
    await flush();
    expect(mocks.invoke.mock.calls.map((call) => call[0])).toEqual([
      "award-xp",
    ]);
    noCompletion();
  });
});

describe("bounded upload/record recovery feedback", () => {
  it("never renders a raw Storage backend sentinel", async () => {
    mocks.upload.mockResolvedValue({
      error: { message: "INTERNAL_STORAGE_SENTINEL" },
    });
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(screen.queryByText(/INTERNAL_STORAGE_SENTINEL/)).toBeNull();
    expect(mocks.error).toHaveBeenCalledWith(
      i18n.t("assignments.detail.uploadFailed", { ns: "student" })
    );
    expect(mocks.insert).not.toHaveBeenCalled();
    noCompletion();
  });

  it("shows record failure and reuses the same uploaded object on explicit retry of a rejected transaction", async () => {
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "42P01", message: "INTERNAL_DB_SENTINEL" },
    });
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(screen.queryByText(/INTERNAL_DB_SENTINEL/)).toBeNull();
    expect(
      screen.getByText(
        i18n.t("assignments.detail.submissionRecordFailed", { ns: "student" })
      )
    ).toBeTruthy();
    noCompletion();
    view.submit();
    await flush();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(mocks.insert.mock.calls[0]![0].file_url).toBe(
      mocks.insert.mock.calls[1]![0].file_url
    );
    expect(mocks.reward).toHaveBeenCalledTimes(1);
  });

  it("blocks blind retry after an uncertain commit rather than duplicating files/records", async () => {
    mocks.single.mockRejectedValue(new Error("INTERNAL_NETWORK_SENTINEL"));
    const view = open();
    view.select();
    view.submit();
    await flush();
    expect(screen.queryByText(/INTERNAL_NETWORK_SENTINEL/)).toBeNull();
    expect(
      screen.getByText(
        i18n.t("assignments.detail.submissionUnconfirmed", { ns: "student" })
      )
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: /submit assignment/i,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /clear file/i }));
    view.select("attempted-bypass.txt");
    view.submit();
    await flush();
    expect(
      (view.container.querySelector('input[type="file"]') as HTMLInputElement)
        .disabled
    ).toBe(true);
    expect(screen.queryByText("attempted-bypass.txt")).toBeNull();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    noCompletion();
  });

  it.each(["confirm", "reject", "unknown"])(
    "holds the actor/assignment lock through clear/reselect while record is pending, then %s",
    async (outcome) => {
      const pending = deferred<{
        data: { id: string } | null;
        error: { code: string; message: string } | null;
      }>();
      mocks.single.mockReturnValueOnce(pending.promise);
      const view = open();
      view.select();
      view.submit();
      await flush();
      expect(mocks.insert).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole("button", { name: /clear file/i }));
      view.select("pending-bypass.txt");
      view.submit();
      await flush();
      expect(
        (view.container.querySelector('input[type="file"]') as HTMLInputElement)
          .disabled
      ).toBe(true);
      expect(screen.queryByText("pending-bypass.txt")).toBeNull();
      expect(mocks.upload).toHaveBeenCalledTimes(1);
      expect(mocks.insert).toHaveBeenCalledTimes(1);
      pending.resolve(
        outcome === "confirm"
          ? { data: { id: "receipt" }, error: null }
          : {
              data: null,
              error: {
                code: outcome === "reject" ? "42P01" : "",
                message: "INTERNAL_DB_SENTINEL",
              },
            }
      );
      await flush();
      if (outcome === "confirm") {
        expect(mocks.reward).toHaveBeenCalledTimes(1);
      } else if (outcome === "reject") {
        view.submit();
        await flush();
        expect(mocks.upload).toHaveBeenCalledTimes(1);
        expect(mocks.insert).toHaveBeenCalledTimes(2);
      } else {
        fireEvent.click(screen.getByRole("button", { name: /clear file/i }));
        view.select("still-blocked.txt");
        view.submit();
        await flush();
        expect(mocks.upload).toHaveBeenCalledTimes(1);
        expect(mocks.insert).toHaveBeenCalledTimes(1);
        noCompletion();
      }
    }
  );
});

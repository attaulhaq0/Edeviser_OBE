import { supabase } from "@/lib/supabase";

/** One selected file's actor intent. Never rebind it to a refreshed account. */
export interface SubmissionIntent {
  readonly actorId: string;
  readonly signal: AbortSignal;
  cancel: () => void;
}

// Retry only explicit transaction rejections; unknown transport may have committed.
export class SubmissionRecordError extends Error {
  readonly canRetry: boolean;
  constructor(error: unknown) {
    super("Submission record could not be confirmed");
    this.name = "SubmissionRecordError";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    this.canRetry =
      typeof code === "string" && /^(22|23|28|42|44)[A-Z0-9]{3}$/.test(code);
  }
}

export class SubmissionCancelledError extends Error {
  constructor() {
    super("Submission intent is no longer active");
    this.name = "SubmissionCancelledError";
  }
}

export function assertSubmissionIntent(intent: SubmissionIntent): void {
  if (intent.signal.aborted) throw new SubmissionCancelledError();
}

/** The caller owns cancellation on replacement, route change and unmount. */
export function createSubmissionIntent(actorId: string): SubmissionIntent {
  const controller = new AbortController();
  const listener: { unsubscribe?: () => void } = {};
  const cancel = () => {
    controller.abort();
    listener.unsubscribe?.();
  };
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user.id !== actorId) cancel();
  });
  listener.unsubscribe = () => subscription.unsubscribe();
  // Also covers a synchronous initial callback from an auth adapter.
  if (controller.signal.aborted) listener.unsubscribe();
  return { actorId, signal: controller.signal, cancel };
}

/** Check before each write, and reject stale getUser results after the await. */
export async function verifySubmissionIntent(
  intent: SubmissionIntent
): Promise<void> {
  assertSubmissionIntent(intent);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  assertSubmissionIntent(intent);
  if (error || !user || user.id !== intent.actorId) {
    intent.cancel();
    throw new SubmissionCancelledError();
  }
}

/** Abort clears the timer and settles the wait; it cannot schedule a retry. */
export function waitForSubmissionRetry(
  intent: SubmissionIntent,
  delayMs: number
): Promise<void> {
  assertSubmissionIntent(intent);
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      intent.signal.removeEventListener("abort", onAbort);
      reject(new SubmissionCancelledError());
    };
    const timer = setTimeout(() => {
      intent.signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    intent.signal.addEventListener("abort", onAbort, { once: true });
    if (intent.signal.aborted) onAbort();
  });
}

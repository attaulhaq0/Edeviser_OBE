// Task 84.1: Edge Function rate limiter shared module
// In-memory Map keyed by user_id:function_name

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export const READ_LIMIT = 100;
export const WRITE_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute

/** Clean up expired entries to prevent memory leaks */
const cleanupExpired = (now: number): void => {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
};

export const checkRateLimit = (
  userId: string,
  functionName: string,
  limit: number = READ_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult => {
  const key = `${userId}:${functionName}`;
  const now = Date.now();

  // Periodically clean up expired entries
  if (store.size > 1000) cleanupExpired(now);

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
};

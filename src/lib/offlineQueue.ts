// Task 54: Offline Queue — queue events when offline, flush on reconnect
const QUEUE_KEY = "edeviser_offline_queue";
const MAX_RETRIES = 3;

interface QueuedEvent {
  id: string;
  payload: unknown;
  handler: string;
  retries: number;
  queuedAt: number;
}

function getQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

type FlushHandler = (payload: unknown) => Promise<void>;
const handlers = new Map<string, FlushHandler>();

export const offlineQueue = {
  registerHandler(name: string, handler: FlushHandler): void {
    handlers.set(name, handler);
  },

  enqueue(handlerName: string, payload: unknown): void {
    const queue = getQueue();
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payload,
      handler: handlerName,
      retries: 0,
      queuedAt: Date.now(),
    });
    saveQueue(queue);
  },

  async flush(): Promise<{ flushed: number; failed: number }> {
    const queue = getQueue();
    if (queue.length === 0) return { flushed: 0, failed: 0 };

    let flushed = 0;
    let failed = 0;
    const remaining: QueuedEvent[] = [];

    for (const event of queue) {
      const handler = handlers.get(event.handler);
      if (!handler) {
        remaining.push(event);
        failed++;
        continue;
      }
      try {
        await handler(event.payload);
        flushed++;
      } catch {
        event.retries++;
        if (event.retries < MAX_RETRIES) remaining.push(event);
        else failed++;
      }
    }

    saveQueue(remaining);
    return { flushed, failed };
  },

  init(): () => void {
    const handler = () => {
      offlineQueue
        .flush()
        .catch((err) => console.error("[OfflineQueue] flush failed:", err));
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  },

  size(): number {
    return getQueue().length;
  },
};

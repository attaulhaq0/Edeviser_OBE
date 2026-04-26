import { useState, useCallback, useEffect, useRef } from 'react';

interface QueuedAction {
  id: string;
  fn: () => Promise<unknown>;
  retries: number;
}

export const useOfflineQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const queueRef = useRef<QueuedAction[]>([]);

  const processQueue = useCallback(async () => {
    const queue = [...queueRef.current];
    queueRef.current = [];
    setQueueSize(0);

    for (const action of queue) {
      try {
        await action.fn();
      } catch {
        if (action.retries < 3) {
          queueRef.current.push({ ...action, retries: action.retries + 1 });
        }
      }
    }
    setQueueSize(queueRef.current.length);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  const enqueue = useCallback((fn: () => Promise<unknown>) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (isOnline) {
      fn().catch(() => {
        queueRef.current.push({ id, fn, retries: 0 });
        setQueueSize(queueRef.current.length);
      });
    } else {
      queueRef.current.push({ id, fn, retries: 0 });
      setQueueSize(queueRef.current.length);
    }
  }, [isOnline]);

  return { isOnline, queueSize, enqueue };
};

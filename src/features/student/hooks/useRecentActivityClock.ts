import { useEffect, useState } from "react";

/** Reevaluate a display-only activity window while a student screen is mounted. */
export const useRecentActivityClock = (): number => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNowMs(Date.now());
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    const interval = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return nowMs;
};

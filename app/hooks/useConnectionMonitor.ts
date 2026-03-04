import { useEffect, useRef } from "react";
import { useAppStore } from "../lib/store";
import { getHealth } from "../lib/api-client";

const PING_INTERVAL = 30000; // 30 seconds

export function useConnectionMonitor() {
  const setIsOnline = useAppStore((s) => s.setIsOnline);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getHealth();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    // Initial check
    checkConnection();

    // Periodic check
    intervalRef.current = setInterval(checkConnection, PING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setIsOnline]);
}

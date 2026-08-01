import { useEffect, useState } from "react";
import { subscribePerf, type PerfState } from "@/lib/perf";

/** Subscribe to the shared performance governor. */
export function usePerf(): PerfState {
  const [state, setState] = useState<PerfState>(() => ({
    fps: 0,
    tier: "high",
    mode: "auto",
    longTasks: 0,
    heap: null,
    ceiling: "high",
    degraded: false,
    reason: null,
  }));
  useEffect(() => {
    const off = subscribePerf(setState);
    return () => {
      off();
    };
  }, []);
  return state;
}

export type HostAlert = { kind: "cpu" | "ram" | "disk" | "link"; value: number; label: string };

/** Fire a host-side load warning; PerfGuard renders it as a toast. */
export function raiseHostAlert(alert: HostAlert) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HostAlert>("nexus:host-alert", { detail: alert }));
}

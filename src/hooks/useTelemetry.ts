import { useEffect, useRef, useState } from "react";

export type Telemetry = {
  cpu: number;
  mem: number;
  disk: number;
  net: number;
  uptime: number;
  latency: number;
};

const START: Telemetry = { cpu: 0, mem: 0, disk: 0, net: 0, uptime: 0, latency: 0 };
const TARGET_SEED: Telemetry = { cpu: 34, mem: 11.4, disk: 62, net: 18, uptime: 72, latency: 42 };

function drift(v: number, base: number, spread: number) {
  const next = v + (Math.random() - 0.5) * spread;
  return Math.max(base * 0.55, Math.min(base * 1.45, next));
}

/**
 * Demo telemetry stream for the shell: eases up from zero on mount, then drifts
 * smoothly so the dashboard feels alive without any backend wired.
 * Pauses automatically when the tab is hidden and respects reduced motion.
 */
export function useTelemetry(active = true) {
  const [data, setData] = useState<Telemetry>(START);
  const target = useRef<Telemetry>({ ...TARGET_SEED });

  useEffect(() => {
    if (!active) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setData({ ...TARGET_SEED });
      return;
    }

    let raf = 0;
    let last = performance.now();
    let sinceDrift = 0;

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      sinceDrift += dt;

      if (sinceDrift > 1400) {
        sinceDrift = 0;
        const t = target.current;
        target.current = {
          cpu: drift(t.cpu, TARGET_SEED.cpu, 14),
          mem: drift(t.mem, TARGET_SEED.mem, 1.2),
          disk: drift(t.disk, TARGET_SEED.disk, 1.5),
          net: drift(t.net, TARGET_SEED.net, 10),
          uptime: t.uptime + 0.01,
          latency: drift(t.latency, TARGET_SEED.latency, 16),
        };
      }

      setData((prev) => {
        const k = 1 - Math.pow(0.006, dt / 1000);
        const t = target.current;
        return {
          cpu: prev.cpu + (t.cpu - prev.cpu) * k,
          mem: prev.mem + (t.mem - prev.mem) * k,
          disk: prev.disk + (t.disk - prev.disk) * k,
          net: prev.net + (t.net - prev.net) * k,
          uptime: prev.uptime + (t.uptime - prev.uptime) * k,
          latency: prev.latency + (t.latency - prev.latency) * k,
        };
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  return data;
}

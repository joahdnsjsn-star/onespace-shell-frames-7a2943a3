import { useEffect, useRef, useState } from "react";
import { Activity, Cpu, Gauge, X } from "lucide-react";
import { startPerfGovernor } from "@/lib/perf";
import { usePerf, type HostAlert } from "@/hooks/usePerf";
import { haptic } from "@/lib/haptics";

type Toast = { id: number; title: string; body: string; kind: "perf" | "host" };

/**
 * Global performance guard. Runs the adaptive governor (which sheds heavy
 * visual layers when frames drop) and surfaces a single, quiet toast whenever
 * the app self-adjusts or the paired host reports high CPU / RAM.
 */
export function PerfGuard() {
  const perf = usePerf();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastReason = useRef<string | null>(null);
  const lastHost = useRef(0);

  useEffect(() => startPerfGovernor(), []);

  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.filter((x) => x.kind !== t.kind), { ...t, id }].slice(-2));
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  };

  // Automatic quality changes.
  useEffect(() => {
    if (!perf.reason || perf.reason === lastReason.current) return;
    lastReason.current = perf.reason;
    if (perf.mode !== "auto") return;
    push({
      kind: "perf",
      title: perf.degraded ? "Performance mode engaged" : "Full effects restored",
      body: perf.degraded
        ? `${perf.reason} — visual effects reduced to keep things smooth.`
        : "Frame rate is healthy again.",
    });
    haptic("tap");
  }, [perf.reason, perf.degraded, perf.mode]);

  // Host-side load warnings raised by any page.
  useEffect(() => {
    const onAlert = (e: Event) => {
      const detail = (e as CustomEvent<HostAlert>).detail;
      if (!detail) return;
      const now = Date.now();
      if (now - lastHost.current < 20_000) return;
      lastHost.current = now;
      push({
        kind: "host",
        title: `${detail.kind.toUpperCase()} pressure on host`,
        body: `${detail.label} — Butler is throttling background work until it settles.`,
      });
      haptic("warn");
    };
    window.addEventListener("nexus:host-alert", onAlert as EventListener);
    return () => window.removeEventListener("nexus:host-alert", onAlert as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] mx-auto flex w-full max-w-lg flex-col gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rise-in pointer-events-auto flex items-start gap-3 rounded-xl border border-warn/35 glass px-3 py-2.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)]"
        >
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-warn/35 bg-warn/10 text-warn">
            {t.kind === "host" ? <Cpu size={14} /> : <Gauge size={14} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="label-mono text-[10px] text-warn">{t.title}</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.body}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="press grid size-6 shrink-0 place-items-center rounded-md text-faint hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Compact live readout used in Settings. */
export function PerfReadout() {
  const perf = usePerf();
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
      <Activity size={13} className="text-cyan" />
      <span className="tabular-nums">{perf.fps || "--"} fps</span>
      <span className="text-faint">·</span>
      <span className="uppercase">{perf.tier}</span>
      {perf.heap !== null ? (
        <>
          <span className="text-faint">·</span>
          <span className="tabular-nums">{Math.round(perf.heap * 100)}% heap</span>
        </>
      ) : null}
    </div>
  );
}

/**
 * Adaptive performance governor.
 *
 * One shared rAF sampler measures real frame rate, long tasks and JS heap
 * pressure, then writes a tier onto `<html data-perf>` so CSS can shed the
 * expensive layers (starfield, orbs, blurs, infinite animations) automatically
 * when the device or the bridge starts to lag. Everything is client-only and
 * costs a single rAF callback for the whole app.
 */

export type PerfMode = "auto" | "high" | "balanced" | "low";
export type PerfTier = "high" | "balanced" | "low";

export type PerfState = {
  /** Rolling frames-per-second, 0 until the first sample lands. */
  fps: number;
  /** Tier currently applied to the document. */
  tier: PerfTier;
  /** User preference: auto governs itself, anything else pins the tier. */
  mode: PerfMode;
  /** Long tasks (>50ms on the main thread) counted in the last 10s. */
  longTasks: number;
  /** JS heap usage 0-1 where the browser exposes it, else null. */
  heap: number | null;
  /** Best tier this device should ever attempt. */
  ceiling: PerfTier;
  /** True when auto mode has stepped below the ceiling. */
  degraded: boolean;
  /** Human-readable cause of the last automatic change. */
  reason: string | null;
};

const ORDER: PerfTier[] = ["low", "balanced", "high"];
const MODE_KEY = "nexus:perf.mode";

let state: PerfState = {
  fps: 0,
  tier: "high",
  mode: "auto",
  longTasks: 0,
  heap: null,
  ceiling: "high",
  degraded: false,
  reason: null,
};

const listeners = new Set<(s: PerfState) => void>();
let started = false;

/**
 * Quiet window: while active the governor keeps measuring but never changes
 * tier, so short, expected bursts (route transitions, deferred chunks mounting,
 * splash teardown) can never trigger a "performance mode engaged" popup.
 */
let quietUntil = 0;

/** Silences automatic tier changes for `ms`. Safe to call from anywhere. */
export function perfQuiet(ms = 1200) {
  if (typeof performance === "undefined") return;
  quietUntil = Math.max(quietUntil, performance.now() + ms);
}

/** True while automatic tier changes are suppressed. */
export function isPerfQuiet() {
  return typeof performance !== "undefined" && performance.now() < quietUntil;
}


function emit(patch: Partial<PerfState>) {
  const next = { ...state, ...patch };
  if (
    next.fps === state.fps &&
    next.tier === state.tier &&
    next.mode === state.mode &&
    next.longTasks === state.longTasks &&
    next.heap === state.heap &&
    next.degraded === state.degraded &&
    next.reason === state.reason
  ) {
    return;
  }
  state = next;
  listeners.forEach((fn) => fn(state));
}

function applyTier(tier: PerfTier) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["perf"] = tier;
}

/** Static capability probe — decides the best tier this hardware should try. */
function deviceCeiling(): PerfTier {
  if (typeof navigator === "undefined") return "high";
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData === true;
  const slowNet = /^(slow-2g|2g)$/.test(nav.connection?.effectiveType ?? "");
  if (saveData || cores <= 2 || memory <= 2) return "low";
  if (slowNet || cores <= 4 || memory <= 4) return "balanced";
  return "high";
}

function readMode(): PerfMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    const parsed = raw === null ? "auto" : (JSON.parse(raw) as string);
    return parsed === "high" || parsed === "balanced" || parsed === "low" ? parsed : "auto";
  } catch {
    return "auto";
  }
}

function readHeap(): number | null {
  const mem = (performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  }).memory;
  if (!mem || !mem.jsHeapSizeLimit) return null;
  return mem.usedJSHeapSize / mem.jsHeapSizeLimit;
}

/** Starts the governor once per document. Returns a cleanup for the caller. */
export function startPerfGovernor(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  const ceiling = deviceCeiling();
  const mode = readMode();
  const initial: PerfTier = mode === "auto" ? ceiling : mode;
  applyTier(initial);
  emit({ ceiling, mode, tier: initial, degraded: mode === "auto" && initial !== ceiling });

  let frames = 0;
  let windowStart = performance.now();
  let raf = 0;
  let goodStreak = 0;
  let longTaskStamps: number[] = [];

  // Long-task observer: catches jank that FPS alone can miss (server-driven
  // bursts, heavy parsing) even when the compositor keeps painting.
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      const now = performance.now();
      for (const entry of list.getEntries()) if (entry.duration > 50) longTaskStamps.push(now);
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    observer = null;
  }

  // Hysteresis: never re-tier more than once every 20s, so a single heavy
  // second cannot start a downgrade/upgrade ping-pong.
  let lastStepAt = 0;
  let jankStreak = 0;

  const step = (dir: -1 | 1, reason: string) => {
    if (state.mode !== "auto") return;
    const now = performance.now();
    if (now - lastStepAt < 20_000) return;
    lastStepAt = now;
    const idx = ORDER.indexOf(state.tier);
    const capped = ORDER.indexOf(state.ceiling);
    const nextIdx = Math.max(0, Math.min(dir > 0 ? capped : ORDER.length - 1, idx + dir));
    const next = ORDER[nextIdx] ?? state.tier;
    if (next === state.tier) return;
    applyTier(next);
    emit({ tier: next, degraded: ORDER.indexOf(next) < capped, reason });
  };

  const sample = (now: number) => {
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      const fps = Math.round((frames * 1000) / elapsed);
      frames = 0;
      windowStart = now;
      longTaskStamps = longTaskStamps.filter((t) => now - t < 10_000);
      const heap = readHeap();
      emit({ fps, heap, longTasks: longTaskStamps.length });

      if (state.mode === "auto" && isPerfQuiet()) {
        // Expected burst in progress — measure, but never re-tier or popup.
        goodStreak = 0;
      } else if (state.mode === "auto") {

        const heavyHeap = heap !== null && heap > 0.86;
        const janky = fps < 34 || longTaskStamps.length >= 6 || heavyHeap;
        if (janky) {
          goodStreak = 0;
          jankStreak += 1;
          // Three bad seconds in a row before shedding anything.
          if (jankStreak >= 3)
            step(
            -1,
            heavyHeap
              ? "memory pressure high"
              : fps < 34
                ? `frame rate dropped to ${fps} fps`
                : "main thread blocked",
            );
        } else if (fps >= 52 && longTaskStamps.length === 0) {
          jankStreak = 0;
          goodStreak += 1;
          if (goodStreak >= 8) {
            goodStreak = 0;
            step(1, "headroom recovered");
          }
        } else {
          jankStreak = 0;
          goodStreak = 0;
        }
      }
    }
    raf = requestAnimationFrame(sample);
  };

  raf = requestAnimationFrame(sample);

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (document.hidden) return;
    frames = 0;
    windowStart = performance.now();
    raf = requestAnimationFrame(sample);
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onPrefs = () => setPerfMode(readMode());
  window.addEventListener("nexus:prefs", onPrefs);
  window.addEventListener("storage", onPrefs);

  return () => {
    started = false;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("nexus:prefs", onPrefs);
    window.removeEventListener("storage", onPrefs);
  };
}

/** Pins the tier (or hands control back to the governor with "auto"). */
export function setPerfMode(mode: PerfMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_KEY, JSON.stringify(mode));
  } catch {
    /* storage blocked — session-only */
  }
  const tier: PerfTier = mode === "auto" ? state.ceiling : mode;
  applyTier(tier);
  emit({ mode, tier, degraded: false, reason: mode === "auto" ? null : "pinned manually" });
}

export function subscribePerf(fn: (s: PerfState) => void) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getPerfState() {
  return state;
}

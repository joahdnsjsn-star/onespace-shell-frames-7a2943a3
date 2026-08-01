/**
 * Auto-connect engine — the single owner of the PC link lifecycle.
 *
 * Ported in spirit from the native `autoConnectEngine`, adapted to the phone
 * shell: one state machine, one timer, no competing reconnect loops anywhere
 * else in the app.
 *
 *   boot → connecting → online
 *        → offline → (backoff) → connecting …
 *        → offline → discovering (saved address is dead) → connecting …
 *
 * Rules that keep it cheap on a handset:
 *  - polling stops entirely while the app is backgrounded or the radio is off,
 *    and resumes instantly on foreground / `online`
 *  - backoff is 2s → 5s → 10s → 20s → 40s → 60s, reset on every success
 *  - a LAN sweep is only attempted after repeated failures, at most once a
 *    minute, and never while the screen is off
 *  - link quality (latency EMA, jitter, loss) is derived from the same pings,
 *    so there is no second heartbeat timer
 */

import {
  checkHealth,
  loadBridge,
  peekBridge,
  saveBridge,
  serverMetrics,
  statusFull,
  subscribeBridge,
} from "./butler-bridge";
import { rememberGoodHost, scanLan } from "./discovery";
import { log } from "./logger";

export type EngineState = "idle" | "connecting" | "online" | "offline" | "discovering";
export type Quality = "excellent" | "good" | "fair" | "poor" | "down";

export type LinkSnapshot = {
  state: EngineState;
  latencyMs: number;
  jitterMs: number;
  loss: number;
  quality: Quality;
  attempts: number;
  lastOkAt: number;
  message: string;
  /** PC vitals, refreshed on a slower cadence than the heartbeat. */
  cpu: number;
  ram: number;
  model: string;
  serverVersion: string;
  kbTotal: number;
};

const BACKOFF = [2_000, 5_000, 10_000, 20_000, 40_000, 60_000];
const OK_INTERVAL = 15_000;
const SWEEP_AFTER_FAILS = 3;
const SWEEP_COOLDOWN = 60_000;
const SAMPLES = 20;

let snap: LinkSnapshot = {
  state: "idle",
  latencyMs: 0,
  jitterMs: 0,
  loss: 0,
  quality: "down",
  attempts: 0,
  lastOkAt: 0,
  message: "Not paired yet.",
  cpu: 0,
  ram: 0,
  model: "",
  serverVersion: "",
  kbTotal: 0,
};

const listeners = new Set<() => void>();
let timer: number | null = null;
let started = false;
let failStreak = 0;
let lastSweep = 0;
let inFlight = false;
const samples: number[] = [];

export function subscribeLink(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function linkSnapshot(): LinkSnapshot {
  return snap;
}

function set(next: Partial<LinkSnapshot>) {
  const merged = { ...snap, ...next };
  // Bail out when nothing observable changed — subscribers re-render otherwise.
  const same = (Object.keys(merged) as (keyof LinkSnapshot)[]).every((k) => merged[k] === snap[k]);
  if (same) return;
  snap = merged;
  for (const l of listeners) l();
}

/** Latency + jitter + loss folded into one human label. */
function recompute() {
  const hits = samples.filter((s) => s >= 0);
  const loss = samples.length ? Math.round(((samples.length - hits.length) / samples.length) * 100) : 0;
  const avg = hits.length ? hits.reduce((a, b) => a + b, 0) / hits.length : 0;
  const jitter = hits.length > 1 ? Math.round(Math.sqrt(hits.reduce((a, b) => a + (b - avg) ** 2, 0) / hits.length)) : 0;
  let quality: Quality = "down";
  if (hits.length) {
    if (loss > 40) quality = "poor";
    else if (avg < 60 && loss === 0) quality = "excellent";
    else if (avg < 160 && loss < 15) quality = "good";
    else if (avg < 400 && loss < 30) quality = "fair";
    else quality = "poor";
  }
  return { latencyMs: Math.round(avg), jitterMs: jitter, loss, quality };
}

function record(latency: number) {
  samples.push(latency);
  if (samples.length > SAMPLES) samples.shift();
}

function schedule(delay: number) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void tick();
  }, delay);
}

function awake(): boolean {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  return true;
}

/** Saved address is dead — sweep the LAN and adopt the first live host. */
async function rediscover(): Promise<boolean> {
  if (Date.now() - lastSweep < SWEEP_COOLDOWN) return false;
  lastSweep = Date.now();
  set({ state: "discovering", message: "Searching your network for the server…" });
  try {
    const hosts = await scanLan(() => undefined);
    const best = hosts[0];
    if (!best) return false;
    const baseUrl = `http://${best.ip}:${best.port}`;
    await saveBridge({ baseUrl });
    await rememberGoodHost(baseUrl);
    log("info", "bridge", "auto-adopted rediscovered host", { baseUrl });
    return true;
  } catch {
    return false;
  }
}

/** Slow lane: PC vitals every ~60s, never blocking or failing the heartbeat. */
const VITALS_INTERVAL = 60_000;
let lastVitals = 0;

async function refreshVitals(): Promise<void> {
  if (Date.now() - lastVitals < VITALS_INTERVAL) return;
  lastVitals = Date.now();
  const [metrics, status] = await Promise.all([
    serverMetrics().catch(() => null),
    statusFull().catch(() => null),
  ]);
  if (!metrics && !status) return;
  set({
    ...(metrics ? { cpu: Math.round(metrics.cpu), ram: Math.round(metrics.ram) } : {}),
    ...(status ? { model: status.model, serverVersion: status.version, kbTotal: status.kbTotal } : {}),
  });
}

async function tick(): Promise<void> {
  if (inFlight) return;
  if (!awake()) {
    schedule(OK_INTERVAL);
    return;
  }
  const cfg = peekBridge();
  if (!cfg.baseUrl) {
    set({ state: "idle", message: "Not paired yet.", quality: "down" });
    schedule(OK_INTERVAL);
    return;
  }

  inFlight = true;
  const t0 = performance.now();
  if (snap.state !== "online") set({ state: "connecting", message: "Reaching the server…" });

  try {
    const health = await checkHealth();
    const ms = Math.round(performance.now() - t0);
    record(ms);
    failStreak = 0;
    set({
      state: "online",
      lastOkAt: Date.now(),
      attempts: 0,
      message: health.ollama ? "Linked — local model ready." : "Linked — Ollama not detected.",
      ...recompute(),
    });
    void refreshVitals();
    schedule(OK_INTERVAL);
  } catch (err) {
    record(-1);
    failStreak += 1;
    const wait = BACKOFF[Math.min(failStreak - 1, BACKOFF.length - 1)] ?? 60_000;
    set({
      state: "offline",
      attempts: failStreak,
      message: (err as Error).message || "Server unreachable.",
      ...recompute(),
    });
    if (failStreak >= SWEEP_AFTER_FAILS) {
      const found = await rediscover();
      if (found) {
        inFlight = false;
        schedule(300);
        return;
      }
      set({ state: "offline" });
    }
    schedule(wait);
  } finally {
    inFlight = false;
  }
}

/** Kick the engine immediately (foreground, manual retry, fresh pairing). */
export function pokeLink(): void {
  failStreak = 0;
  schedule(0);
}

/** Start once, from the root. Safe to call again — it no-ops. */
export function startAutoConnect(): () => void {
  if (started || typeof window === "undefined") return () => undefined;
  started = true;

  void loadBridge().then(() => schedule(400));

  const onVisible = () => {
    if (document.visibilityState === "visible") pokeLink();
  };
  const onOnline = () => pokeLink();
  const onOffline = () =>
    set({ state: "offline", message: "This device lost its network.", quality: "down" });

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  const unsubBridge = subscribeBridge(() => {
    // Pairing changed under us — re-probe right away instead of waiting out a backoff.
    if (!peekBridge().baseUrl) set({ state: "idle", message: "Not paired yet.", quality: "down" });
  });

  return () => {
    started = false;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    unsubBridge();
  };
}

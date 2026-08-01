/**
 * Butler flight recorder.
 *
 * A single in-app logger every layer writes to, so a bug is never invisible:
 * console output, uncaught errors, promise rejections, bridge requests and
 * timings, script runs, permission prompts and performance events all land in
 * one ring buffer that the LOGS page renders live and can export as a bundle.
 *
 * Design rules:
 *  - never throws, never awaits: logging must not be able to break a feature
 *  - bounded memory (ring buffer) so a chatty session can't grow forever
 *  - values are shallow-sanitised; tokens and long blobs are redacted
 *  - stays on the device — nothing is uploaded anywhere
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogChannel = "app" | "bridge" | "ai" | "script" | "perf" | "ui" | "console" | "crash";

export type LogEntry = {
  id: number;
  t: number;
  level: LogLevel;
  channel: LogChannel;
  msg: string;
  data?: unknown;
  ms?: number;
};

const MAX = 500;
const buffer: LogEntry[] = [];
const listeners = new Set<() => void>();
let seq = 0;
let installed = false;
let snapshot: readonly LogEntry[] = [];

const REDACT = /(token|authorization|password|secret|apikey|api_key|bearer)/i;

/** Shallow-clean a payload: redact credentials, clamp size, never throw. */
function safeData(input: unknown): unknown {
  try {
    if (input == null) return undefined;
    if (typeof input === "string") return input.length > 400 ? `${input.slice(0, 400)}…` : input;
    if (typeof input !== "object") return input;
    if (input instanceof Error) return { name: input.name, message: input.message, stack: input.stack?.slice(0, 800) };
    if (Array.isArray(input)) return input.slice(0, 20).map(safeData);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, 24)) {
      out[k] = REDACT.test(k) ? "«redacted»" : typeof v === "object" && v !== null ? "[object]" : safeData(v);
    }
    return out;
  } catch {
    return "[unserialisable]";
  }
}

function emit() {
  snapshot = buffer.slice();
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a broken subscriber must not stop logging */
    }
  }
}

export function log(level: LogLevel, channel: LogChannel, msg: string, data?: unknown, ms?: number): LogEntry {
  const entry: LogEntry = { id: ++seq, t: Date.now(), level, channel, msg };
  const clean = safeData(data);
  if (clean !== undefined) entry.data = clean;
  if (typeof ms === "number") entry.ms = Math.round(ms);
  buffer.push(entry);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  emit();
  return entry;
}

export const logger = {
  debug: (channel: LogChannel, msg: string, data?: unknown) => log("debug", channel, msg, data),
  info: (channel: LogChannel, msg: string, data?: unknown) => log("info", channel, msg, data),
  warn: (channel: LogChannel, msg: string, data?: unknown) => log("warn", channel, msg, data),
  error: (channel: LogChannel, msg: string, data?: unknown) => log("error", channel, msg, data),
  /** Times an async operation and records success or failure automatically. */
  async time<T>(channel: LogChannel, msg: string, fn: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      const out = await fn();
      log("info", channel, msg, undefined, performance.now() - started);
      return out;
    } catch (err) {
      log("error", channel, `${msg} failed`, err, performance.now() - started);
      throw err;
    }
  },
};

export function subscribeLogs(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLogs(): readonly LogEntry[] {
  return snapshot;
}

export function clearLogs() {
  buffer.length = 0;
  seq = 0;
  emit();
  log("info", "app", "log buffer cleared");
}

export function logCounts() {
  const c = { debug: 0, info: 0, warn: 0, error: 0 };
  for (const e of buffer) c[e.level] += 1;
  return c;
}

/** Machine-readable bundle for the crash-report page / support. */
export function exportBundle(): string {
  return JSON.stringify(
    {
      app: "Butler AI NEXUS",
      version: "5.0.9",
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      viewport:
        typeof window === "undefined" ? "" : `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
      counts: logCounts(),
      entries: buffer,
    },
    null,
    2,
  );
}

export function downloadBundle() {
  try {
    const blob = new Blob([exportBundle()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `butler-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    log("info", "app", "log bundle exported");
  } catch (err) {
    log("error", "app", "export failed", err);
  }
}

/**
 * Attach to the runtime once. Mirrors console warnings/errors and captures
 * anything that escapes React so a silent failure still shows up on LOGS.
 */
export function installLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  for (const level of ["warn", "error"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      log(level, "console", args.map((a) => (typeof a === "string" ? a : safeStr(a))).join(" "));
      original(...args);
    };
  }

  window.addEventListener("error", (e) => {
    log("error", "crash", e.message || "uncaught error", {
      source: `${e.filename}:${e.lineno}:${e.colno}`,
      stack: e.error instanceof Error ? e.error.stack : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    log("error", "crash", "unhandled promise rejection", e.reason);
  });

  window.addEventListener("online", () => log("info", "app", "network online"));
  window.addEventListener("offline", () => log("warn", "app", "network offline"));

  log("info", "app", "logger armed");
}

function safeStr(v: unknown): string {
  try {
    return typeof v === "object" ? JSON.stringify(safeData(v)) : String(v);
  } catch {
    return "[unprintable]";
  }
}

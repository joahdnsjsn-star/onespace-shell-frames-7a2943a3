/**
 * Butler bridge client — the only place the app talks to your PC.
 *
 * Every call goes to the self-hosted `butler_server.py` on your own LAN,
 * authenticated with the pairing token from the QR code. The server owns the
 * Ollama connection, the script library and the learning loop; this file is a
 * thin, defensive transport:
 *
 *  - credentials live in the encrypted vault, never plain localStorage
 *  - a silent `X-New-Token` rotation from the server is captured and stored
 *  - every request is time-boxed and abortable so a dead bridge can never hang
 *    the UI
 *  - no third-party host is ever contacted; a non-LAN base URL is rejected
 */

import { vaultGet, vaultPeek, vaultReady, vaultSet } from "./vault";

export type BridgeConfig = {
  baseUrl: string;
  token: string;
  deviceId: string;
};

const CFG_KEY = "bridge.config";
const DEFAULTS: BridgeConfig = { baseUrl: "", token: "", deviceId: "" };

export type BridgeStatus = "idle" | "connecting" | "online" | "offline" | "unauthorized";

type Listener = () => void;
const listeners = new Set<Listener>();
let status: BridgeStatus = "idle";
let lastError = "";
let config: BridgeConfig = DEFAULTS;

function emit() {
  for (const l of listeners) l();
}

export function subscribeBridge(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function bridgeSnapshot() {
  return { status, lastError, config };
}

function setStatus(next: BridgeStatus, error = "") {
  if (status === next && lastError === error) return;
  status = next;
  lastError = error;
  emit();
}

/** Load the stored bridge config into memory. Idempotent. */
export async function loadBridge(): Promise<BridgeConfig> {
  await vaultReady();
  config = await vaultGet<BridgeConfig>(CFG_KEY, DEFAULTS);
  if (!config.deviceId) {
    config = { ...config, deviceId: crypto.randomUUID() };
    await vaultSet(CFG_KEY, config);
  }
  emit();
  return config;
}

export function peekBridge(): BridgeConfig {
  return vaultPeek<BridgeConfig>(CFG_KEY, config);
}

/**
 * Private-network guard. The bridge is a local device, so anything that is not
 * a LAN / loopback / .local address is refused before a request is ever made —
 * a pasted public URL cannot silently exfiltrate commands or transcripts.
 */
export function isLocalBridgeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local")) return true;
    if (/^10\./.test(h)) return true;
    if (/^192\.168\./.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
    if (/^169\.254\./.test(h)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function saveBridge(next: Partial<BridgeConfig>): Promise<BridgeConfig> {
  const merged: BridgeConfig = { ...(await loadBridge()), ...next };
  merged.baseUrl = merged.baseUrl.trim().replace(/\/+$/, "");
  merged.token = merged.token.trim();
  config = merged;
  await vaultSet(CFG_KEY, merged);
  emit();
  return merged;
}

export async function forgetBridge(): Promise<void> {
  config = { ...DEFAULTS, deviceId: config.deviceId };
  await vaultSet(CFG_KEY, config);
  setStatus("idle");
}

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly code: "no-config" | "unsafe-url" | "offline" | "unauthorized" | "server" | "timeout",
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

type Json = Record<string, unknown>;

/** One request. Attaches auth, enforces the timeout, rotates the token. */
export async function bridgeRequest<T = Json>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: Json; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const cfg = peekBridge();
  if (!cfg.baseUrl) throw new BridgeError("No bridge paired yet.", "no-config");
  if (!isLocalBridgeUrl(cfg.baseUrl)) throw new BridgeError("Bridge address is not on your local network.", "unsafe-url");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(cfg.baseUrl + path, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
        "X-Device-Id": cfg.deviceId,
        "X-App-Version": "5.0.9",
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    const rotated = res.headers.get("X-New-Token");
    if (rotated && rotated !== cfg.token) void saveBridge({ token: rotated });

    if (res.status === 401 || res.status === 403) {
      setStatus("unauthorized", "Pairing expired — scan the QR again.");
      throw new BridgeError("Pairing expired — scan the QR again.", "unauthorized");
    }
    const text = await res.text();
    const data = (text ? JSON.parse(text) : {}) as T & { error?: string };
    if (!res.ok) {
      const msg = data?.error ?? `Bridge returned ${res.status}`;
      setStatus("online");
      throw new BridgeError(msg, "server");
    }
    setStatus("online");
    return data;
  } catch (err) {
    if (err instanceof BridgeError) throw err;
    const aborted = (err as Error)?.name === "AbortError";
    setStatus("offline", aborted ? "Bridge timed out." : "Bridge unreachable on this network.");
    throw new BridgeError(
      aborted ? "Bridge timed out." : "Bridge unreachable on this network.",
      aborted ? "timeout" : "offline",
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ *
 * Typed endpoint wrappers — field names are read defensively because
 * the server answers a few of these with more than one alias.
 * ------------------------------------------------------------------ */

export type HealthReport = {
  online: boolean;
  version?: string | undefined;
  ollama?: boolean | undefined;
  model?: string | undefined;
  raw?: Json | undefined;
};

export async function checkHealth(): Promise<HealthReport> {
  setStatus("connecting");
  const raw = await bridgeRequest<Json>("/api/health", { timeoutMs: 6000 });
  return {
    online: true,
    version: typeof raw['serverVersion'] === "string" ? raw['serverVersion'] : (raw['version'] as string | undefined),
    ollama: Boolean(raw['ollama'] ?? raw['ollamaOk'] ?? raw['ai']),
    model: (raw['model'] ?? raw['activeModel']) as string | undefined,
    raw,
  };
}

export type ChatReply = {
  text: string;
  degraded: boolean;
  model?: string | undefined;
  ollama: boolean;
};

/** Ask the self-hosted model. History is sent so the butler keeps context. */
export async function askButler(
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  signal?: AbortSignal,
): Promise<ChatReply> {
  const raw = await bridgeRequest<Json>("/api/butler/chat", {
    method: "POST",
    body: { message, history },
    timeoutMs: 120000,
    ...(signal ? { signal } : {}),
  });
  const text =
    (raw['response'] as string) ??
    (raw['reply'] as string) ??
    (raw['message'] as string) ??
    "Butler returned an empty reply.";
  return {
    text,
    degraded: Boolean(raw['degraded']),
    model: raw['model'] as string | undefined,
    ollama: raw['ollama'] !== false,
  };
}

export async function clearButlerMemory(): Promise<void> {
  await bridgeRequest("/api/butler/clear", { method: "POST", body: {}, timeoutMs: 8000 });
}

export type LibraryScript = {
  id: string;
  name: string;
  desc: string;
  category: string;
  tags: string[];
  icon?: string | undefined;
  popularity?: number | undefined;
};

/** The PC's own script library, fuzzy-filtered server-side when `q` is set. */
export async function fetchLibrary(q = "", category = ""): Promise<LibraryScript[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category && category !== "all") params.set("category", category);
  params.set("sort", "popularity");
  const raw = await bridgeRequest<Json>(`/api/scripts/library?${params.toString()}`, { timeoutMs: 15000 });
  const out: LibraryScript[] = [];
  const push = (cat: string, s: Json) => {
    const id = String(s['id'] ?? "");
    if (!id) return;
    out.push({
      id,
      name: String(s['name'] ?? id),
      desc: String(s['desc'] ?? s['description'] ?? ""),
      category: String(s['category'] ?? cat ?? "general"),
      tags: Array.isArray(s['tags']) ? (s['tags'] as string[]) : [],
      icon: s['icon'] as string | undefined,
      popularity: typeof s['popularity'] === "number" ? s['popularity'] : 0,
    });
  };
  const lib = (raw['library'] ?? raw['categories'] ?? raw['scripts'] ?? raw) as unknown;
  if (Array.isArray(lib)) {
    for (const s of lib) push("", s as Json);
  } else if (lib && typeof lib === "object") {
    for (const [cat, val] of Object.entries(lib as Json)) {
      if (Array.isArray(val)) for (const s of val) push(cat, s as Json);
      else if (val && typeof val === "object") {
        const scripts = (val as Json)['scripts'];
        if (Array.isArray(scripts)) for (const s of scripts) push(String((val as Json)['name'] ?? cat), s as Json);
      }
    }
  }
  return out;
}

export type RunResult = {
  ok: boolean;
  output: string;
  exitCode?: number | undefined;
  undoId?: string | undefined;
  generated?: boolean | undefined;
};

/** Run a library script on the PC. The server writes an undo journal entry. */
export async function runScript(id: string, signal?: AbortSignal): Promise<RunResult> {
  const raw = await bridgeRequest<Json>("/api/scripts/run", {
    method: "POST",
    body: { id },
    timeoutMs: 180000,
    ...(signal ? { signal } : {}),
  });
  return {
    ok: raw['status'] === "ok",
    output: String(raw['output'] ?? raw['error'] ?? ""),
    exitCode: raw['exitCode'] as number | undefined,
    undoId: raw['undoId'] as string | undefined,
    generated: Boolean(raw['generated']),
  };
}

/** Roll back the last run using the server's undo journal. */
export async function undoRun(undoId: string): Promise<RunResult> {
  const raw = await bridgeRequest<Json>("/api/undo", {
    method: "POST",
    body: { id: undoId, undoId },
    timeoutMs: 60000,
  });
  return { ok: raw['status'] === "ok", output: String(raw['output'] ?? raw['error'] ?? "") };
}

export type OllamaState = {
  running: boolean;
  models: string[];
  active?: string | undefined;
};

export async function ollamaStatus(): Promise<OllamaState> {
  const raw = await bridgeRequest<Json>("/api/ollama/status", { timeoutMs: 8000 });
  const models = Array.isArray(raw['models'])
    ? (raw['models'] as unknown[]).map((m) => (typeof m === "string" ? m : String((m as Json)['name'] ?? "")))
    : [];
  return {
    running: Boolean(raw['running'] ?? raw['ok'] ?? raw['online']),
    models: models.filter(Boolean),
    active: (raw['active'] ?? raw['activeModel'] ?? raw['model']) as string | undefined,
  };
}

export async function setOllamaModel(model: string): Promise<void> {
  await bridgeRequest("/api/ollama/set_model", { method: "POST", body: { model }, timeoutMs: 15000 });
}

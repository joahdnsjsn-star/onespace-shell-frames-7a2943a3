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
import { log } from "./logger";

export type BridgeConfig = {
  baseUrl: string;
  token: string;
  deviceId: string;
  /**
   * `X-Butler-App-Sig` — the per-PC client secret handed out by the server in
   * the QR payload / pair response. `butler_server.py` derives it from that
   * machine's HMAC secret and rejects (403 INVALID_APP_SIG) any request that
   * does not carry it once the server is locked to a device.
   */
  appSig: string;
  pairedAt: number;
};

const CFG_KEY = "bridge.config";
const DEFAULTS: BridgeConfig = { baseUrl: "", token: "", deviceId: "", appSig: "", pairedAt: 0 };

/** Sent on every request so the PC can tell app builds apart in its audit log. */
export const APP_VERSION = "5.0.9";

export type BridgeStatus = "idle" | "connecting" | "online" | "offline" | "unauthorized";

type Listener = () => void;
const listeners = new Set<Listener>();
let status: BridgeStatus = "idle";
let lastError = "";
let config: BridgeConfig = DEFAULTS;

/**
 * Stable snapshot object. `useSyncExternalStore` compares snapshots by
 * reference, so this MUST be rebuilt only when something actually changed —
 * returning a fresh object literal on every read causes an infinite render
 * loop ("Maximum update depth exceeded").
 */
let snapshot: { status: BridgeStatus; lastError: string; config: BridgeConfig } = {
  status,
  lastError,
  config,
};

function rebuild() {
  snapshot = { status, lastError, config };
}

function emit() {
  rebuild();
  for (const l of listeners) l();
}

export function subscribeBridge(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function bridgeSnapshot() {
  return snapshot;
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

  const started = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(cfg.baseUrl + path, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        // The server accepts the token as Bearer, X-Session-Token or
        // X-Fallback-Token; sending all three makes pairing survive a partial
        // token rotation without a re-scan.
        ...(cfg.token
          ? {
              Authorization: `Bearer ${cfg.token}`,
              "X-Session-Token": cfg.token,
              "X-Fallback-Token": cfg.token,
            }
          : {}),
        ...(cfg.appSig ? { "X-Butler-App-Sig": cfg.appSig } : {}),
        "X-Device-Id": cfg.deviceId,
        "X-App-Version": APP_VERSION,
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    const rotated = res.headers.get("X-New-Token");
    if (rotated && rotated !== cfg.token) {
      log("info", "bridge", "session token rotated by server");
      void saveBridge({ token: rotated });
    }

    if (res.status === 401 || res.status === 403) {
      setStatus("unauthorized", "Pairing expired — scan the QR again.");
      log("warn", "bridge", `${path} rejected credentials`);
      throw new BridgeError("Pairing expired — scan the QR again.", "unauthorized");
    }
    const text = await res.text();
    const data = (text ? JSON.parse(text) : {}) as T & { error?: string };
    if (!res.ok) {
      const msg = data?.error ?? `Bridge returned ${res.status}`;
      setStatus("online");
      log("error", "bridge", `${path} -> ${res.status}`, msg, performance.now() - started);
      throw new BridgeError(msg, "server");
    }
    setStatus("online");
    log("info", "bridge", `${opts.method ?? (opts.body ? "POST" : "GET")} ${path}`, undefined, performance.now() - started);
    return data;
  } catch (err) {
    if (err instanceof BridgeError) throw err;
    const aborted = (err as Error)?.name === "AbortError";
    setStatus("offline", aborted ? "Bridge timed out." : "Bridge unreachable on this network.");
    log("error", "bridge", `${path} unreachable`, { aborted }, performance.now() - started);
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
  log("info", "ai", "butler replied", { chars: text.length, model: raw['model'] });
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
  log(raw['status'] === "ok" ? "info" : "error", "script", `run ${id}`, {
    exitCode: raw['exitCode'],
    undoId: raw['undoId'],
  });
  return {
    ok: raw['status'] === "ok",
    output: String(raw['output'] ?? raw['error'] ?? ""),
    exitCode: raw['exitCode'] as number | undefined,
    undoId: raw['undoId'] as string | undefined,
    generated: Boolean(raw['generated']),
  };
}

/**
 * Roll back a run through the server's undo journal.
 * The endpoint is `/api/undo/rollback` and it answers `{ ok, message }` —
 * an older `/api/undo` path does not exist on butler_server.py.
 */
export async function undoRun(undoId: string): Promise<RunResult> {
  const raw = await bridgeRequest<Json>("/api/undo/rollback", {
    method: "POST",
    body: { id: undoId, entryId: undoId },
    timeoutMs: 60000,
  });
  const ok = raw['ok'] === true || raw['status'] === "ok";
  log(ok ? "info" : "warn", "script", `undo ${undoId}`, { ok });
  return { ok, output: String(raw['message'] ?? raw['output'] ?? raw['error'] ?? "") };
}

export type UndoEntry = {
  id: string;
  at: number;
  request: string;
  language: string;
  status: string;
  undone: boolean;
};

/** The rollback journal — what can still be reverted, newest first. */
export async function undoList(): Promise<{ entries: UndoEntry[]; windowSec: number }> {
  const raw = await bridgeRequest<Json>("/api/undo/list", { timeoutMs: 12000 });
  const rows = Array.isArray(raw['entries']) ? (raw['entries'] as Json[]) : [];
  return {
    entries: rows.map((r) => ({
      id: String(r['id'] ?? ""),
      at: toMs(r['ts'] ?? r['at']),
      request: String(r['user_req'] ?? r['userRequest'] ?? r['request'] ?? ""),
      language: String(r['language'] ?? "python"),
      status: String(r['status'] ?? ""),
      undone: Boolean(r['undone']),
    })),
    windowSec: Number(raw['undoWindow'] ?? 0) || 0,
  };
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

/* ------------------------------------------------------------------ *
 * KNOWLEDGE BASE / CRAWLER
 *
 * The PC owns the crawler, the SQLite knowledge_base table and the ΣNET
 * growth log. These wrappers mirror the server's endpoints one-for-one and
 * normalise every field name the server may use, so a version drift on the
 * PC side degrades into missing numbers instead of a crashed screen.
 * ------------------------------------------------------------------ */

export type KbArticle = {
  url: string;
  title: string;
  category: string;
  words: number;
  at: number;
};

export type KbPoint = { ts: number; total: number; added: number };
export type KbCategory = { name: string; count: number };

export type KbFeed = {
  articles: KbArticle[];
  total: number;
  queue: number;
  learning: boolean;
  session: number;
  milestone: number;
  workers: number;
};

export type KbGrowth = {
  points: KbPoint[];
  total: number;
  milestone: number;
  velocity: number;
  etaHours: number | null;
  categories: KbCategory[];
  queue: number;
  workers: number;
  learning: boolean;
  session: number;
};

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : v == null ? d : String(v));

/** Server timestamps are unix seconds; the UI works in milliseconds. */
const toMs = (v: unknown) => {
  const n = num(v, 0);
  if (!n) return 0;
  return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
};

function toArticle(raw: Json): KbArticle {
  return {
    url: str(raw['url']),
    title: str(raw['title'], "untitled"),
    category: str(raw['category'] ?? raw['domain'], "General"),
    words: num(raw['word_count'] ?? raw['wordCount'] ?? raw['words']),
    at: toMs(raw['crawled_at'] ?? raw['crawledAt'] ?? raw['ts']),
  };
}

/** Newly crawled articles since `sinceMs` (server wants unix seconds). */
export async function kbFeed(sinceMs = 0): Promise<KbFeed> {
  const since = sinceMs > 0 ? Math.floor(sinceMs / 1000) : 0;
  const raw = await bridgeRequest<Json>(`/api/kb/feed?since=${since}`, { timeoutMs: 12000 });
  const list = Array.isArray(raw['articles']) ? (raw['articles'] as Json[]) : [];
  return {
    articles: list.map(toArticle).filter((a) => a.url || a.title),
    total: num(raw['total']),
    queue: num(raw['queue']),
    learning: raw['learning'] !== false,
    session: num(raw['session']),
    milestone: num(raw['milestone']),
    workers: num(raw['workers']),
  };
}

/** Time-series growth for the graph. `hours` is clamped server-side to 1..168. */
export async function kbGrowth(hours = 24): Promise<KbGrowth> {
  const raw = await bridgeRequest<Json>(`/api/kb/growth?hours=${Math.max(1, Math.min(168, Math.round(hours)))}`, {
    timeoutMs: 15000,
  });
  const pts = Array.isArray(raw['points']) ? (raw['points'] as Json[]) : [];
  const cats = Array.isArray(raw['categories']) ? (raw['categories'] as Json[]) : [];
  const eta = raw['etaHours'];
  return {
    points: pts
      .map((p) => ({ ts: toMs(p['ts']), total: num(p['total']), added: num(p['added']) }))
      .filter((p) => p.ts > 0)
      .sort((a, b) => a.ts - b.ts),
    total: num(raw['total']),
    milestone: num(raw['milestone']),
    velocity: num(raw['velocity']),
    etaHours: typeof eta === "number" ? eta : null,
    categories: cats.map((c) => ({ name: str(c['name'], "other"), count: num(c['count']) })).filter((c) => c.count > 0),
    queue: num(raw['queue']),
    workers: num(raw['workers']),
    learning: raw['learning'] !== false,
    session: num(raw['session']),
  };
}

export type KbHit = {
  title: string;
  url: string;
  category: string;
  snippet: string;
  score?: number | undefined;
};

/** Full-text recall over everything the PC has learned. */
export async function kbSearch(q: string, limit = 12): Promise<KbHit[]> {
  const raw = await bridgeRequest<Json>("/api/kb/search", {
    method: "POST",
    body: { q, query: q, limit },
    timeoutMs: 20000,
  });
  const rows = Array.isArray(raw['results']) ? (raw['results'] as Json[]) : [];
  return rows.map((r) => ({
    title: str(r['title'], "untitled"),
    url: str(r['url']),
    category: str(r['category'], "General"),
    snippet: str(r['snippet'] ?? r['clean_text'] ?? r['text'] ?? r['excerpt']).slice(0, 400),
    score: typeof r['score'] === "number" ? r['score'] : undefined,
  }));
}

/** Crawl one page right now and store it. */
export async function kbCrawl(url: string, domain = "Custom"): Promise<{ ok: boolean; title: string; words: number; error?: string }> {
  const raw = await bridgeRequest<Json>("/api/crawl", {
    method: "POST",
    body: { url, domain, topic: domain },
    timeoutMs: 60000,
  });
  const ok = raw['status'] === "ok" || raw['saved'] === true;
  return {
    ok,
    title: str(raw['title'], url),
    words: num(raw['wordCount']),
    ...(ok ? {} : { error: str(raw['error'], "crawl failed") }),
  };
}

/** Queue a URL for the background crawler instead of blocking on it. */
export async function kbQueueUrl(url: string, topic = "General"): Promise<{ queued: boolean; queueSize: number }> {
  const raw = await bridgeRequest<Json>("/api/kb/feed", {
    method: "POST",
    body: { url, topic, source: "app" },
    timeoutMs: 15000,
  });
  return { queued: raw['queued'] !== false, queueSize: num(raw['queueSize']) };
}

/** Ask the PC to go find more material about a topic. */
export async function kbExpand(topic: string): Promise<{ queued: number; queueSize: number }> {
  const raw = await bridgeRequest<Json>("/api/kb/expand", {
    method: "POST",
    body: { topic, query: topic },
    timeoutMs: 20000,
  });
  return { queued: num(raw['queued']), queueSize: num(raw['queueSize']) };
}

/** Save a note straight into the knowledge base. */
export async function kbSaveNote(title: string, content: string, domain = "App"): Promise<{ total: number }> {
  const raw = await bridgeRequest<Json>("/api/kb/log", {
    method: "POST",
    body: { entry: { title, content, domain } },
    timeoutMs: 20000,
  });
  return { total: num(raw['entryCount']) };
}

/** Pause the crawler so the whole CPU goes to chat, or resume it. */
export async function kbSetCrawler(on: boolean): Promise<boolean> {
  const raw = await bridgeRequest<Json>(on ? "/api/crawler/resume" : "/api/crawler/pause", {
    method: "POST",
    body: {},
    timeoutMs: 10000,
  });
  return raw['crawling'] !== false && on;
}

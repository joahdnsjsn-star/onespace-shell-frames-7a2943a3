/**
 * 🌐 NETWORK MONITOR — Deep Connection Logging
 * Ported from the native app's services/networkMonitor.ts.
 *
 *  • Circular log buffer (last 200 events) — never grows unbounded
 *  • Structured entries: timestamp, type, ip, port, ms, error
 *  • Port / IP history: which endpoints actually worked
 *  • Daily + lifetime stats, streaks, longest outage
 *  • Encrypted vault persistence (survives restarts, never uploaded)
 *  • Debounced writes — zero impact on the UI thread
 */

import { vaultPeek, vaultSet } from "./vault";

const LOG_KEY = "netmon:log:v1";
const STATS_KEY = "netmon:stats:v1";
const MAX_LOG_SIZE = 200;

export type NetEventType =
  | "CONNECT_OK"
  | "CONNECT_FAIL"
  | "PING_OK"
  | "PING_FAIL"
  | "SCAN_START"
  | "SCAN_FOUND"
  | "SCAN_EMPTY"
  | "RECONNECT_OK"
  | "RECONNECT_FAIL"
  | "DISCONNECT"
  | "PAIR_OK"
  | "PAIR_FAIL"
  | "TOKEN_OK"
  | "TOKEN_FAIL"
  | "PORT_DISCOVERED"
  | "IP_CHANGED"
  | "FIREWALL_BLOCK"
  | "TIMEOUT"
  | "ENGINE_START"
  | "ENGINE_STOP"
  | "APP_RESUME"
  | "APP_BACKGROUND";

export interface NetLogEntry {
  id: number;
  ts: number;
  type: NetEventType;
  ip?: string;
  port?: string;
  ms?: number;
  error?: string;
  extra?: string;
  success: boolean;
}

export interface NetStats {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  avgLatencyMs: number;
  longestDowntimeMs: number;
  lastSuccessTs: number;
  lastFailureTs: number;
  portHistory: Record<string, { ok: number; fail: number }>;
  ipHistory: Record<string, { ok: number; fail: number; lastSeen: number }>;
  dailyAttempts: number;
  dailySuccesses: number;
  sessionStart: number;
  failStreak: number;
  successStreak: number;
}

const DEFAULT_STATS: NetStats = {
  totalAttempts: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  avgLatencyMs: 0,
  longestDowntimeMs: 0,
  lastSuccessTs: 0,
  lastFailureTs: 0,
  portHistory: {},
  ipHistory: {},
  dailyAttempts: 0,
  dailySuccesses: 0,
  sessionStart: 0,
  failStreak: 0,
  successStreak: 0,
};

class NetworkMonitorService {
  private _log: NetLogEntry[] = [];
  private _stats: NetStats = { ...DEFAULT_STATS, portHistory: {}, ipHistory: {} };
  private _nextId = 0;
  private _loaded = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastDisconnectTs = 0;
  private _listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private _emit(): void {
    this._listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* a bad listener never breaks logging */
      }
    });
  }

  /** Hydrate from the encrypted vault. Safe to call repeatedly. */
  load(): void {
    if (this._loaded || typeof window === "undefined") return;
    this._loaded = true;
    try {
      const savedLog = vaultPeek<NetLogEntry[]>(LOG_KEY, []);
      if (Array.isArray(savedLog) && savedLog.length) {
        this._log = savedLog.slice(-MAX_LOG_SIZE);
        this._nextId = (this._log[this._log.length - 1]?.id ?? 0) + 1;
      }
      const savedStats = vaultPeek<Partial<NetStats> | null>(STATS_KEY, null);
      if (savedStats) {
        this._stats = { ...DEFAULT_STATS, portHistory: {}, ipHistory: {}, ...savedStats };
      }
    } catch {
      /* corrupt vault entry — start clean rather than crash */
    }
    // New day resets the daily counters.
    const sameDay =
      this._stats.sessionStart > 0 &&
      new Date(this._stats.sessionStart).toDateString() === new Date().toDateString();
    if (!sameDay) {
      this._stats.dailyAttempts = 0;
      this._stats.dailySuccesses = 0;
      this._stats.sessionStart = Date.now();
    }
  }

  private _scheduleSave(): void {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      void vaultSet(LOG_KEY, this._log.slice(-MAX_LOG_SIZE)).catch(() => {});
      void vaultSet(STATS_KEY, this._stats).catch(() => {});
    }, 1500);
  }

  log(
    type: NetEventType,
    success: boolean,
    opts: { ip?: string; port?: string; ms?: number; error?: string; extra?: string } = {},
  ): void {
    if (typeof window === "undefined") return;
    this.load();

    const entry: NetLogEntry = { id: this._nextId++, ts: Date.now(), type, success, ...opts };
    this._log.push(entry);
    if (this._log.length > MAX_LOG_SIZE) this._log = this._log.slice(-MAX_LOG_SIZE);

    this._updateStats(entry);
    this._scheduleSave();
    this._emit();
  }

  private _updateStats(e: NetLogEntry): void {
    const s = this._stats;
    const isNetworkEvent = [
      "CONNECT_OK",
      "CONNECT_FAIL",
      "PING_OK",
      "PING_FAIL",
      "RECONNECT_OK",
      "RECONNECT_FAIL",
    ].includes(e.type);

    if (isNetworkEvent) {
      s.totalAttempts++;
      s.dailyAttempts++;
    }

    if (e.success) {
      if (isNetworkEvent) {
        s.totalSuccesses++;
        s.dailySuccesses++;
      }
      s.lastSuccessTs = e.ts;
      s.failStreak = 0;
      s.successStreak++;

      if (this._lastDisconnectTs > 0) {
        const downMs = e.ts - this._lastDisconnectTs;
        if (downMs > s.longestDowntimeMs) s.longestDowntimeMs = downMs;
        this._lastDisconnectTs = 0;
      }

      if (e.ms) {
        const count = Math.max(1, s.totalSuccesses);
        s.avgLatencyMs =
          count <= 1 ? e.ms : Math.round((s.avgLatencyMs * (count - 1) + e.ms) / count);
      }
      if (e.port) {
        const p = (s.portHistory[e.port] ??= { ok: 0, fail: 0 });
        p.ok++;
      }
      if (e.ip) {
        const h = (s.ipHistory[e.ip] ??= { ok: 0, fail: 0, lastSeen: 0 });
        h.ok++;
        h.lastSeen = e.ts;
      }
    } else {
      if (isNetworkEvent) s.totalFailures++;
      s.lastFailureTs = e.ts;
      s.failStreak++;
      s.successStreak = 0;
      if (
        ["CONNECT_FAIL", "PING_FAIL", "RECONNECT_FAIL", "DISCONNECT", "TIMEOUT", "FIREWALL_BLOCK"].includes(
          e.type,
        )
      ) {
        if (!this._lastDisconnectTs) this._lastDisconnectTs = e.ts;
      }
      if (e.port) {
        const p = (s.portHistory[e.port] ??= { ok: 0, fail: 0 });
        p.fail++;
      }
      if (e.ip) {
        const h = (s.ipHistory[e.ip] ??= { ok: 0, fail: 0, lastSeen: 0 });
        h.fail++;
        h.lastSeen = e.ts;
      }
    }
  }

  // ── Convenience helpers ──────────────────────────────────────
  connectOk(ip: string, port: string, ms: number) { this.log("CONNECT_OK", true, { ip, port, ms }); }
  connectFail(ip: string, port: string, error: string) { this.log("CONNECT_FAIL", false, { ip, port, error }); }
  pingOk(ip: string, port: string, ms: number) { this.log("PING_OK", true, { ip, port, ms }); }
  pingFail(ip: string, port: string, error?: string) { this.log("PING_FAIL", false, { ip, port, error }); }
  scanStart() { this.log("SCAN_START", true, {}); }
  scanFound(ip: string, port: string, ms: number) { this.log("SCAN_FOUND", true, { ip, port, ms }); }
  scanEmpty() { this.log("SCAN_EMPTY", false, {}); }
  reconnectOk(ip: string, port: string, ms: number) { this.log("RECONNECT_OK", true, { ip, port, ms }); }
  reconnectFail(ip: string, port: string, error: string) { this.log("RECONNECT_FAIL", false, { ip, port, error }); }
  disconnect(ip: string, port: string) { this.log("DISCONNECT", false, { ip, port }); this._lastDisconnectTs = Date.now(); }
  pairOk(ip: string, port: string) { this.log("PAIR_OK", true, { ip, port }); }
  pairFail(ip: string, port: string, error: string) { this.log("PAIR_FAIL", false, { ip, port, error }); }
  portDiscovered(ip: string, port: string, ms: number) { this.log("PORT_DISCOVERED", true, { ip, port, ms }); }
  timeout(ip: string, port: string) { this.log("TIMEOUT", false, { ip, port, error: "Timeout" }); }
  firewallBlock(ip: string, port: string) { this.log("FIREWALL_BLOCK", false, { ip, port, error: "Firewall likely blocking port" }); }
  engineStart() { this.log("ENGINE_START", true, {}); }
  engineStop() { this.log("ENGINE_STOP", true, {}); }
  appResume() { this.log("APP_RESUME", true, {}); }
  appBackground() { this.log("APP_BACKGROUND", true, {}); }

  // ── Read API ─────────────────────────────────────────────────
  getLog(limit = 50): NetLogEntry[] {
    this.load();
    return this._log.slice(-limit).reverse();
  }

  getStats(): NetStats {
    this.load();
    return { ...this._stats };
  }

  getRecentFailures(limit = 10): NetLogEntry[] {
    this.load();
    return this._log.filter((e) => !e.success).slice(-limit).reverse();
  }

  getConnectionTimeline(limit = 30): NetLogEntry[] {
    this.load();
    const TIMELINE_TYPES: NetEventType[] = [
      "CONNECT_OK",
      "CONNECT_FAIL",
      "RECONNECT_OK",
      "RECONNECT_FAIL",
      "DISCONNECT",
      "SCAN_FOUND",
      "SCAN_EMPTY",
      "PAIR_OK",
      "PAIR_FAIL",
      "ENGINE_START",
      "APP_RESUME",
    ];
    return this._log.filter((e) => TIMELINE_TYPES.includes(e.type)).slice(-limit).reverse();
  }

  /** Health score + plain-language issues and fixes. */
  getDiagnosticReport(): {
    healthScore: number;
    issues: string[];
    recommendations: string[];
    bestPort: string | null;
    bestIP: string | null;
    failRate: number;
    avgLatencyMs: number;
    totalDowntimeMs: number;
    recentFailStreak: number;
  } {
    const s = this.getStats();
    const issues: string[] = [];
    const recs: string[] = [];
    const failRate = s.totalAttempts > 0 ? s.totalFailures / s.totalAttempts : 0;

    let score = 100;
    score -= Math.round(failRate * 60);
    score -= Math.min(30, s.failStreak * 5);
    if (s.avgLatencyMs > 500) score -= 10;
    if (s.avgLatencyMs > 200) score -= 5;
    score = Math.max(0, Math.min(100, score));

    if (failRate > 0.5) issues.push(`High failure rate: ${Math.round(failRate * 100)}% of connections fail`);
    if (s.failStreak >= 3) issues.push(`${s.failStreak} consecutive failures — the server may be offline`);
    if (s.avgLatencyMs > 300) issues.push(`High latency: ${s.avgLatencyMs}ms average — check Wi-Fi signal`);
    if (s.longestDowntimeMs > 60_000)
      issues.push(`Longest outage: ${Math.round(s.longestDowntimeMs / 60000)}min — connection is unstable`);

    const failPorts = Object.entries(s.portHistory)
      .filter(([, v]) => v.fail > 0 && v.ok === 0)
      .map(([p]) => p);
    if (failPorts.length > 0)
      issues.push(`Ports that never worked: ${failPorts.slice(0, 3).join(", ")} — likely wrong port range`);

    if (issues.length === 0) {
      recs.push("Connection is stable — no action needed");
    } else {
      if (failRate > 0.5) {
        recs.push("Ensure the phone and PC are on the same Wi-Fi network");
        recs.push("Check Windows Firewall — allow TCP on the server port");
      }
      if (s.failStreak >= 3) {
        recs.push("Restart butler_server.py on your PC");
        recs.push("Use LAN Auto-Discover to find the server again");
      }
      if (s.avgLatencyMs > 300) {
        recs.push("Move the phone closer to the Wi-Fi router");
        recs.push("Use 2.4GHz for range, 5GHz for speed");
      }
    }

    const bestPort =
      Object.entries(s.portHistory)
        .sort(([, a], [, b]) => b.ok - a.ok)
        .find(([, v]) => v.ok > 0)?.[0] ?? null;
    const bestIP =
      Object.entries(s.ipHistory)
        .filter(([, v]) => v.ok > 0)
        .sort(([, a], [, b]) => b.lastSeen - a.lastSeen)[0]?.[0] ?? null;

    return {
      healthScore: score,
      issues,
      recommendations: recs,
      bestPort,
      bestIP,
      failRate,
      avgLatencyMs: s.avgLatencyMs,
      totalDowntimeMs: s.longestDowntimeMs,
      recentFailStreak: s.failStreak,
    };
  }

  formatEntry(e: NetLogEntry): string {
    const time = new Date(e.ts).toLocaleTimeString("en-GB", { hour12: false });
    const icon = e.success ? "✓" : "✗";
    const ip = e.ip && e.port ? `${e.ip}:${e.port}` : e.ip || "";
    const ms = e.ms ? ` ${e.ms}ms` : "";
    const err = e.error ? ` — ${e.error.slice(0, 60)}` : "";
    return `${time} ${icon} ${e.type}${ip ? " " + ip : ""}${ms}${err}`;
  }

  clear(): void {
    this._log = [];
    this._stats = { ...DEFAULT_STATS, portHistory: {}, ipHistory: {}, sessionStart: Date.now() };
    this._nextId = 0;
    void vaultSet(LOG_KEY, []).catch(() => {});
    void vaultSet(STATS_KEY, this._stats).catch(() => {});
    this._emit();
  }
}

export const networkMonitor = new NetworkMonitorService();

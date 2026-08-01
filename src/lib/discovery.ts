/**
 * Adaptive bridge discovery — ported from the native `qrParser` + `lanScanner`
 * services so the phone shell finds `butler_server.py` with zero typing.
 *
 * Two halves:
 *  1. `parseConnection()` — 8 tolerant strategies for any string the server can
 *     print: JSON QR payload, `butlerai://` deep link, plain `ip:port:token`,
 *     ANSI-coloured terminal output, or a bare address.
 *  2. `scanLan()` — a bounded, cancellable probe sweep. Last-known-good address
 *     first, then its neighbours, then the common private subnets. Nothing
 *     leaves the local network: every candidate is re-checked against the same
 *     private-range guard the transport uses.
 */

import { isLocalBridgeUrl, peekBridge } from "./butler-bridge";
import { log } from "./logger";
import { vaultGet, vaultSet } from "./vault";

/* ------------------------------------------------------------------ *
 * 1. Connection-string parser
 * ------------------------------------------------------------------ */

export type ParsedConn = { ip: string; port: string; token: string; appSig?: string };

/** Never throws. Returns null when nothing usable was found. */
export function parseConnection(raw: string): ParsedConn | null {
  if (!raw) return null;
  // Strip ANSI colour codes so a copy-pasted terminal line still works.
  const s = raw
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/←\[[0-9;]*m/g, "");

  // JSON payload anywhere in the string (the QR code's native format).
  const jsonStart = s.indexOf("{");
  if (jsonStart !== -1) {
    try {
      const o = JSON.parse(s.slice(jsonStart)) as Record<string, unknown>;
      const ip = String(o["ip"] ?? o["address"] ?? o["host"] ?? "").trim();
      if (ip) {
        // `appSig` is the per-PC client secret; without it the server answers
        // 403 INVALID_APP_SIG once it is locked to a device.
        const sig = String(o["appSig"] ?? o["app_sig"] ?? o["sig"] ?? "").trim();
        return {
          ip,
          port: String(o["port"] ?? "").trim(),
          token: String(o["pairingCode"] ?? o["code"] ?? o["token"] ?? o["pin"] ?? "").trim(),
          ...(sig ? { appSig: sig } : {}),
        };
      }
    } catch {
      /* fall through to the text strategies */
    }
  }

  // Query-string deep link: butlerai://connect?ip=…&port=…&code=…
  const q = s.match(/[?&]ip=([\d.]+)[^]*?[?&]port=(\d+)/i);
  if (q?.[1] && q[2]) {
    const c = s.match(/[?&](?:code|pairingCode|token|pin)=([\w-]+)/i);
    return { ip: q[1], port: q[2], token: c?.[1] ?? "" };
  }

  // Scheme URL: http://IP:PORT (optionally trailed by a token).
  const scheme = s.match(/[a-z]+:\/\/([\d.]+):(\d+)(?:[/\s:]+([\w-]{6,}))?/i);
  if (scheme?.[1] && scheme[2]) return { ip: scheme[1], port: scheme[2], token: scheme[3] ?? "" };

  // Terminal banner: "ADDRESS: 192.168.1.5:8770"
  const banner = s.match(/(?:ADDRESS|IP|SERVER|HOST)[:\s]+(?:https?:\/\/)?([\d.]+):(\d+)/i);
  if (banner?.[1] && banner[2]) return { ip: banner[1], port: banner[2], token: "" };

  // Plain IP:PORT[:TOKEN]
  const plain = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})(?::([\w-]+))?/);
  if (plain?.[1] && plain[2]) return { ip: plain[1], port: plain[2], token: plain[3] ?? "" };

  // Bare IP plus the first number that follows it.
  const bare = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (bare?.[1]) {
    const after = s.slice(s.indexOf(bare[1]) + bare[1].length).match(/(\d{2,5})/);
    return { ip: bare[1], port: after?.[1] ?? "", token: "" };
  }

  return null;
}

/** Turn a parsed pair into the canonical bridge base URL. */
export function toBaseUrl(c: ParsedConn): string {
  return c.port ? `http://${c.ip}:${c.port}` : `http://${c.ip}`;
}

/* ------------------------------------------------------------------ *
 * 2. LAN sweep
 * ------------------------------------------------------------------ */

export type FoundHost = {
  ip: string;
  port: number;
  latencyMs: number;
  version?: string | undefined;
  ollama?: boolean | undefined;
};
export type ScanProgress = {
  phase: "known" | "subnet" | "done";
  scanned: number;
  total: number;
  found: FoundHost[];
};

/** Ordered by real-world probability — the port is discovered, never assumed. */
const PORTS = [8770, 8765, 8766, 8767, 8000, 8080, 5000, 3000, 8888, 9000];
const SUBNETS = [
  "192.168.1",
  "192.168.0",
  "192.168.2",
  "192.168.100",
  "192.168.178",
  "10.0.0",
  "10.0.1",
  "172.20.10",
];
const HOSTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 101, 102, 103, 104, 105, 110, 120, 150, 200, 254,
];
const PROBE_PATHS = ["/api/health", "/api/status", "/health", "/status"];
const HOST_TIMEOUT_MS = 700;
const BATCH = 16;
const LAST_KEY = "bridge.lastGood";

type LastGood = { ip: string; port: number };

/** One host+port probe. Any answer under 500 means something is listening. */
async function probe(ip: string, port: number): Promise<FoundHost | null> {
  const base = `http://${ip}:${port}`;
  if (!isLocalBridgeUrl(base)) return null;
  const t0 = performance.now();
  for (const path of PROBE_PATHS) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), HOST_TIMEOUT_MS);
    try {
      const res = await fetch(base + path, { signal: ctrl.signal, cache: "no-store" });
      if (res.status < 500) {
        let body: Record<string, unknown> = {};
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          /* a non-JSON answer still proves a listener */
        }
        return {
          ip,
          port,
          latencyMs: Math.round(performance.now() - t0),
          version: (body["serverVersion"] ?? body["version"]) as string | undefined,
          ollama: Boolean(body["ollama"] ?? body["ollamaOk"]),
        };
      }
    } catch (err) {
      // A timeout means nothing is on this port at all — stop trying paths.
      if ((err as Error).name === "AbortError") break;
    } finally {
      window.clearTimeout(timer);
    }
  }
  return null;
}

async function runBatches(
  pairs: { ip: string; port: number }[],
  found: FoundHost[],
  onProgress: (p: ScanProgress) => void,
  phase: ScanProgress["phase"],
  total: number,
  scannedStart: number,
  signal?: AbortSignal,
): Promise<number> {
  let scanned = scannedStart;
  for (let i = 0; i < pairs.length; i += BATCH) {
    if (signal?.aborted) break;
    const slice = pairs.slice(i, i + BATCH);
    const hits = await Promise.all(slice.map((p) => probe(p.ip, p.port)));
    scanned += slice.length;
    for (const h of hits) {
      if (h && !found.some((f) => f.ip === h.ip && f.port === h.port)) found.push(h);
    }
    onProgress({ phase, scanned, total, found: [...found] });
    // Yield to the renderer so the sweep never blocks scrolling or animation.
    await new Promise((r) => window.setTimeout(r, 0));
  }
  return scanned;
}

/**
 * Sweep the local network for a butler server.
 * Phase 1 covers the last address that worked plus its DHCP neighbours, which
 * resolves the overwhelming majority of reconnects in well under two seconds.
 * Phase 2 only runs if phase 1 found nothing.
 */
export async function scanLan(
  onProgress: (p: ScanProgress) => void,
  signal?: AbortSignal,
): Promise<FoundHost[]> {
  const found: FoundHost[] = [];
  const started = performance.now();

  // ── Phase 1: last-known-good + neighbours ────────────────────────
  const last = await vaultGet<LastGood | null>(LAST_KEY, null);
  const current = parseConnection(peekBridge().baseUrl);
  const seedIp = last?.ip ?? current?.ip ?? "";
  const seedPort = last?.port ?? Number(current?.port ?? 0);
  const knownPairs: { ip: string; port: number }[] = [];
  if (seedIp) {
    const parts = seedIp.split(".");
    const octet = Number(parts[3]);
    const subnet = parts.slice(0, 3).join(".");
    const ports = seedPort ? [seedPort, ...PORTS.filter((p) => p !== seedPort)] : PORTS;
    for (const port of ports.slice(0, 4)) {
      knownPairs.push({ ip: seedIp, port });
      if (!Number.isNaN(octet)) {
        for (let d = 1; d <= 4; d++) {
          if (octet - d > 0) knownPairs.push({ ip: `${subnet}.${octet - d}`, port });
          if (octet + d < 255) knownPairs.push({ ip: `${subnet}.${octet + d}`, port });
        }
      }
    }
  }

  const subnetPairs: { ip: string; port: number }[] = [];
  const seedSubnet = seedIp ? seedIp.split(".").slice(0, 3).join(".") : "";
  const subnets = seedSubnet ? [seedSubnet, ...SUBNETS.filter((s) => s !== seedSubnet)] : SUBNETS;
  for (const subnet of subnets.slice(0, 4)) {
    for (const host of HOSTS) {
      for (const port of PORTS.slice(0, 3)) subnetPairs.push({ ip: `${subnet}.${host}`, port });
    }
  }

  const total = knownPairs.length + subnetPairs.length;
  onProgress({ phase: "known", scanned: 0, total, found: [] });

  let scanned = await runBatches(knownPairs, found, onProgress, "known", total, 0, signal);
  if (!found.length && !signal?.aborted) {
    scanned = await runBatches(subnetPairs, found, onProgress, "subnet", total, scanned, signal);
  }

  found.sort((a, b) => a.latencyMs - b.latencyMs);
  const best = found[0];
  if (best) await vaultSet(LAST_KEY, { ip: best.ip, port: best.port });

  log(
    found.length ? "info" : "warn",
    "bridge",
    `lan sweep ${found.length} host(s)`,
    {
      scanned,
      aborted: signal?.aborted ?? false,
    },
    performance.now() - started,
  );

  onProgress({ phase: "done", scanned, total, found: [...found] });
  return found;
}

/** Remember the address that actually linked, so the next sweep is instant. */
export async function rememberGoodHost(baseUrl: string): Promise<void> {
  const c = parseConnection(baseUrl);
  if (!c?.ip || !c.port) return;
  await vaultSet(LAST_KEY, { ip: c.ip, port: Number(c.port) });
}

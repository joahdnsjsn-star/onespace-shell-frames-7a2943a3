/**
 * KB GROWTH TRACKER — local findings timeline (ported from the native app).
 *
 * Records every knowledge delta with the collection method that produced it,
 * so the BRAIN page can chart growth even while the PC bridge is offline.
 * Storage: encrypted vault (bounded ring buffer), never the network.
 */

import { vaultPeek, vaultSet } from "@/lib/vault";

const KEY = "kb.growth.v1";
const MAX_EVENTS = 4000;
const CHUNK_MINS = 15;

export type GrowthMethod =
  "seed" | "crawler" | "source" | "topic" | "note" | "recall" | "manual" | "legacy_seed";

export interface GrowthEvent {
  ts: number;
  count: number;
  method: GrowthMethod | string;
  domain?: string | undefined;
}

export interface ChartBucket {
  ts: number;
  total: number;
  delta: number;
  label: string;
}

interface Persisted {
  events: GrowthEvent[];
  totalFindings: number;
}

let events: GrowthEvent[] = [];
let totalFindings = 0;
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener errors never break tracking */
    }
  });
}

function persistSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void vaultSet(KEY, { events, totalFindings } satisfies Persisted).catch(() => undefined);
  }, 900);
}

/** Restore the timeline. Cheap and idempotent — safe to call from anywhere. */
export function loadGrowth(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const snap = vaultPeek<Persisted>(KEY, { events: [], totalFindings: 0 });
  events = Array.isArray(snap.events) ? snap.events.slice(-MAX_EVENTS) : [];
  totalFindings = snap.totalFindings ?? events.reduce((s, e) => s + e.count, 0);
  emit();
}

export function subscribeGrowth(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Record new findings. Ignores zero/negative deltas. */
export function recordGrowth(count: number, method: GrowthMethod | string, domain?: string): void {
  if (!Number.isFinite(count) || count <= 0) return;
  loadGrowth();
  events.push({ ts: Date.now(), count: Math.round(count), method, domain });
  totalFindings += Math.round(count);
  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
  persistSoon();
  emit();
}

/** Track an absolute total from the server and log only the increase. */
let lastTotal = 0;
export function trackTotal(total: number, method: GrowthMethod | string = "crawler"): void {
  if (!Number.isFinite(total) || total <= 0) return;
  loadGrowth();
  if (lastTotal === 0) {
    lastTotal = total;
    if (totalFindings === 0) {
      events.push({ ts: Date.now() - 86_400_000, count: total, method: "legacy_seed" });
      totalFindings = total;
      persistSoon();
      emit();
    }
    return;
  }
  const delta = total - lastTotal;
  lastTotal = total;
  if (delta > 0) recordGrowth(delta, method);
}

function labelFor(ts: number, hours: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  if (hours <= 6) return `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (hours <= 24) return `${p(d.getHours())}h`;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Bucketed cumulative curve for the last N hours. */
export function growthBuckets(hours = 24, bucketMinutes = CHUNK_MINS): ChartBucket[] {
  loadGrowth();
  const now = Date.now();
  const start = now - hours * 3_600_000;
  const bucketMs = bucketMinutes * 60_000;
  const n = Math.max(1, Math.ceil((hours * 60) / bucketMinutes));
  const buckets: ChartBucket[] = Array.from({ length: n }, (_, i) => ({
    ts: start + i * bucketMs,
    total: 0,
    delta: 0,
    label: labelFor(start + i * bucketMs, hours),
  }));

  let running = 0;
  for (const ev of events) if (ev.ts < start) running += ev.count;
  for (const ev of events) {
    if (ev.ts < start || ev.ts > now) continue;
    const idx = Math.min(n - 1, Math.floor((ev.ts - start) / bucketMs));
    buckets[idx]!.delta += ev.count;
  }
  for (const b of buckets) {
    running += b.delta;
    b.total = running;
  }
  return buckets;
}

/** Chart-ready points for GrowthChart / IntakeBars. */
export function growthPoints(hours = 24): { ts: number; total: number; added: number }[] {
  return growthBuckets(hours).map((b) => ({ ts: b.ts, total: b.total, added: b.delta }));
}

export function growthTotal(): number {
  loadGrowth();
  return totalFindings;
}

export function recentGrowth(n = 20): GrowthEvent[] {
  loadGrowth();
  return events.slice(-n).reverse();
}

export function methodBreakdown(): { name: string; count: number }[] {
  loadGrowth();
  const out = new Map<string, number>();
  for (const ev of events) out.set(ev.method, (out.get(ev.method) || 0) + ev.count);
  return [...out.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Findings added in the last N hours. */
export function growthSince(hours = 24): number {
  loadGrowth();
  const cut = Date.now() - hours * 3_600_000;
  return events.reduce((s, e) => (e.ts >= cut ? s + e.count : s), 0);
}

export function clearGrowth(): void {
  events = [];
  totalFindings = 0;
  lastTotal = 0;
  loaded = true;
  void vaultSet(KEY, { events, totalFindings } satisfies Persisted).catch(() => undefined);
  emit();
}

export function exportGrowth(): string {
  loadGrowth();
  return JSON.stringify({ events, totalFindings, exportedAt: new Date().toISOString() }, null, 2);
}

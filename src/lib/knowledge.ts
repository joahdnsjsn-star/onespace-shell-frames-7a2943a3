/**
 * Knowledge engine — the app-side brain of the crawler.
 *
 * One shared store, one timer. Every screen reads it through `useKnowledge()`;
 * mounting a component never starts a competing poll loop.
 *
 * Design rules (mirrors the native `knowledgeAccumulator` service):
 *  - persistence first: the last good snapshot lives in the encrypted vault, so
 *    the BRAIN page renders real numbers instantly, even offline
 *  - never throws: a dead bridge sets `error` and keeps the cached view
 *  - self-healing: exponential backoff on failure, instant resume when the link
 *    comes back or the app returns to the foreground
 *  - always graphable: if the PC has no ΣNET history yet, locally sampled
 *    totals are used to synthesise the growth curve so the chart is never blank
 */

import {
  BridgeError,
  kbCrawl,
  kbExpand,
  kbFeed,
  kbGrowth,
  kbQueueUrl,
  kbSaveNote,
  kbSearch,
  kbSetCrawler,
  type KbArticle,
  type KbCategory,
  type KbHit,
  type KbPoint,
} from "./butler-bridge";
import { recordGrowth, trackTotal } from "./kb-growth";
import { log } from "./logger";
import { vaultGet, vaultPeek, vaultSet } from "./vault";

const KEY = "butler_kb_snapshot_v1";
const MAX_FEED = 40;
const MAX_POINTS = 240;

const FEED_MS = 12_000; // live feed poll while the page is open
const GROWTH_MS = 60_000; // heavier growth/category query
const IDLE_MS = 90_000; // background poll when no screen is watching
const MAX_BACKOFF = 5 * 60_000;

export type KnowledgeState = {
  hydrated: boolean;
  /** Articles stored on the PC. */
  total: number;
  /** Added since the server process started. */
  session: number;
  /** URLs waiting in the learn queue. */
  queue: number;
  workers: number;
  learning: boolean;
  milestone: number;
  velocity: number; // articles / hour
  etaHours: number | null;
  points: KbPoint[];
  categories: KbCategory[];
  feed: KbArticle[];
  lastSync: number;
  syncing: boolean;
  error: string;
  /** True while the numbers come from the vault rather than a live poll. */
  stale: boolean;
};

const EMPTY: KnowledgeState = {
  hydrated: false,
  total: 0,
  session: 0,
  queue: 0,
  workers: 0,
  learning: true,
  milestone: 100,
  velocity: 0,
  etaHours: null,
  points: [],
  categories: [],
  feed: [],
  lastSync: 0,
  syncing: false,
  error: "",
  stale: true,
};

type Persisted = Pick<
  KnowledgeState,
  "total" | "session" | "queue" | "workers" | "learning" | "milestone" | "velocity" | "points" | "categories" | "feed" | "lastSync"
>;

let state: KnowledgeState = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a broken subscriber must never stall the engine */
    }
  }
}

function set(patch: Partial<KnowledgeState>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribeKnowledge(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function knowledgeSnapshot(): KnowledgeState {
  return state;
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const snap: Persisted = {
      total: state.total,
      session: state.session,
      queue: state.queue,
      workers: state.workers,
      learning: state.learning,
      milestone: state.milestone,
      velocity: state.velocity,
      points: state.points.slice(-MAX_POINTS),
      categories: state.categories.slice(0, 15),
      feed: state.feed.slice(0, MAX_FEED),
      lastSync: state.lastSync,
    };
    void vaultSet(KEY, snap).catch(() => undefined);
  }, 1200);
}

let hydrating: Promise<void> | null = null;

/** Restore the last known knowledge snapshot. Safe to call from anywhere. */
export function hydrateKnowledge(): Promise<void> {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const cached = await vaultGet<Persisted | null>(KEY, vaultPeek<Persisted | null>(KEY, null));
      if (cached && typeof cached === "object") {
        set({
          ...cached,
          points: Array.isArray(cached.points) ? cached.points : [],
          categories: Array.isArray(cached.categories) ? cached.categories : [],
          feed: Array.isArray(cached.feed) ? cached.feed : [],
          hydrated: true,
          stale: true,
        });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  })();
  return hydrating;
}

/* ------------------------------------------------------------------ *
 * Merge helpers
 * ------------------------------------------------------------------ */

function mergeFeed(incoming: KbArticle[]): KbArticle[] {
  if (!incoming.length) return state.feed;
  const seen = new Set<string>();
  const merged: KbArticle[] = [];
  for (const a of [...incoming, ...state.feed]) {
    const id = a.url || `${a.title}:${a.at}`;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(a);
  }
  return merged.sort((x, y) => y.at - x.at).slice(0, MAX_FEED);
}

/**
 * Keep a local sample of the total so the graph works even before the PC has
 * written any ΣNET history. Server points always win when they exist.
 */
function sampleLocalPoint(total: number): KbPoint[] {
  const now = Date.now();
  const last = state.points[state.points.length - 1];
  if (last && now - last.ts < 45_000 && last.total === total) return state.points;
  const added = last ? Math.max(0, total - last.total) : 0;
  return [...state.points, { ts: now, total, added }].slice(-MAX_POINTS);
}

function nextMilestone(total: number): number {
  for (const m of [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]) {
    if (total < m) return m;
  }
  return Math.ceil((total + 1) / 100000) * 100000;
}

/* ------------------------------------------------------------------ *
 * Sync loop
 * ------------------------------------------------------------------ */

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let watchers = 0; // screens currently showing knowledge data
let failures = 0;
let lastGrowth = 0;
let inFlight: Promise<void> | null = null;

function schedule(delay?: number) {
  if (timer) clearTimeout(timer);
  if (typeof window === "undefined") return;
  const base = watchers > 0 ? FEED_MS : IDLE_MS;
  const backoff = failures > 0 ? Math.min(MAX_BACKOFF, base * 2 ** Math.min(failures, 5)) : base;
  timer = setTimeout(() => void syncKnowledge(), delay ?? backoff);
}

function hidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

/** One sync pass: live feed always, growth/categories at most once a minute. */
export function syncKnowledge(force = false): Promise<void> {
  if (inFlight) return inFlight;
  if (typeof window === "undefined") return Promise.resolve();
  if (!force && hidden()) {
    schedule(IDLE_MS);
    return Promise.resolve();
  }

  inFlight = (async () => {
    set({ syncing: true });
    try {
      const feed = await kbFeed(state.lastSync ? state.lastSync - 60_000 : 0);
      const total = feed.total || state.total;
      set({
        total,
        session: feed.session,
        queue: feed.queue,
        workers: feed.workers || state.workers,
        learning: feed.learning,
        milestone: feed.milestone || nextMilestone(total),
        feed: mergeFeed(feed.articles),
        points: sampleLocalPoint(total),
        lastSync: Date.now(),
        error: "",
        stale: false,
      });
      failures = 0;
      trackTotal(total, "crawler");

      const due = force || Date.now() - lastGrowth > GROWTH_MS;
      if (due) {
        lastGrowth = Date.now();
        try {
          const g = await kbGrowth(24);
          set({
            points: g.points.length > 1 ? g.points : state.points,
            categories: g.categories.length ? g.categories : state.categories,
            velocity: g.velocity,
            etaHours: g.etaHours,
            milestone: g.milestone || state.milestone,
            total: g.total || state.total,
          });
        } catch (err) {
          // Growth analytics are optional garnish — never fail the whole sync.
          log("debug", "bridge", "kb growth unavailable", (err as Error)?.message);
        }
      }
      persistSoon();
    } catch (err) {
      failures += 1;
      const be = err as BridgeError;
      const msg =
        be?.code === "no-config"
          ? "Pair your PC to start learning."
          : be?.code === "unauthorized"
            ? "Pairing expired — scan the QR again."
            : be?.message || "Knowledge sync failed.";
      set({ error: msg, stale: true });
      if (failures === 1) log("warn", "bridge", "kb sync failed", msg);
    } finally {
      set({ syncing: false });
      inFlight = null;
      schedule();
    }
  })();

  return inFlight;
}

/** Start the single background engine. Called once from the root layout. */
export function startKnowledge(): () => void {
  if (started || typeof window === "undefined") return () => undefined;
  started = true;
  void hydrateKnowledge().then(() => syncKnowledge());

  const wake = () => {
    if (!hidden()) {
      failures = 0;
      void syncKnowledge(true);
    }
  };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);

  return () => {
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("online", wake);
    if (timer) clearTimeout(timer);
    started = false;
  };
}

/** A screen declares it is watching, so the engine polls at the fast rate. */
export function watchKnowledge(): () => void {
  watchers += 1;
  void hydrateKnowledge().then(() => syncKnowledge(true));
  return () => {
    watchers = Math.max(0, watchers - 1);
    schedule();
  };
}

/* ------------------------------------------------------------------ *
 * Actions — every one refreshes the store on success
 * ------------------------------------------------------------------ */

export async function addSource(url: string, topic = "General", immediate = false) {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) throw new Error("Enter a full http(s) address.");
  const res = immediate ? await kbCrawl(clean, topic) : await kbQueueUrl(clean, topic);
  log("info", "app", immediate ? "kb crawl" : "kb queue", { url: clean, topic });
  recordGrowth(1, "source", new URL(clean).hostname);
  void syncKnowledge(true);
  return res;
}

export async function expandTopic(topic: string) {
  const clean = topic.trim();
  if (!clean) throw new Error("Type a topic first.");
  const res = await kbExpand(clean);
  log("info", "app", "kb expand", { topic: clean, queued: res.queued });
  recordGrowth(res.queued || 1, "topic", clean);
  void syncKnowledge(true);
  return res;
}

export async function saveNote(title: string, content: string) {
  const res = await kbSaveNote(title.trim() || "App note", content.trim());
  recordGrowth(1, "note");
  void syncKnowledge(true);
  return res;
}

export async function setCrawler(on: boolean) {
  set({ learning: on }); // optimistic — the next sync corrects it if the PC disagrees
  try {
    await kbSetCrawler(on);
  } catch (err) {
    set({ learning: !on, error: (err as Error)?.message ?? "Could not reach the crawler." });
    throw err;
  }
  void syncKnowledge(true);
}

export async function recall(q: string, limit = 12): Promise<KbHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  return kbSearch(query, limit);
}

export type { KbArticle, KbCategory, KbHit, KbPoint };

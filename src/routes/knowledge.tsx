import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Brain,
  Database,
  Globe,
  Link2,
  Loader2,
  PlugZap,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import {
  ActionButton,
  Card,
  Chip,
  EmptyState,
  IconBadge,
  Row,
  SectionHeader,
  Segmented,
  StatTile,
  Toggle,
} from "@/components/nexus/ui";
import { CategoryBars, GrowthChart, IntakeBars, ProgressRing } from "@/components/nexus/Charts";
import {
  clearGrowth,
  growthPoints,
  growthSince,
  growthTotal,
  loadGrowth,
  methodBreakdown,
  recentGrowth,
  subscribeGrowth,
} from "@/lib/kb-growth";
import { Coach } from "@/components/nexus/Coach";
import { cn } from "@/lib/utils";
import { fx } from "@/lib/fx";
import {
  addSource,
  expandTopic,
  knowledgeSnapshot,
  recall,
  setCrawler,
  subscribeKnowledge,
  syncKnowledge,
  watchKnowledge,
  type KbHit,
} from "@/lib/knowledge";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "Live crawler graph, category breakdown and full-text recall over everything your self-hosted Butler has learned.",
      },
      { property: "og:title", content: "Knowledge Base — NEXUS" },
      {
        property: "og:description",
        content: "Everything Butler learns stays on your own machine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Knowledge,
});

const TABS = ["pulse", "graph", "recall", "sources"] as const;
type Tab = (typeof TABS)[number];

const COACH = [
  {
    target: "kb-stats",
    title: "your brain, in numbers",
    body: "Articles stored on your PC, queue depth and intake speed. Cached on the handset so it reads instantly.",
  },
  {
    target: "kb-graph",
    title: "crawler graph",
    body: "The curve is total knowledge over 24h; the bars underneath are what landed each sample.",
  },
  {
    target: "kb-crawler",
    title: "throttle the crawler",
    body: "Pause learning to hand the whole CPU to chat. Butler resumes exactly where it stopped.",
  },
  {
    target: "kb-sources",
    title: "feed it anything",
    body: "Drop a URL to queue it, or name a topic and Butler goes hunting on its own.",
  },
];

function ago(t: number) {
  if (!t) return "never";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const compact = (n: number) =>
  n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString();

function Knowledge() {
  const kb = useSyncExternalStore(subscribeKnowledge, knowledgeSnapshot, knowledgeSnapshot);
  const [tab, setTab] = useState<Tab>("pulse");

  // Declare this screen as a watcher so the shared engine polls fast while
  // it is open, then falls back to the idle cadence on unmount.
  useEffect(() => watchKnowledge(), []);

  const milestonePct = kb.milestone > 0 ? Math.min(1, kb.total / kb.milestone) : 0;
  const remaining = Math.max(0, kb.milestone - kb.total);

  return (
    <AppShell
      title="BRAIN"
      subtitle="knowledge base & crawler"
      accentLabel={kb.learning ? "learning" : "paused"}
    >
      <Coach id="knowledge" steps={COACH} />

      {kb.error ? (
        <Card accent="warn" className="flex items-start gap-3">
          <IconBadge accent="warn">
            <PlugZap className="size-4" />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{kb.error}</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {kb.lastSync
                ? `Showing the last synced snapshot from ${ago(kb.lastSync)}.`
                : "Nothing cached yet — pair your PC to fill the brain."}
            </p>
            <div className="mt-3 flex gap-2">
              <ActionButton
                variant="ghost"
                className="h-9 px-3 text-xs"
                onClick={() => void syncKnowledge(true)}
              >
                <RefreshCw className="size-3.5" /> retry
              </ActionButton>
              <Link to="/connect" className="contents">
                <ActionButton variant="ghost" className="h-9 px-3 text-xs">
                  <Link2 className="size-3.5" /> pairing
                </ActionButton>
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex items-center gap-2">
        <Segmented
          options={TABS}
          value={tab}
          onChange={(t) => {
            fx.select();
            setTab(t);
          }}
          className="flex-1"
        />
        <button
          type="button"
          aria-label="refresh knowledge"
          onClick={() => {
            fx.tap();
            void syncKnowledge(true);
          }}
          className="press grid size-9 shrink-0 place-items-center rounded-xl border border-dim/70 bg-surface-3/60 text-muted hover:text-cyan"
        >
          {kb.syncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </button>
      </div>

      {tab === "pulse" ? (
        <PulseTab kb={kb} milestonePct={milestonePct} remaining={remaining} />
      ) : null}
      {tab === "graph" ? <GraphTab kb={kb} /> : null}
      {tab === "recall" ? <RecallTab total={kb.total} /> : null}
      {tab === "sources" ? <SourcesTab queue={kb.queue} /> : null}
    </AppShell>
  );
}

type Kb = ReturnType<typeof knowledgeSnapshot>;

function PulseTab({
  kb,
  milestonePct,
  remaining,
}: {
  kb: Kb;
  milestonePct: number;
  remaining: number;
}) {
  return (
    <>
      <section data-coach="kb-stats" className="grid grid-cols-2 gap-3">
        <StatTile
          label="articles"
          value={compact(kb.total)}
          accent="neural"
          sub={kb.stale ? "cached" : "live on your PC"}
        />
        <StatTile
          label="queue"
          value={compact(kb.queue)}
          accent="cyan"
          sub={`${kb.workers || 0} workers`}
        />
        <StatTile
          label="intake"
          value={kb.velocity ? `${kb.velocity}/h` : "—"}
          accent="system"
          sub={kb.etaHours != null ? `next tier in ~${kb.etaHours}h` : "measuring"}
        />
        <StatTile
          label="this session"
          value={compact(kb.session)}
          accent="ok"
          sub={`synced ${ago(kb.lastSync)}`}
        />
      </section>

      <Card data-coach="kb-graph" accent="neural" className="space-y-3">
        <SectionHeader
          title="growth · 24h"
          accent="neural"
          action={
            <Chip accent={kb.learning ? "ok" : "warn"}>{kb.learning ? "crawling" : "paused"}</Chip>
          }
        />
        <GrowthChart points={kb.points} accent="neural" />
        <div className="flex items-center gap-4 pt-1">
          <ProgressRing
            value={milestonePct}
            center={`${Math.round(milestonePct * 100)}%`}
            caption={`to ${compact(kb.milestone)}`}
            accent="cyan"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm leading-snug text-body">
              <span className="font-mono font-bold text-cyan">{compact(remaining)}</span> articles
              until the next milestone.
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              Butler crawls continuously in the background on your own machine. Nothing is uploaded
              anywhere.
            </p>
          </div>
        </div>
      </Card>

      <Card data-coach="kb-crawler" className="space-y-3">
        <SectionHeader title="crawler" accent="cyan" />
        <Row
          title="background learning"
          sub={
            kb.learning
              ? "Indexing new sources continuously"
              : "Paused — full CPU reserved for chat"
          }
          left={
            <IconBadge accent={kb.learning ? "ok" : "warn"}>
              <Sparkles className="size-4" />
            </IconBadge>
          }
          right={
            <Toggle
              on={kb.learning}
              onChange={(next) => {
                void setCrawler(next).catch(() => undefined);
              }}
              label="background learning"
            />
          }
        />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="queued" value={compact(kb.queue)} />
          <MiniStat label="workers" value={String(kb.workers || 0)} />
          <MiniStat label="synced" value={ago(kb.lastSync)} />
        </div>
      </Card>

      <LocalGrowthCard />

      <FeedCard kb={kb} limit={8} />
    </>
  );
}

/** Offline-safe growth ledger kept on the phone, independent of the PC bridge. */
function LocalGrowthCard() {
  const [, bump] = useState(0);
  useEffect(() => {
    loadGrowth();
    return subscribeGrowth(() => bump((n) => n + 1));
  }, []);

  const total = growthTotal();
  const day = growthSince(24);
  const methods = methodBreakdown().slice(0, 6);
  const recent = recentGrowth(5);
  const points = growthPoints(24);

  return (
    <Card className="space-y-3">
      <SectionHeader
        title="on-device ledger"
        accent="ok"
        action={<Chip accent="ok">{compact(total)} tracked</Chip>}
      />
      <p className="text-xs leading-snug text-muted-foreground">
        Every finding is timestamped locally in encrypted storage, so this curve survives the PC
        going offline.
      </p>
      {points.length > 1 ? <IntakeBars points={points} accent="ok" /> : null}
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="last 24h" value={compact(day)} />
        <MiniStat label="events" value={String(recent.length ? recentGrowth(9999).length : 0)} />
      </div>
      {methods.length ? <CategoryBars categories={methods} max={6} /> : null}
      {recent.length ? (
        <ul className="space-y-1">
          {recent.map((e, i) => (
            <li
              key={`${e.ts}-${i}`}
              className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
            >
              <span className="truncate font-mono uppercase tracking-wider text-faint">
                {e.method}
              </span>
              <span className="truncate">{e.domain ?? ""}</span>
              <span className="shrink-0 font-mono tabular-nums text-body">+{e.count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={() => clearGrowth()}
        className="w-full rounded-xl border border-dim/60 bg-surface-3/50 px-3 py-2 text-xs font-medium text-muted-foreground active:scale-[0.99]"
      >
        Reset local ledger
      </button>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-dim/50 bg-surface-3/50 px-3 py-2">
      <div className="label-mono text-faint">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-body">{value}</div>
    </div>
  );
}

function GraphTab({ kb }: { kb: Kb }) {
  return (
    <>
      <Card accent="neural" className="space-y-3">
        <SectionHeader
          title="total knowledge"
          accent="neural"
          action={<Chip accent="neural">{compact(kb.total)}</Chip>}
        />
        <GrowthChart points={kb.points} accent="neural" height={160} />
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="intake per sample" accent="cyan" />
        <IntakeBars points={kb.points} accent="cyan" />
        <p className="text-xs leading-snug text-muted-foreground">
          Each bar is what the crawler added between two samples. Flat bars mean the queue is dry —
          feed it a topic in SOURCES.
        </p>
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="categories" accent="net" />
        <CategoryBars categories={kb.categories} max={8} />
      </Card>

      <FeedCard kb={kb} limit={20} />
    </>
  );
}

function FeedCard({ kb, limit }: { kb: Kb; limit: number }) {
  const items = kb.feed.slice(0, limit);
  return (
    <Card className="space-y-3">
      <SectionHeader
        title="live feed"
        accent="ok"
        action={
          kb.syncing ? (
            <Loader2 className="size-3.5 animate-spin text-cyan" />
          ) : (
            <Chip accent="ok">{items.length}</Chip>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Brain className="size-7" />}
          title="nothing indexed yet"
          body="Once your PC is paired the crawler starts filling this feed within a minute."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.url || `${a.title}-${a.at}`}>
              <Row
                title={<span className="line-clamp-2">{a.title}</span>}
                sub={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-cyan">{a.category}</span>
                    <span aria-hidden>·</span>
                    <span>{a.words ? `${compact(a.words)} words` : "indexed"}</span>
                    <span aria-hidden>·</span>
                    <span>{ago(a.at)}</span>
                  </span>
                }
                left={
                  <IconBadge accent="ok">
                    <Globe className="size-4" />
                  </IconBadge>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecallTab({ total }: { total: number }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<KbHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [teaching, setTeaching] = useState(false);

  const run = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setHits(null);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      setHits(await recall(query));
    } catch (e) {
      setErr((e as Error)?.message ?? "Recall failed.");
      setHits([]);
    } finally {
      setBusy(false);
    }
  }, []);

  // Debounced live recall — one request per pause in typing, never per keystroke.
  useEffect(() => {
    const id = setTimeout(() => void run(q), 420);
    return () => clearTimeout(id);
  }, [q, run]);

  return (
    <>
      <Card className="space-y-3">
        <SectionHeader
          title="recall"
          accent="cyan"
          action={<Chip accent="cyan">{compact(total)} indexed</Chip>}
        />
        <div className="flex items-center gap-2 rounded-xl border border-dim/70 bg-surface-3/60 px-3">
          <Search className="size-4 shrink-0 text-faint" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="search everything Butler has learned"
            aria-label="search the knowledge base"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-body outline-none placeholder:text-faint"
          />
          {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-cyan" /> : null}
        </div>
        {err ? <p className="text-xs text-warn">{err}</p> : null}
      </Card>

      {hits === null ? (
        <EmptyState
          icon={<Search className="size-7" />}
          title="ask the archive"
          body="Type at least two characters. Results come straight from your PC's local index — no cloud search."
        />
      ) : hits.length === 0 ? (
        <Card className="space-y-3">
          <EmptyState
            icon={<Search className="size-7" />}
            title="no matches"
            body="Nothing indexed for that yet — Butler can go and learn it right now."
          />
          <ActionButton
            className="w-full"
            disabled={teaching}
            onClick={() => {
              setTeaching(true);
              void expandTopic(q)
                .then(() => setErr(""))
                .catch((e: Error) => setErr(e?.message ?? "Could not queue that topic."))
                .finally(() => setTeaching(false));
            }}
          >
            {teaching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}{" "}
            teach Butler “{q.trim().slice(0, 22)}”
          </ActionButton>
        </Card>
      ) : (
        <ul className="space-y-2">
          {hits.map((h, i) => (
            <li key={`${h.url}-${i}`}>
              <Card className="space-y-1.5 p-3">
                <div className="flex items-start gap-2">
                  <IconBadge accent="neural">
                    <Brain className="size-4" />
                  </IconBadge>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{h.title}</p>
                    <p className="label-mono mt-0.5 truncate text-faint">{h.category}</p>
                  </div>
                </div>
                {h.snippet ? (
                  <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                    {h.snippet}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SourcesTab({ queue }: { queue: number }) {
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState<"" | "queue" | "now" | "topic">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const feedback = useCallback((ok: boolean, text: string) => {
    setMsg({ ok, text });
    if (ok) {
      fx.success();
    } else {
      fx.warn();
    }
    setTimeout(() => setMsg(null), 6000);
  }, []);

  const submitUrl = useCallback(
    async (immediate: boolean) => {
      setBusy(immediate ? "now" : "queue");
      try {
        const res = await addSource(url, "Custom", immediate);
        setUrl("");
        feedback(
          true,
          immediate && "title" in res
            ? `Stored “${String(res.title).slice(0, 48)}”`
            : "Queued for the crawler.",
        );
      } catch (e) {
        feedback(false, (e as Error)?.message ?? "Could not add that source.");
      } finally {
        setBusy("");
      }
    },
    [url, feedback],
  );

  const submitTopic = useCallback(async () => {
    setBusy("topic");
    try {
      const res = await expandTopic(topic);
      setTopic("");
      feedback(true, `Hunting ${res.queued} new leads.`);
    } catch (e) {
      feedback(false, (e as Error)?.message ?? "Could not expand that topic.");
    } finally {
      setBusy("");
    }
  }, [topic, feedback]);

  const urlValid = useMemo(() => /^https?:\/\/\S+$/i.test(url.trim()), [url]);

  return (
    <>
      {msg ? (
        <Card accent={msg.ok ? "ok" : "warn"} className="py-3">
          <p className={cn("text-sm leading-snug", msg.ok ? "text-ok" : "text-warn")}>{msg.text}</p>
        </Card>
      ) : null}

      <Card data-coach="kb-sources" className="space-y-3">
        <SectionHeader
          title="add a page"
          accent="cyan"
          action={<Chip accent="cyan">{compact(queue)} queued</Chip>}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.example.com/guide"
          aria-label="source URL"
          inputMode="url"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 w-full rounded-xl border border-dim/70 bg-surface-3/60 px-3 text-sm text-body outline-none placeholder:text-faint focus:border-cyan/50"
        />
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            variant="ghost"
            disabled={!urlValid || busy !== ""}
            onClick={() => void submitUrl(false)}
          >
            {busy === "queue" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Database className="size-4" />
            )}{" "}
            queue
          </ActionButton>
          <ActionButton disabled={!urlValid || busy !== ""} onClick={() => void submitUrl(true)}>
            {busy === "now" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Globe className="size-4" />
            )}{" "}
            crawl now
          </ActionButton>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          Queue is polite and runs in the background. Crawl now fetches the page immediately and
          stores it before you leave this screen.
        </p>
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="learn a topic" accent="neural" />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. windows disk cleanup scripting"
          aria-label="topic to learn"
          enterKeyHint="go"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-dim/70 bg-surface-3/60 px-3 text-sm text-body outline-none placeholder:text-faint focus:border-neural/50"
        />
        <ActionButton
          className="w-full"
          disabled={topic.trim().length < 3 || busy !== ""}
          onClick={() => void submitTopic()}
        >
          {busy === "topic" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}{" "}
          send Butler hunting
        </ActionButton>
        <p className="text-xs leading-snug text-muted-foreground">
          Butler searches from your PC, filters out junk domains, then indexes what survives.
          Results show up in the live feed.
        </p>
      </Card>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Bug, Download, Filter, Info, Radio, Trash2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/nexus/AppShell";
import {
  Card,
  Chip,
  IconBadge,
  Row,
  SectionHeader,
  StatTile,
  ActionButton,
} from "@/components/nexus/ui";
import { cn } from "@/lib/utils";
import { fx } from "@/lib/fx";
import {
  clearLogs,
  downloadBundle,
  getLogs,
  subscribeLogs,
  type LogChannel,
  type LogEntry,
  type LogLevel,
} from "@/lib/logger";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs & Telemetry — Butler AI NEXUS" },
      {
        name: "description",
        content: "Live on-device event stream, error counters and exportable diagnostics.",
      },
      { property: "og:title", content: "Logs & Telemetry — NEXUS" },
      { property: "og:description", content: "Every event Butler records, stored locally." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Logs,
});

const CHANNELS: (LogChannel | "all")[] = [
  "all",
  "bridge",
  "ai",
  "script",
  "crash",
  "perf",
  "console",
  "app",
];

const LEVEL_META: Record<
  LogLevel,
  { accent: "system" | "warn" | "danger" | "net"; icon: typeof Info }
> = {
  debug: { accent: "net", icon: Radio },
  info: { accent: "system", icon: Info },
  warn: { accent: "warn", icon: AlertTriangle },
  error: { accent: "danger", icon: Bug },
};

const clock = (t: number) =>
  new Date(t).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** Stable empty snapshot: the recorder only exists in the browser, so the
 *  server (and the hydration pass) must render an empty list or React tears
 *  the tree down with a hydration mismatch. */
const NO_LOGS: readonly never[] = [];

function Logs() {
  const entries = useSyncExternalStore(subscribeLogs, getLogs, () => NO_LOGS);
  const [channel, setChannel] = useState<LogChannel | "all">("all");
  const [level, setLevel] = useState<LogLevel | "all">("all");

  // Derived from the same snapshot the list renders, so SSR and hydration
  // always agree (reading the live buffer here would diverge).
  const counts = useMemo(() => {
    const c = { debug: 0, info: 0, warn: 0, error: 0 } as Record<LogLevel, number>;
    for (const e of entries) c[e.level] = (c[e.level] ?? 0) + 1;
    return c;
  }, [entries]);

  const visible = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            (channel === "all" || e.channel === channel) && (level === "all" || e.level === level),
        )
        .slice()
        .reverse()
        .slice(0, 200),
    [channel, entries, level],
  );

  // 24 buckets across the session window, so spikes are visible at a glance.
  const bars = useMemo(() => {
    if (!entries.length) return Array.from({ length: 24 }, () => 0);
    const first = entries[0]!.t;
    const span = Math.max(1, Date.now() - first);
    const buckets = Array.from({ length: 24 }, () => 0);
    for (const e of entries) {
      const i = Math.min(23, Math.floor(((e.t - first) / span) * 24));
      buckets[i] = (buckets[i] ?? 0) + 1;
    }
    const peak = Math.max(...buckets, 1);
    return buckets.map((b) => b / peak);
  }, [entries]);

  return (
    <AppShell
      title="LOGS"
      subtitle="event stream · telemetry"
      accentLabel={`${entries.length} events`}
    >
      <section className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-4">
        <StatTile label="info" value={String(counts.info)} accent="system" />
        <StatTile label="warn" value={String(counts.warn)} accent="warn" />
        <StatTile label="error" value={String(counts.error)} accent="danger" />
        <StatTile label="debug" value={String(counts.debug)} accent="net" />
      </section>

      <section>
        <SectionHeader title="filters" action={<Filter size={14} className="text-faint" />} />
        <div className="scroll-x -mx-4 flex gap-2 px-4 pb-1 sm:-mx-6 sm:px-6">
          {CHANNELS.map((c) => (
            <button key={c} type="button" onClick={() => setChannel(c)} className="press shrink-0">
              <span className={cn(channel === c ? "" : "opacity-55")}>
                <Chip
                  accent={
                    c === "all" ? "cyan" : c === "ai" ? "neural" : c === "crash" ? "danger" : "net"
                  }
                >
                  {c}
                </Chip>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["all", "info", "warn", "error"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLevel(l)} className="press">
              <span className={cn(level === l ? "" : "opacity-55")}>
                <Chip accent={l === "all" ? "cyan" : LEVEL_META[l as LogLevel].accent}>{l}</Chip>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="activity" accent="system" hint="Events across this session" />
        <Card>
          <div className="flex h-24 items-end gap-1">
            {bars.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-t transition-all",
                  h > 0 ? "bg-cyan/70" : "bg-surface-3",
                )}
                style={{ height: `${Math.max(6, h * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 label-mono text-muted-foreground">
            {entries.length ? `first event ${clock(entries[0]!.t)}` : "awaiting samples"}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="stream" hint={`${visible.length} shown`} />
        <div className="space-y-2">
          {visible.map((e: LogEntry) => {
            const meta = LEVEL_META[e.level];
            return (
              <Row
                key={e.id}
                title={
                  <span className="font-mono text-xs">
                    {clock(e.t)} <span className="text-faint">{e.channel}</span> {e.msg}
                  </span>
                }
                sub={
                  [
                    typeof e.ms === "number" ? `${e.ms}ms` : "",
                    e.data !== undefined ? JSON.stringify(e.data).slice(0, 120) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || e.level
                }
                left={
                  <IconBadge accent={meta.accent} size={32}>
                    <meta.icon size={14} />
                  </IconBadge>
                }
              />
            );
          })}
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-dim/70 p-6 text-center text-xs text-muted-foreground">
              Nothing recorded on this filter yet — use the app and events appear here instantly.
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          variant="ghost"
          onClick={() => {
            fx.tap();
            clearLogs();
          }}
        >
          <Trash2 size={16} /> Clear
        </ActionButton>
        <ActionButton
          onClick={() => {
            fx.success();
            downloadBundle();
          }}
        >
          <Download size={16} /> Export bundle
        </ActionButton>
      </div>
    </AppShell>
  );
}

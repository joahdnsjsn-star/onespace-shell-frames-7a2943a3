import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {


  Wifi,
  Zap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Play,
  Moon,
  ClipboardCopy,
  Power,
  RefreshCw,
} from "lucide-react";
import { AppShell, TABS } from "@/components/nexus/AppShell";
import {
  Card,
  Chip,
  IconBadge,
  ProgressBar,
  Row,
  SectionHeader,
  StatTile,
} from "@/components/nexus/ui";
import { useTelemetry } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Butler AI NEXUS — Local PC Command Centre" },
      {
        name: "description",
        content:
          "NEXUS command centre shell: live PC telemetry, scripts, neural knowledge base and secure LAN pairing.",
      },
      { property: "og:title", content: "Butler AI NEXUS — Command Centre" },
      {
        property: "og:description",
        content: "Dark HUD interface for controlling your own PC from your phone over LAN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const QUICK = [
  { label: "Lock PC", icon: ShieldCheck, accent: "neural" as const },
  { label: "Sleep", icon: Moon, accent: "system" as const },
  { label: "Clipboard", icon: ClipboardCopy, accent: "cyan" as const },
  { label: "Wake LAN", icon: Wifi, accent: "net" as const },
  { label: "Shutdown", icon: Power, accent: "danger" as const },
  { label: "Restart", icon: RefreshCw, accent: "warn" as const },
];

function Home() {
  const t = useTelemetry();
  const [fired, setFired] = useState<string | null>(null);

  const fire = (label: string) => {
    setFired(label);
    window.setTimeout(() => setFired((v) => (v === label ? null : v)), 1200);
  };

  return (
    <AppShell title="NEXUS CORE" subtitle="workstation · DESKTOP-A9F2" accentLabel="linked">
      <section>
        <Card accent="cyan" className="scanline nx-sheen lift relative overflow-hidden">
          <div className="flex items-start gap-3">
            <IconBadge accent="cyan" size={48} glow>
              <Zap size={22} />
            </IconBadge>
            <div className="min-w-0">
              <div className="label-mono text-cyan">bridge online</div>
              <p className="mt-1 text-sm text-muted-foreground">
                butler_server.py responding on 192.168.1.24:8770 — encrypted LAN channel, no cloud
                relay.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip accent="ok" dot>
              heartbeat {Math.round(t.latency)}ms
            </Chip>
            <Chip accent="net">wifi lan</Chip>
            <Chip accent="neural">ai ready</Chip>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="live telemetry" hint="Streaming from your own machine" />
        <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-4">
          <StatTile
            label="cpu load"
            value={t.cpu.toFixed(0)}
            unit="%"
            accent="cyan"
            sub="8 cores active"
          />
          <StatTile
            label="memory"
            value={t.mem.toFixed(1)}
            unit="gb"
            accent="neural"
            sub="of 32 gb"
          />
          <StatTile label="disk" value={t.disk.toFixed(0)} unit="%" accent="warn" sub="nvme 0" />
          <StatTile
            label="uptime"
            value={t.uptime.toFixed(1)}
            unit="hrs"
            accent="system"
            sub="since boot"
          />
        </div>

        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <div className="label-mono text-muted-foreground">throughput</div>
            <Chip accent="net" dot>
              {t.net.toFixed(1)} mb/s
            </Chip>
          </div>
          <div className="mt-3 space-y-3">
            <Meter label="cpu" value={t.cpu} accent="cyan" />
            <Meter label="ram" value={(t.mem / 32) * 100} accent="neural" />
            <Meter label="disk" value={t.disk} accent="warn" />
          </div>
          <Sparkline value={t.cpu} />
        </Card>
      </section>

      <section>
        <SectionHeader title="quick butler" hint="One-tap actions on the paired PC" accent="neural" />
        <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-3">
          {QUICK.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => fire(a.label)}
              className="lift flex items-center gap-3 rounded-xl border border-dim/70 bg-surface-2 p-3 text-left hover:border-cyan/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50"
            >
              <IconBadge accent={a.accent} size={34}>
                <a.icon size={16} />
              </IconBadge>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {fired === a.label ? <span className="text-cyan">sent…</span> : a.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="modules" hint="Nine tabs, each a separate superpower" />
        <div className="grid grid-cols-3 gap-3 min-[430px]:grid-cols-4">
          {TABS.filter((tab) => tab.to !== "/").map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className="lift flex flex-col items-center gap-2 rounded-xl border border-dim/70 bg-surface-2 py-4 hover:border-cyan/40"
            >
              <tab.icon size={20} className="text-cyan" strokeWidth={1.6} />
              <span className="label-mono text-[9px] text-muted-foreground">{tab.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="recent executions" accent="system" />
        <div className="space-y-2">
          {[
            { n: "backup_docs.ps1", s: "completed · 2m 14s", ok: true },
            { n: "clean_temp.sh", s: "completed · 0m 38s", ok: true },
            { n: "gpu_bench.py", s: "idle · never run", ok: false },
          ].map((r) => (
            <Row
              key={r.n}
              title={r.n}
              sub={r.s}
              left={
                <IconBadge accent={r.ok ? "ok" : "system"} size={32}>
                  {r.ok ? <Activity size={14} /> : <Play size={14} />}
                </IconBadge>
              }
              right={
                <span className={`label-mono ${r.ok ? "text-ok" : "text-muted-foreground"}`}>
                  {r.ok ? "done" : "idle"}
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="knowledge growth" accent="neural" />
        <Card className="lift">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>indexed fragments</span>
            <span className="font-mono">1,284 / 2,000</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={64} accent="neural" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <MiniStat label="docs" value="412" />
            <MiniStat label="code" value="669" />
            <MiniStat label="notes" value="203" />
          </div>
        </Card>
      </section>

      <Link
        to="/onboarding"
        className="press mb-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-14px_var(--cyan)] hover:bg-cyan/90"
      >
        Replay onboarding <ArrowRight size={16} />
      </Link>
    </AppShell>
  );
}

function Meter({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "neural" | "warn";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="label-mono w-8 shrink-0 text-faint">{label}</span>
      <div className="min-w-0 flex-1">
        <ProgressBar value={value} accent={accent} />
      </div>
      <span className="label-mono w-9 shrink-0 text-right text-muted-foreground">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

/** Deterministic HUD sparkline that reacts to the live CPU value. */
function Sparkline({ value }: { value: number }) {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const wave = Math.sin(i * 0.55) * 8 + Math.cos(i * 0.21) * 5;
    const y = 30 - ((value + wave) / 100) * 26;
    return `${(i / 27) * 100},${Math.max(2, Math.min(30, y)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-4 h-12 w-full" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
        className="transition-all duration-500 ease-out"
      />
      <polyline
        points={`0,32 ${pts} 100,32`}
        fill="color-mix(in oklab, var(--cyan) 12%, transparent)"
        stroke="none"
      />
    </svg>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dim/50 bg-surface-3/50 px-2 py-2 text-center">
      <div className="font-mono text-sm tabular-nums">{value}</div>
      <div className="label-mono text-[9px] text-faint">{label}</div>
    </div>
  );
}


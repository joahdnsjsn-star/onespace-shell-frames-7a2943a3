import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, HardDrive, Wifi, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { TABS } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, ProgressBar, Row, SectionHeader, StatTile, Skeleton, ActionButton } from "@/components/nexus/ui";

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
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell title="NEXUS CORE" subtitle="workstation · DESKTOP-A9F2" accentLabel="linked">
      <section>
        <Card accent="cyan" className="scanline relative overflow-hidden">
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
              heartbeat 42ms
            </Chip>
            <Chip accent="net">wifi lan</Chip>
            <Chip accent="neural">ai ready</Chip>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="live telemetry" hint="Streaming from your own machine" />
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="cpu load" value="—" unit="%" accent="cyan" sub="awaiting sample" />
          <StatTile label="memory" value="—" unit="gb" accent="neural" sub="awaiting sample" />
          <StatTile label="disk" value="—" unit="%" accent="warn" sub="awaiting sample" />
          <StatTile label="uptime" value="—" unit="hrs" accent="system" sub="awaiting sample" />
        </div>
        <Card className="mt-3">
          <div className="label-mono text-muted-foreground">throughput</div>
          <div className="mt-3 space-y-3">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-4/5" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="quick butler"
          hint="One-tap actions on the paired PC"
          accent="neural"
        />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Lock PC", icon: ShieldCheck },
            { label: "Sleep", icon: Cpu },
            { label: "Clipboard", icon: HardDrive },
            { label: "Wake LAN", icon: Wifi },
          ].map((a) => (
            <div
              key={a.label}
              className="flex items-center gap-3 rounded-xl border border-dim/70 bg-surface-2 p-3"
            >
              <IconBadge accent="neural" size={34}>
                <a.icon size={16} />
              </IconBadge>
              <span className="text-sm font-medium">{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="modules" hint="Nine tabs, each a separate superpower" />
        <div className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
          {TABS.filter((t) => t.to !== "/").map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center gap-2 rounded-xl border border-dim/70 bg-surface-2 py-4 transition-colors hover:border-cyan/40"
            >
              <t.icon size={20} className="text-cyan" strokeWidth={1.6} />
              <span className="label-mono text-muted-foreground">{t.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="recent executions" accent="system" />
        <div className="space-y-2">
          <Row
            title="backup_docs.ps1"
            sub="no runs recorded yet"
            left={<IconBadge accent="system" size={32}><Zap size={14} /></IconBadge>}
            right={<span className="label-mono text-muted-foreground">idle</span>}
          />
          <Row
            title="clean_temp.sh"
            sub="no runs recorded yet"
            left={<IconBadge accent="system" size={32}><Zap size={14} /></IconBadge>}
            right={<span className="label-mono text-muted-foreground">idle</span>}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="knowledge growth" accent="neural" />
        <Card>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>indexed fragments</span>
            <span className="font-mono">— / —</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={0} accent="neural" />
          </div>
        </Card>
      </section>

      <Link to="/onboarding" className="block">
        <ActionButton className="w-full">
          Replay onboarding <ArrowRight size={16} />
        </ActionButton>
      </Link>
    </AppShell>
  );
}

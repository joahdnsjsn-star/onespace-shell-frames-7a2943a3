import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, AlertTriangle, Info, Bug, Filter, Download } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, Row, SectionHeader, Skeleton, StatTile, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs & Telemetry — Butler AI NEXUS" },
      {
        name: "description",
        content: "System log stream, error counters and crash diagnostics for your paired PC.",
      },
      { property: "og:title", content: "Logs & Telemetry — NEXUS" },
      { property: "og:description", content: "Every event Butler records, stored locally." },
    ],
  }),
  component: Logs,
});

const LEVELS = [
  { label: "info", accent: "system" as const, icon: Info },
  { label: "warn", accent: "warn" as const, icon: AlertTriangle },
  { label: "error", accent: "danger" as const, icon: Bug },
];

function Logs() {
  return (
    <AppShell title="LOGS" subtitle="event stream · telemetry" accentLabel="live">
      <section className="grid grid-cols-3 gap-3">
        <StatTile label="info" value="—" accent="system" />
        <StatTile label="warn" value="—" accent="warn" />
        <StatTile label="error" value="—" accent="danger" />
      </section>

      <section>
        <SectionHeader
          title="filters"
          action={<Filter size={14} className="text-faint" />}
        />
        <div className="flex flex-wrap gap-2">
          <Chip accent="cyan">all</Chip>
          {LEVELS.map((l) => (
            <Chip key={l.label} accent={l.accent}>
              {l.label}
            </Chip>
          ))}
          <Chip accent="net">network</Chip>
          <Chip accent="neural">ai</Chip>
        </div>
      </section>

      <section>
        <SectionHeader title="activity" accent="system" hint="Events per hour" />
        <Card>
          <div className="flex h-24 items-end gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-t bg-surface-3" style={{ height: `${8 + ((i * 11) % 55)}%` }} />
            ))}
          </div>
          <div className="mt-2 label-mono text-muted-foreground">awaiting samples</div>
        </Card>
      </section>

      <section>
        <SectionHeader title="stream" />
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <Row
              key={l.label}
              title={<span className="font-mono text-xs">--:--:-- {l.label.toUpperCase()}</span>}
              sub="waiting for the bridge to emit events"
              left={
                <IconBadge accent={l.accent} size={32}>
                  <l.icon size={14} />
                </IconBadge>
              }
            />
          ))}
          <Card>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-5/6" />
              <Skeleton className="h-2.5 w-2/3" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title="crash reports" accent="danger" />
        <Card accent="danger">
          <div className="flex items-center gap-3">
            <IconBadge accent="danger" size={34}>
              <BarChart3 size={16} />
            </IconBadge>
            <div>
              <div className="text-sm font-medium">No crashes recorded</div>
              <div className="text-[11px] text-muted-foreground">Diagnostics stay on device.</div>
            </div>
          </div>
        </Card>
      </section>

      <ActionButton variant="ghost" className="w-full">
        <Download size={16} /> Export log bundle
      </ActionButton>
    </AppShell>
  );
}

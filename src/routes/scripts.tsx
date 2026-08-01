import { createFileRoute } from "@tanstack/react-router";
import { Code2, Play, Plus, Search, Clock, Terminal } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, EmptyState, IconBadge, Row, SectionHeader, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/scripts")({
  head: () => ({
    meta: [
      { title: "Scripts — Butler AI NEXUS" },
      {
        name: "description",
        content: "Library of local automation scripts with run history and a live output console.",
      },
      { property: "og:title", content: "Scripts — NEXUS" },
      {
        property: "og:description",
        content: "Run your own PowerShell, Bash and Python scripts from your phone.",
      },
    ],
  }),
  component: Scripts,
});

const SCRIPTS = [
  { name: "backup_docs.ps1", lang: "powershell", accent: "system" as const },
  { name: "clean_temp.sh", lang: "bash", accent: "cyan" as const },
  { name: "render_queue.py", lang: "python", accent: "neural" as const },
  { name: "wake_nas.ps1", lang: "powershell", accent: "net" as const },
];

function Scripts() {
  return (
    <AppShell title="SCRIPTS" subtitle="local automation library" accentLabel="4 loaded">
      <section>
        <div className="flex items-center gap-2 rounded-xl border border-dim bg-surface-2 px-3 py-2.5">
          <Search size={16} className="text-faint" />
          <span className="flex-1 text-sm text-muted-foreground">Search scripts…</span>
          <IconBadge accent="cyan" size={30}>
            <Plus size={14} />
          </IconBadge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip accent="cyan">all</Chip>
          <Chip accent="system">powershell</Chip>
          <Chip accent="neural">python</Chip>
          <Chip accent="net">bash</Chip>
        </div>
      </section>

      <section>
        <SectionHeader title="library" hint="Stored on the paired PC only" />
        <div className="space-y-2">
          {SCRIPTS.map((s) => (
            <Row
              key={s.name}
              title={<span className="font-mono">{s.name}</span>}
              sub={`${s.lang} · never run`}
              left={
                <IconBadge accent={s.accent} size={34}>
                  <Code2 size={16} />
                </IconBadge>
              }
              right={
                <span className="grid size-8 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan">
                  <Play size={13} />
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="output console" accent="system" />
        <Card>
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-system" />
            <span className="label-mono text-muted-foreground">stdout</span>
          </div>
          <pre className="mt-3 min-h-28 scroll-x rounded-lg border border-dim/60 bg-background p-3 font-mono text-[11px] text-faint">
{`> waiting for execution…`}
          </pre>
        </Card>
      </section>

      <section>
        <SectionHeader title="run history" accent="warn" action={<Clock size={14} className="text-faint" />} />
        <EmptyState
          title="no runs yet"
          body="Execution history appears here once a script has been run on your PC."
          icon={<Clock size={28} />}
        />
      </section>

      <ActionButton className="w-full">
        <Plus size={16} /> New script
      </ActionButton>
    </AppShell>
  );
}

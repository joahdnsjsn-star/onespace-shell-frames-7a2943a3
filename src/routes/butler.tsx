import { createFileRoute } from "@tanstack/react-router";
import { Bot, Mic, Paperclip, SendHorizonal, User } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, SectionHeader, Skeleton } from "@/components/nexus/ui";

export const Route = createFileRoute("/butler")({
  head: () => ({
    meta: [
      { title: "Butler Chat — Butler AI NEXUS" },
      { name: "description", content: "Conversational control surface for your paired PC." },
      { property: "og:title", content: "Butler Chat — NEXUS" },
      { property: "og:description", content: "Talk to your local machine in plain language." },
    ],
  }),
  component: Butler,
});

const SUGGESTIONS = [
  "Show me disk usage",
  "Close all Chrome windows",
  "Summarise today's logs",
  "Copy clipboard from PC",
];

function Butler() {
  return (
    <AppShell title="BUTLER" subtitle="neural command interface" accentLabel="ai ready">
      <section className="space-y-3">
        <div className="flex gap-2">
          <IconBadge accent="neural" size={34}>
            <Bot size={16} />
          </IconBadge>
          <div className="max-w-[80%] rounded-xl rounded-tl-sm border border-dim/60 bg-surface-2 p-3 text-sm">
            Bridge connected. Ask me anything about this machine — I run locally and never leave
            your LAN.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-cyan px-3 py-2 text-sm text-primary-foreground">
            What's eating my memory right now?
          </div>
          <IconBadge accent="cyan" size={34}>
            <User size={16} />
          </IconBadge>
        </div>

        <div className="flex gap-2">
          <IconBadge accent="neural" size={34}>
            <Bot size={16} />
          </IconBadge>
          <div className="w-[80%] space-y-2 rounded-xl rounded-tl-sm border border-dim/60 bg-surface-2 p-3">
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-1/2" />
            <div className="label-mono text-muted-foreground">awaiting response</div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="tool call" accent="system" hint="Executed on the paired PC" />
        <Card accent="system">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-system">system.processes.top()</span>
            <Chip accent="warn" dot>
              pending
            </Chip>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-dim/60 bg-background p-3 font-mono text-[11px] text-muted-foreground">
{`{ "limit": 5, "sort": "memory" }`}
          </pre>
        </Card>
      </section>

      <section>
        <SectionHeader title="suggestions" />
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-dim bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="sticky bottom-2">
        <div className="flex items-center gap-2 rounded-2xl border border-dim bg-surface-2 p-2">
          <IconBadge accent="cyan" size={36}>
            <Paperclip size={16} />
          </IconBadge>
          <span className="flex-1 truncate px-1 text-sm text-muted-foreground">
            Message Butler…
          </span>
          <IconBadge accent="neural" size={36}>
            <Mic size={16} />
          </IconBadge>
          <span className="grid size-9 place-items-center rounded-[0.7rem] bg-cyan text-primary-foreground">
            <SendHorizonal size={16} />
          </span>
        </div>
      </section>
    </AppShell>
  );
}

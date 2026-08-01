import { createFileRoute } from "@tanstack/react-router";
import { Hammer, Blocks, Play, Save, GitBranch, Wand2 } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, Row, SectionHeader, ActionButton, EmptyState } from "@/components/nexus/ui";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Automation Builder — Butler AI NEXUS" },
      {
        name: "description",
        content: "Visual builder for chaining triggers, conditions and PC actions into automations.",
      },
      { property: "og:title", content: "Automation Builder — NEXUS" },
      { property: "og:description", content: "Compose local automations block by block." },
    ],
  }),
  component: Builder,
});

const BLOCKS = [
  { t: "TRIGGER", d: "When PC comes online", accent: "ok" as const },
  { t: "CONDITION", d: "If battery below 20%", accent: "warn" as const },
  { t: "ACTION", d: "Run script clean_temp.sh", accent: "cyan" as const },
  { t: "ACTION", d: "Send notification to phone", accent: "neural" as const },
];

function Builder() {
  return (
    <AppShell title="BUILDER" subtitle="automation composer" accentLabel="draft">
      <section>
        <SectionHeader title="canvas" hint="Blocks execute top to bottom" />
        <div className="space-y-2">
          {BLOCKS.map((b, i) => (
            <div key={b.d} className="relative">
              <Row
                title={b.d}
                sub={`block ${String(i + 1).padStart(2, "0")}`}
                left={
                  <IconBadge accent={b.accent} size={34}>
                    <Blocks size={16} />
                  </IconBadge>
                }
                right={<Chip accent={b.accent}>{b.t}</Chip>}
              />
              {i < BLOCKS.length - 1 ? (
                <div className="mx-auto h-3 w-px bg-dim" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="palette" accent="neural" hint="Drag a block onto the canvas" />
        <div className="grid grid-cols-2 gap-3">
          {["Schedule", "File change", "Hotkey", "Webhook", "Run script", "Notify"].map((p) => (
            <div
              key={p}
              className="flex items-center gap-2 rounded-xl border border-dashed border-dim bg-surface-2 px-3 py-3 text-sm text-muted-foreground"
            >
              <Wand2 size={14} className="text-neural" />
              {p}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="test run" accent="warn" />
        <Card>
          <pre className="scroll-x rounded-lg border border-dim/60 bg-background p-3 font-mono text-[11px] text-faint">
{`> no dry-run executed yet`}
          </pre>
        </Card>
      </section>

      <section>
        <SectionHeader title="saved flows" accent="system" action={<GitBranch size={14} className="text-faint" />} />
        <EmptyState
          title="nothing saved"
          body="Saved automations appear here and sync only with your paired PC."
          icon={<Hammer size={28} />}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton variant="ghost">
          <Play size={16} /> Dry run
        </ActionButton>
        <ActionButton>
          <Save size={16} /> Save flow
        </ActionButton>
      </div>
    </AppShell>
  );
}

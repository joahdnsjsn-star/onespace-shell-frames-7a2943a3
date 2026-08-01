import { createFileRoute } from "@tanstack/react-router";
import { Brain, FileText, Upload, Sparkles, Database } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, EmptyState, IconBadge, ProgressBar, Row, SectionHeader, StatTile, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Butler AI NEXUS" },
      {
        name: "description",
        content: "Neural knowledge base: indexed local documents, growth tracking and recall sources.",
      },
      { property: "og:title", content: "Knowledge Base — NEXUS" },
      { property: "og:description", content: "Everything Butler learns stays on your own machine." },
    ],
  }),
  component: Knowledge,
});

function Knowledge() {
  return (
    <AppShell title="BRAIN" subtitle="local knowledge accumulator" accentLabel="indexing" offline>
      <section className="grid grid-cols-2 gap-3">
        <StatTile label="documents" value="—" accent="neural" sub="awaiting index" />
        <StatTile label="fragments" value="—" accent="cyan" sub="awaiting index" />
        <StatTile label="vectors" value="—" accent="system" sub="awaiting index" />
        <StatTile label="last sync" value="—" accent="warn" sub="never" />
      </section>

      <section>
        <SectionHeader title="growth" accent="neural" hint="Knowledge added over the last 7 days" />
        <Card>
          <div className="flex h-28 items-end gap-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-surface-3"
                style={{ height: `${12 + ((i * 7) % 40)}%` }}
              />
            ))}
          </div>
          <div className="mt-3 label-mono text-muted-foreground">no data yet</div>
        </Card>
      </section>

      <section>
        <SectionHeader title="sources" hint="Folders Butler is allowed to read" />
        <div className="space-y-2">
          {["C:\\Users\\me\\Documents", "C:\\Projects\\butler", "D:\\Archive\\notes"].map((p) => (
            <Row
              key={p}
              title={<span className="font-mono text-xs">{p}</span>}
              sub="opt-in · read only"
              left={
                <IconBadge accent="neural" size={32}>
                  <Database size={14} />
                </IconBadge>
              }
              right={<Chip accent="ok">allowed</Chip>}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="ingestion queue" accent="warn" />
        <Card>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>queued files</span>
            <span className="font-mono">— / —</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={0} accent="warn" />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="recall" accent="cyan" />
        <EmptyState
          title="no recalls yet"
          body="Passages Butler cites in answers will be listed here with their source file."
          icon={<Sparkles size={28} />}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton variant="ghost">
          <FileText size={16} /> Browse
        </ActionButton>
        <ActionButton>
          <Upload size={16} /> Ingest
        </ActionButton>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neural/30 bg-neural/10 p-3">
        <Brain size={16} className="text-neural" />
        <p className="text-[11px] text-muted-foreground">
          Embeddings are computed on your PC. Nothing is uploaded anywhere.
        </p>
      </div>
    </AppShell>
  );
}

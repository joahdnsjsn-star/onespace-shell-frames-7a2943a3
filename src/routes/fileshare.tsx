import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen, File, ArrowUpFromLine, ArrowDownToLine, Clipboard, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, ProgressBar, Row, SectionHeader, ActionButton, EmptyState } from "@/components/nexus/ui";

export const Route = createFileRoute("/fileshare")({
  head: () => ({
    meta: [
      { title: "File Share — Butler AI NEXUS" },
      {
        name: "description",
        content: "Browse, push and pull files between phone and PC over an encrypted LAN channel.",
      },
      { property: "og:title", content: "File Share — NEXUS" },
      { property: "og:description", content: "Direct device-to-device transfers, no cloud in between." },
    ],
  }),
  component: FileShare,
});

const FOLDERS = ["Documents", "Downloads", "Projects", "Screenshots"];

function FileShare() {
  return (
    <AppShell title="FILES" subtitle="lan transfer bridge" accentLabel="encrypted">
      <section>
        <div className="flex items-center gap-1 scroll-x rounded-xl border border-dim bg-surface-2 px-3 py-2.5 font-mono text-xs text-muted-foreground">
          <span className="text-cyan">C:</span>
          <ChevronRight size={12} />
          <span>Users</span>
          <ChevronRight size={12} />
          <span>me</span>
        </div>
      </section>

      <section>
        <SectionHeader title="folders" />
        <div className="space-y-2">
          {FOLDERS.map((f) => (
            <Row
              key={f}
              title={f}
              sub="— items"
              left={
                <IconBadge accent="cyan" size={34}>
                  <FolderOpen size={16} />
                </IconBadge>
              }
              right={<ChevronRight size={16} className="text-faint" />}
            />
          ))}
          <Row
            title={<span className="font-mono text-xs">notes.md</span>}
            sub="— kb · modified —"
            left={
              <IconBadge accent="system" size={34}>
                <File size={16} />
              </IconBadge>
            }
            right={<Chip accent="system">md</Chip>}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="active transfer" accent="net" />
        <Card accent="net">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">idle</span>
            <span className="font-mono">— MB/s</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={0} accent="net" />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="clipboard bridge" accent="neural" />
        <Row
          title="Shared clipboard"
          sub="Nothing captured yet"
          left={
            <IconBadge accent="neural" size={34}>
              <Clipboard size={16} />
            </IconBadge>
          }
          right={<Chip accent="warn">off</Chip>}
        />
      </section>

      <section>
        <SectionHeader title="history" accent="system" />
        <EmptyState
          title="no transfers"
          body="Completed pushes and pulls are listed here for this session only."
          icon={<ArrowUpFromLine size={28} />}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton variant="ghost">
          <ArrowDownToLine size={16} /> Pull
        </ActionButton>
        <ActionButton>
          <ArrowUpFromLine size={16} /> Push
        </ActionButton>
      </div>
    </AppShell>
  );
}

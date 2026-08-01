import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Bug, Copy, Send } from "lucide-react";
import { Card, Chip, EmptyState, IconBadge, Row, SectionHeader, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/crash-report")({
  head: () => ({
    meta: [
      { title: "Crash Report — Butler AI NEXUS" },
      { name: "description", content: "Local crash diagnostics you can review and copy before sharing manually." },
      { property: "og:title", content: "Crash Report — Butler AI" },
      { property: "og:description", content: "Diagnostics stay on device until you copy them yourself." },
    ],
  }),
  component: CrashReport,
});

function CrashReport() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background sm:max-w-xl lg:max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-dim bg-surface/95 px-4 py-3 backdrop-blur">
        <Link to="/settings" className="flex items-center gap-1 label-mono text-muted-foreground hover:text-cyan">
          <ChevronLeft size={14} /> back
        </Link>
        <h1 className="mt-2 font-mono text-base font-bold tracking-widest">CRASH REPORT</h1>
        <p className="text-[11px] text-muted-foreground">nothing is uploaded automatically</p>
      </header>

      <main className="flex-1 space-y-5 px-4 py-5">
        <Card accent="danger">
          <div className="flex items-center gap-3">
            <IconBadge accent="danger" size={40}>
              <Bug size={18} />
            </IconBadge>
            <div>
              <div className="text-sm font-medium">No fatal errors recorded</div>
              <div className="text-[11px] text-muted-foreground">boot guard reports a clean session</div>
            </div>
          </div>
        </Card>

        <section>
          <SectionHeader title="environment" accent="system" />
          <div className="space-y-2">
            <Row title="App build" sub="shell · v6-unified" right={<Chip accent="system">web</Chip>} />
            <Row title="Bridge" sub="butler_server.py" right={<Chip accent="warn">unknown</Chip>} />
            <Row title="Session" sub="started —" right={<Chip accent="ok">clean</Chip>} />
          </div>
        </section>

        <section>
          <SectionHeader title="stack trace" accent="danger" />
          <EmptyState
            title="empty"
            body="If a crash happens, the full stack trace appears here for you to copy manually."
            icon={<Bug size={28} />}
          />
        </section>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton variant="ghost">
            <Copy size={16} /> Copy
          </ActionButton>
          <ActionButton variant="danger">
            <Send size={16} /> Share
          </ActionButton>
        </div>
      </main>
    </div>
  );
}

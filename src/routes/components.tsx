import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Zap, Bot } from "lucide-react";
import {
  ActionButton,
  Card,
  Chip,
  EmptyState,
  IconBadge,
  ProgressBar,
  Row,
  SectionHeader,
  Skeleton,
  StatTile,
  Toggle,
  SkeletonRow,
  SkeletonCard,
  LoadingStrip,
} from "@/components/nexus/ui";

export const Route = createFileRoute("/components")({
  head: () => ({
    meta: [
      { title: "Component Kit — Butler AI NEXUS" },
      { name: "description", content: "Every NEXUS UI primitive in one place: cards, chips, tiles, rows, skeletons and buttons." },
      { property: "og:title", content: "Component Kit — NEXUS" },
      { property: "og:description", content: "The full NEXUS design-system inventory." },
    ],
  }),
  component: Kit,
});

const ACCENTS = ["cyan", "ok", "warn", "danger", "neural", "system", "net"] as const;

function Kit() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-dim bg-surface/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-1 label-mono text-muted-foreground hover:text-cyan">
          <ChevronLeft size={14} /> home
        </Link>
        <h1 className="mt-2 font-mono text-base font-bold tracking-widest">COMPONENT KIT</h1>
        <p className="text-[11px] text-muted-foreground">nexus design system inventory</p>
      </header>

      <main className="flex-1 space-y-6 nexus-grid px-4 py-5">
        <section>
          <SectionHeader title="accents" hint="Seven semantic colours" />
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <Chip key={a} accent={a} dot>
                {a}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="icon badges" accent="neural" />
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <IconBadge key={a} accent={a}>
                <Zap size={16} />
              </IconBadge>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="stat tiles" accent="system" />
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="loaded" value="128" unit="mb" accent="cyan" sub="example value" />
            <StatTile label="pending" value="—" accent="warn" sub="no data yet" />
          </div>
        </section>

        <section>
          <SectionHeader title="rows" />
          <div className="space-y-2">
            <Row title="With toggle" sub="settings row" left={<IconBadge accent="cyan" size={32}><Bot size={14} /></IconBadge>} right={<Toggle on />} />
            <Row title="With chip" sub="status row" left={<IconBadge accent="ok" size={32}><Bot size={14} /></IconBadge>} right={<Chip accent="ok">ok</Chip>} />
          </div>
        </section>

        <section>
          <SectionHeader title="progress" accent="net" />
          <Card className="space-y-3">
            <ProgressBar value={72} />
            <ProgressBar value={40} accent="neural" />
            <ProgressBar value={12} accent="danger" />
          </Card>
        </section>

        <section>
          <SectionHeader title="loading" accent="warn" />
          <Card className="space-y-2">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </Card>
        </section>

        <section>
          <SectionHeader title="empty state" />
          <EmptyState title="nothing here" body="Empty states always say what would appear and why it is missing." icon={<Bot size={28} />} />
        </section>

        <section>
          <SectionHeader title="buttons" accent="cyan" />
          <div className="space-y-3">
            <ActionButton className="w-full">Primary</ActionButton>
            <ActionButton variant="ghost" className="w-full">Ghost</ActionButton>
            <ActionButton variant="danger" className="w-full">Destructive</ActionButton>
          </div>
        </section>

        <section>
          <SectionHeader title="loading states" accent="cyan" />
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonCard rows={1} />
            <LoadingStrip />
          </div>
        </section>

        <section>
          <SectionHeader title="connection" accent="warn" />
          <div className="overflow-hidden rounded-xl border border-dim">
            <OfflineBanner online={false} />
          </div>
        </section>

        <section>
          <SectionHeader title="surfaces" accent="system" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-dim bg-background p-4 text-center label-mono text-muted-foreground">bg</div>
            <div className="rounded-xl border border-dim bg-surface p-4 text-center label-mono text-muted-foreground">surface</div>
            <div className="rounded-xl border border-dim bg-surface-2 p-4 text-center label-mono text-muted-foreground">surface 2</div>
            <div className="rounded-xl border border-dim bg-surface-3 p-4 text-center label-mono text-muted-foreground">surface 3</div>
          </div>
        </section>
      </main>
    </div>
  );
}

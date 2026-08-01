import { createFileRoute, Link } from "@tanstack/react-router";
import {
  SlidersHorizontal,
  ShieldCheck,
  FileText,
  Bell,
  Trash2,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Bug,
} from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, Row, SectionHeader, Toggle, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Butler AI NEXUS" },
      {
        name: "description",
        content: "Device pairing, permissions, notifications, legal documents and data controls.",
      },
      { property: "og:title", content: "Settings — NEXUS" },
      { property: "og:description", content: "Full control over what Butler AI is allowed to do." },
    ],
  }),
  component: Settings,
});

const LEGAL = [
  { t: "Privacy Policy", to: "/privacy-policy" as const },
  { t: "Terms of Service", to: "/terms" as const },
  { t: "Data Safety", to: "/data-safety" as const },
  { t: "Security & Trust", to: "/security-trust" as const },
  { t: "Crash Report", to: "/crash-report" as const },
];

function Settings() {
  return (
    <AppShell title="CONFIG" subtitle="device & privacy controls" accentLabel="v6">
      <section>
        <SectionHeader title="paired device" accent="ok" />
        <Card accent="ok">
          <div className="flex items-center gap-3">
            <IconBadge accent="ok" size={40}>
              <Smartphone size={18} />
            </IconBadge>
            <div className="min-w-0">
              <div className="font-mono text-sm">DESKTOP-A9F2</div>
              <div className="text-[11px] text-muted-foreground">paired · local key stored on device</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Chip accent="ok" dot>trusted</Chip>
            <Chip accent="net">lan</Chip>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="permissions" hint="Only three, all revocable" />
        <div className="space-y-2">
          <Row title="Camera" sub="QR scan only" left={<IconBadge accent="cyan" size={32}><ShieldCheck size={14} /></IconBadge>} right={<Toggle on />} />
          <Row title="Local network" sub="LAN discovery" left={<IconBadge accent="net" size={32}><ShieldCheck size={14} /></IconBadge>} right={<Toggle on />} />
          <Row title="Storage" sub="Opt-in file transfer" left={<IconBadge accent="warn" size={32}><ShieldCheck size={14} /></IconBadge>} right={<Toggle />} />
        </div>
      </section>

      <section>
        <SectionHeader title="notifications" accent="system" />
        <div className="space-y-2">
          <Row title="Connection alerts" sub="When the bridge drops" left={<IconBadge accent="system" size={32}><Bell size={14} /></IconBadge>} right={<Toggle on />} />
          <Row title="Script results" sub="On completion or failure" left={<IconBadge accent="neural" size={32}><Bell size={14} /></IconBadge>} right={<Toggle on />} />
          <Row title="Haptics" sub="Feedback on actions" left={<IconBadge accent="cyan" size={32}><SlidersHorizontal size={14} /></IconBadge>} right={<Toggle />} />
        </div>
      </section>

      <section>
        <SectionHeader title="legal" accent="neural" />
        <div className="space-y-2">
          {LEGAL.map((l) => (
            <Link key={l.to} to={l.to}>
              <Row
                title={l.t}
                left={<IconBadge accent="neural" size={32}>{l.t === "Crash Report" ? <Bug size={14} /> : <FileText size={14} />}</IconBadge>}
                right={<ChevronRight size={16} className="text-faint" />}
              />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="data" accent="danger" />
        <div className="space-y-3">
          <Link to="/onboarding" className="block">
            <ActionButton variant="ghost" className="w-full">
              <RotateCcw size={16} /> Replay tutorial
            </ActionButton>
          </Link>
          <ActionButton variant="danger" className="w-full">
            <Trash2 size={16} /> Erase local data
          </ActionButton>
        </div>
      </section>

      <p className="pb-2 text-center text-[10px] text-faint">
        Butler AI NEXUS · shell build · no data leaves your LAN
      </p>
    </AppShell>
  );
}

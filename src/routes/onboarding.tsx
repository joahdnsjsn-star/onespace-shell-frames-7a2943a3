import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Rocket,
  LayoutDashboard,
  ShieldCheck,
  AlertOctagon,
  FileText,
  Lock,
  MessageCircleQuestion,
  Server,
  QrCode,
  Check,
  ChevronRight,
} from "lucide-react";
import { Card, Chip, IconBadge, ProgressBar, Row, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Butler AI NEXUS" },
      {
        name: "description",
        content: "Ten-step init sequence: tour, agreements, permissions, server setup and QR pairing.",
      },
      { property: "og:title", content: "Butler AI NEXUS onboarding" },
      { property: "og:description", content: "Ten-step init sequence for pairing your phone with your PC." },
    ],
  }),
  component: Onboarding,
});

const STEPS = [
  {
    label: "WELCOME",
    title: "BUTLER AI",
    sub: "Your Local PC Command Centre",
    tip: "Swipe left/right or tap NEXT. 10 steps total — skip any time.",
    icon: Rocket,
    accent: "cyan" as const,
  },
  {
    label: "APP TOUR",
    title: "NINE POWERFUL TABS",
    sub: "Every tool at your fingertips",
    tip: "Each tab is a separate superpower. Explore them all from HOME.",
    icon: LayoutDashboard,
    accent: "system" as const,
  },
  {
    label: "AGREEMENTS",
    title: "ALL REQUIRED",
    sub: "Six binding checkboxes",
    tip: "Every checkbox is a real agreement — read before ticking.",
    icon: ShieldCheck,
    accent: "ok" as const,
  },
  {
    label: "RULES",
    title: "BINDING RULES",
    sub: "Protects you legally",
    tip: "These six rules protect you legally. Violations void your licence.",
    icon: AlertOctagon,
    accent: "warn" as const,
  },
  {
    label: "LEGAL",
    title: "LEGAL DOCS",
    sub: "Required by Google Play",
    tip: "Tap any card to read the full document.",
    icon: FileText,
    accent: "neural" as const,
  },
  {
    label: "PERMISSIONS",
    title: "ONLY 3",
    sub: "Camera · Network · Storage",
    tip: "Camera = QR scan only. Network = LAN only. Storage = opt-in.",
    icon: Lock,
    accent: "cyan" as const,
  },
  {
    label: "FAQ",
    title: "QUICK ANSWERS",
    sub: "100% honest",
    tip: "Tap any question to expand it.",
    icon: MessageCircleQuestion,
    accent: "system" as const,
  },
  {
    label: "SERVER",
    title: "LOCAL SERVER",
    sub: "butler_server.py on YOUR PC",
    tip: "We host zero servers. Everything stays on your LAN.",
    icon: Server,
    accent: "net" as const,
  },
  {
    label: "PAIRING",
    title: "PAIR IN 60s",
    sub: "GitHub → install → run → scan QR",
    tip: "Most users are done in 90 seconds.",
    icon: QrCode,
    accent: "ok" as const,
  },
  {
    label: "FINISH",
    title: "ALL SYSTEMS GO",
    sub: "Enter your Nexus command centre",
    tip: "Tap any tab icon to start.",
    icon: Rocket,
    accent: "cyan" as const,
  },
];

const AGREEMENTS = [
  "I understand Butler AI executes commands on my own PC",
  "I accept the End User Licence Agreement",
  "I accept the Privacy Policy and Data Safety statement",
  "I will only pair devices I personally own",
  "I understand no data is sent to third-party servers",
  "I accept that misuse voids my licence",
];

function Onboarding() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-dim bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="label-mono text-cyan">init sequence</span>
          <Link to="/" className="label-mono text-muted-foreground hover:text-cyan">
            skip
          </Link>
        </div>
        <div className="mt-3">
          <ProgressBar value={10} />
        </div>
        <div className="mt-2 flex gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s.label}
              className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-cyan" : "bg-surface-3"}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 space-y-6 nexus-grid px-4 py-6">
        {STEPS.map((s, i) => (
          <Card key={s.label} accent={s.accent} className="scanline">
            <div className="flex items-center gap-3">
              <IconBadge accent={s.accent} size={52} glow={i === 0}>
                <s.icon size={24} />
              </IconBadge>
              <div className="min-w-0">
                <div className="label-mono text-muted-foreground">
                  step {String(i + 1).padStart(2, "0")} · {s.label}
                </div>
                <h2 className="font-mono text-lg font-bold tracking-wide">{s.title}</h2>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </div>

            <p className="mt-3 rounded-lg border border-dim/60 bg-surface-3/60 p-3 text-xs text-muted-foreground">
              {s.tip}
            </p>

            {i === 2 ? (
              <div className="mt-3 space-y-2">
                {AGREEMENTS.map((a) => (
                  <div
                    key={a}
                    className="flex items-start gap-3 rounded-lg border border-dim/50 bg-surface-3/60 p-3"
                  >
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-cyan/40 bg-cyan/10 text-cyan">
                      <Check size={12} />
                    </span>
                    <span className="text-xs leading-relaxed">{a}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {i === 4 ? (
              <div className="mt-3 space-y-2">
                {[
                  { t: "Privacy Policy", to: "/privacy-policy" as const },
                  { t: "Terms of Service", to: "/terms" as const },
                  { t: "Data Safety", to: "/data-safety" as const },
                  { t: "Security & Trust", to: "/security-trust" as const },
                ].map((d) => (
                  <Link key={d.to} to={d.to}>
                    <Row
                      title={d.t}
                      sub="Tap to read the full document"
                      left={
                        <IconBadge accent="neural" size={32}>
                          <FileText size={14} />
                        </IconBadge>
                      }
                      right={<ChevronRight size={16} className="text-faint" />}
                    />
                  </Link>
                ))}
              </div>
            ) : null}

            {i === 5 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip accent="cyan">camera · qr only</Chip>
                <Chip accent="net">network · lan only</Chip>
                <Chip accent="warn">storage · opt-in</Chip>
              </div>
            ) : null}

            {i === 8 ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-cyan/30 bg-surface-3/50 p-6">
                <div className="grid size-32 place-items-center rounded-lg border border-cyan/30 bg-background text-faint">
                  <QrCode size={72} strokeWidth={1} />
                </div>
                <span className="label-mono text-muted-foreground">awaiting server qr</span>
              </div>
            ) : null}
          </Card>
        ))}
      </main>

      <footer className="sticky bottom-0 border-t border-dim bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-3">
          <ActionButton variant="ghost" className="flex-1">
            Back
          </ActionButton>
          <Link to="/" className="flex-1">
            <ActionButton className="w-full">Next</ActionButton>
          </Link>
        </div>
      </footer>
    </div>
  );
}

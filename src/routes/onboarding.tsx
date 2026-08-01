import { useEffect, useRef, useState } from "react";
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
import { butlerSay } from "@/lib/voice";
import mascotArt from "@/assets/butler-mascot.png.asset.json";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "Ten-step init sequence: tour, agreements, permissions, server setup and QR pairing.",
      },
      { property: "og:title", content: "Butler AI NEXUS onboarding" },
      {
        property: "og:description",
        content: "Ten-step init sequence for pairing your phone with your PC.",
      },
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
    sub: "Seven binding checkboxes",
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
  "I confirm I am 18 years or older and understand this is a remote administration tool",
  "I understand Butler AI executes real commands on my own PC, and that every command needs a manual tap — nothing runs automatically",
  "I accept the End User Licence Agreement",
  "I accept the Privacy Policy and Data Safety statement",
  "I will only pair devices I personally own or am authorised to administer",
  "I understand no data is sent to third-party servers — only to the PC I pair with",
  "I accept that misuse voids my licence",
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(() => AGREEMENTS.map(() => false));
  const s = STEPS[step]!;
  const Icon = s.icon;
  const allAgreed = checked.every(Boolean);
  const blocked = step === 2 && !allAgreed;
  const last = step === STEPS.length - 1;

  const go = (dir: 1 | -1) => setStep((v) => Math.min(STEPS.length - 1, Math.max(0, v + dir)));

  // Horizontal swipe between steps — the welcome copy promises it, so it ships.
  // Blocked steps (agreements) can still be swiped backwards, never forwards.
  const swipeX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    swipeX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeX.current;
    swipeX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start == null || end == null) return;
    const dx = end - start;
    if (Math.abs(dx) < 56) return;
    if (dx < 0 && !blocked && !last) go(1);
    if (dx > 0) go(-1);
  };

  // Remember that the walkthrough was completed so the shell can stop nagging.
  useEffect(() => {
    if (!last) return;
    try {
      window.localStorage.setItem("nexus:onboarded", "1");
    } catch {
      /* storage blocked — harmless */
    }
  }, [last]);

  // Butler narrates every step — spoken when voice is on, always captioned.
  const spoken = useRef(-1);
  useEffect(() => {
    if (spoken.current === step) return;
    spoken.current = step;
    const t = window.setTimeout(
      () => {
        butlerSay(step === 0 ? `Welcome aboard. I'm Butler. ${s.tip}` : `${s.title}. ${s.tip}`, {
          tone: step === 3 ? "warn" : "info",
          label: s.label,
          hold: 2600,
        });
      },
      step === 0 ? 900 : 220,
    );
    return () => window.clearTimeout(t);
  }, [step, s.tip, s.title, s.label]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background sm:max-w-xl lg:max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-dim bg-surface/95 px-4 py-3 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="label-mono text-cyan">
            init sequence · {String(step + 1).padStart(2, "0")}/{STEPS.length}
          </span>
          <Link to="/" className="label-mono text-muted-foreground hover:text-cyan">
            skip
          </Link>
        </div>
        <div className="mt-3">
          <ProgressBar value={((step + 1) / STEPS.length) * 100} />
        </div>
        <div className="mt-2 flex gap-1">
          {STEPS.map((t, i) => (
            <button
              key={t.label}
              type="button"
              aria-label={`Go to step ${i + 1}: ${t.label}`}
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-cyan" : "bg-surface-3"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="nexus-grid flex-1 px-4 py-6">
        <Card key={s.label} accent={s.accent} className="scanline rise-in">
          <div className="flex items-center gap-3">
            <IconBadge accent={s.accent} size={52} glow>
              <Icon size={24} />
            </IconBadge>
            <div className="min-w-0">
              <div className="label-mono text-muted-foreground">
                step {String(step + 1).padStart(2, "0")} · {s.label}
              </div>
              <h1 className="font-mono text-lg font-bold tracking-wide text-balance">{s.title}</h1>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          </div>

          {step === 0 ? (
            <div className="relative mt-3 flex items-end justify-center overflow-hidden rounded-xl border border-dim/60 bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_oklch,var(--color-cyan)_18%,transparent),transparent_70%)]">
              <div className="pointer-events-none absolute inset-0 scanline opacity-40" />
              <img
                src={mascotArt.url}
                alt="Butler AI robot mascot"
                loading="lazy"
                className="rise-in relative h-[clamp(140px,34vw,220px)] w-auto object-contain drop-shadow-[0_0_28px_color-mix(in_oklch,var(--color-cyan)_35%,transparent)]"
              />
            </div>
          ) : null}

          <p className="mt-3 rounded-lg border border-dim/60 bg-surface-3/60 p-3 text-xs leading-relaxed text-muted-foreground">
            {s.tip}
          </p>

          {step === 2 ? (
            <div className="mt-3 space-y-2">
              {AGREEMENTS.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))}
                  className="press flex w-full items-start gap-3 rounded-lg border border-dim/50 bg-surface-3/60 p-3 text-left"
                >
                  <span
                    className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      checked[i]
                        ? "border-ok/50 bg-ok/20 text-ok"
                        : "border-dim bg-surface-2 text-transparent"
                    }`}
                  >
                    <Check size={12} />
                  </span>
                  <span className="text-xs leading-relaxed">{a}</span>
                </button>
              ))}
              {!allAgreed ? (
                <p className="label-mono text-warn">accept all six to continue</p>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
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

          {step === 5 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip accent="cyan">camera · qr only</Chip>
              <Chip accent="net">network · lan only</Chip>
              <Chip accent="warn">storage · opt-in</Chip>
            </div>
          ) : null}

          {step === 8 ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-cyan/30 bg-surface-3/50 p-6">
              <div className="grid size-32 place-items-center rounded-lg border border-cyan/30 bg-background text-faint">
                <QrCode size={72} strokeWidth={1} />
              </div>
              <span className="label-mono text-muted-foreground">awaiting server qr</span>
            </div>
          ) : null}
        </Card>
      </main>

      <footer className="sticky bottom-0 border-t border-dim bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex gap-3">
          <ActionButton
            variant="ghost"
            className="flex-1"
            onClick={() => go(-1)}
            disabled={step === 0}
          >
            Back
          </ActionButton>
          {last ? (
            <Link to="/" className="flex-1">
              <ActionButton className="w-full">Enter NEXUS</ActionButton>
            </Link>
          ) : (
            <ActionButton className="flex-1" onClick={() => go(1)} disabled={blocked}>
              Next
            </ActionButton>
          )}
        </div>
      </footer>
    </div>
  );
}

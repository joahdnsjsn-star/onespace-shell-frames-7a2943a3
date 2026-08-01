import { createFileRoute } from "@tanstack/react-router";
import { Palette, Type, Sparkles, Waves, Check } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, Row, SectionHeader, Toggle, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/cosmetic")({
  head: () => ({
    meta: [
      { title: "Appearance — Butler AI NEXUS" },
      {
        name: "description",
        content: "Accent themes, HUD density, motion presets and typography for the NEXUS interface.",
      },
      { property: "og:title", content: "Appearance — NEXUS" },
      { property: "og:description", content: "Tune the look of your command centre." },
    ],
  }),
  component: Cosmetic,
});

const ACCENTS = [
  { name: "cyan", cls: "bg-cyan" },
  { name: "green", cls: "bg-ok" },
  { name: "amber", cls: "bg-warn" },
  { name: "red", cls: "bg-danger" },
  { name: "purple", cls: "bg-neural" },
  { name: "blue", cls: "bg-system" },
  { name: "teal", cls: "bg-net" },
];

function Cosmetic() {
  return (
    <AppShell title="SKIN" subtitle="appearance & motion" accentLabel="nexus v1">
      <section>
        <SectionHeader title="accent" hint="Primary interactive colour" />
        <Card>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a, i) => (
              <span
                key={a.name}
                className={`grid size-10 place-items-center rounded-full ${a.cls} ${
                  i === 0 ? "ring-2 ring-cyan ring-offset-2 ring-offset-surface-2" : "opacity-70"
                }`}
              >
                {i === 0 ? <Check size={16} className="text-primary-foreground" /> : null}
              </span>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="hud preview" accent="neural" />
        <Card accent="cyan" className="scanline">
          <div className="flex items-center gap-3">
            <IconBadge accent="cyan" size={44} glow>
              <Sparkles size={20} />
            </IconBadge>
            <div>
              <div className="font-mono text-sm font-bold tracking-widest">NEXUS CORE</div>
              <div className="text-[11px] text-muted-foreground">preview of current theme</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Chip accent="ok" dot>online</Chip>
            <Chip accent="warn">pending</Chip>
            <Chip accent="danger">alert</Chip>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="density" />
        <div className="grid grid-cols-3 gap-3">
          {["Compact", "Standard", "Roomy"].map((d, i) => (
            <div
              key={d}
              className={`rounded-xl border px-3 py-4 text-center text-xs ${
                i === 1 ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-dim bg-surface-2 text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="effects" accent="system" />
        <div className="space-y-2">
          <Row
            title="Scanline overlay"
            sub="Animated HUD sweep"
            left={<IconBadge accent="cyan" size={32}><Waves size={14} /></IconBadge>}
            right={<Toggle on />}
          />
          <Row
            title="Circuit grid"
            sub="Background lattice"
            left={<IconBadge accent="net" size={32}><Palette size={14} /></IconBadge>}
            right={<Toggle on />}
          />
          <Row
            title="Monospace headings"
            sub="Terminal typography"
            left={<IconBadge accent="neural" size={32}><Type size={14} /></IconBadge>}
            right={<Toggle on />}
          />
          <Row
            title="Reduced motion"
            sub="Disable pulses and sweeps"
            left={<IconBadge accent="warn" size={32}><Sparkles size={14} /></IconBadge>}
            right={<Toggle />}
          />
        </div>
      </section>

      <ActionButton className="w-full">Apply theme</ActionButton>
    </AppShell>
  );
}

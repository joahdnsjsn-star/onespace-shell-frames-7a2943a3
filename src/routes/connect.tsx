import { createFileRoute } from "@tanstack/react-router";
import { Server, QrCode, Wifi, RefreshCw, ShieldCheck, Radar, Github, Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import serverAsset from "@/assets/butler_server.py.asset.json";
import { fx } from "@/lib/fx";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, Row, SectionHeader, StatTile, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Pair & Connect — Butler AI NEXUS" },
      {
        name: "description",
        content: "Scan the server QR, discover machines on your LAN and manage the encrypted bridge.",
      },
      { property: "og:title", content: "Pair & Connect — NEXUS" },
      { property: "og:description", content: "Pair your phone with butler_server.py in under 60 seconds." },
    ],
  }),
  component: Connect,
});

function CopyCommand() {
  const [done, setDone] = useState(false);
  return (
    <ActionButton
      variant="ghost"
      onClick={() => {
        void navigator.clipboard?.writeText("python butler_server.py");
        fx.select();
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Check size={16} /> : <Copy size={16} />} {done ? "Copied" : "Copy run cmd"}
    </ActionButton>
  );
}

function Connect() {
  return (
    <AppShell title="LINK" subtitle="pairing & transport" accentLabel="lan only">
      <section>
        <Card accent="net" className="flex flex-col items-center gap-4 scanline">
          <div className="grid size-44 place-items-center rounded-xl border border-net/30 bg-background text-faint">
            <QrCode size={110} strokeWidth={0.9} />
          </div>
          <div className="text-center">
            <div className="label-mono text-net">scan server qr</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown in the butler_server.py terminal on your PC.
            </p>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatTile label="latency" value="—" unit="ms" accent="ok" />
        <StatTile label="protocol" value="ws" accent="net" sub="tls on lan" />
        <StatTile label="tier" value="—" accent="warn" sub="remote access" />
        <StatTile label="device id" value="—" accent="system" sub="local only" />
      </section>

      <section>
        <SectionHeader title="discovered hosts" accent="net" action={<Radar size={14} className="text-faint" />} />
        <div className="space-y-2">
          {["DESKTOP-A9F2", "MEDIA-NUC", "WORKSTATION-02"].map((h) => (
            <Row
              key={h}
              title={<span className="font-mono text-xs">{h}</span>}
              sub="192.168.1.— · port 8770"
              left={
                <IconBadge accent="net" size={34}>
                  <Server size={16} />
                </IconBadge>
              }
              right={<Chip accent="warn">idle</Chip>}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="transport" accent="cyan" />
        <div className="space-y-2">
          <Row
            title="Wi-Fi LAN"
            sub="Preferred channel"
            left={
              <IconBadge accent="cyan" size={34}>
                <Wifi size={16} />
              </IconBadge>
            }
            right={<Chip accent="ok" dot>ready</Chip>}
          />
          <Row
            title="Encryption"
            sub="Key exchange on pairing"
            left={
              <IconBadge accent="ok" size={34}>
                <ShieldCheck size={16} />
              </IconBadge>
            }
            right={<Chip accent="ok">aes</Chip>}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="server bundle" accent="system" />
        <Card accent="system">
          <Row
            title="butler_server.py"
            sub={`${(serverAsset.size / 1_048_576).toFixed(2)} MB · python 3.10+ · runs on your PC`}
            left={
              <IconBadge accent="system" size={34}>
                <Server size={16} />
              </IconBadge>
            }
            right={<Chip accent="ok">v6</Chip>}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton
              as="a"
              href={serverAsset.url}
              download="butler_server.py"
              onClick={() => fx.success()}
            >
              <Download size={16} /> Download
            </ActionButton>
            <CopyCommand />
          </div>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-dim/60 bg-background p-3 font-mono text-[11px] text-muted-foreground">
{`python butler_server.py
# QR + pairing code print in the terminal`}
          </pre>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Github size={14} className="text-cyan" /> No web console — the bridge is terminal-only and
            LAN-scoped. This app is the only UI.
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton variant="ghost">
          <RefreshCw size={16} /> Rescan
        </ActionButton>
        <ActionButton>
          <QrCode size={16} /> Scan QR
        </ActionButton>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Server, QrCode, Wifi, RefreshCw, ShieldCheck, Radar, Github, Download, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  checkHealth,
  forgetBridge,
  isLocalBridgeUrl,
  loadBridge,
  saveBridge,
  type HealthReport,
} from "@/lib/butler-bridge";
import { useBridge } from "@/lib/useBridge";
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


/**
 * The real pairing surface. Everything typed here is written to the encrypted
 * vault, and the address is refused unless it is on the local network.
 */
function PairingPanel() {
  const { status, lastError, paired, refresh } = useBridge();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    void loadBridge().then((cfg) => {
      setUrl(cfg.baseUrl);
      setToken(cfg.token);
      setDeviceId(cfg.deviceId);
    });
  }, []);

  const valid = url.trim().length > 0 && isLocalBridgeUrl(url.trim());

  const connect = () => {
    if (!valid || busy) return;
    setBusy(true);
    setNote("");
    fx.select();
    void saveBridge({ baseUrl: url, token })
      .then(() => checkHealth())
      .then((h) => {
        setHealth(h);
        setNote(h.ollama ? "Linked — local model ready." : "Linked — Ollama not detected on the PC yet.");
        fx.success();
      })
      .catch((err: unknown) => setNote((err as Error).message))
      .finally(() => setBusy(false));
  };

  const unpair = () => {
    void forgetBridge().then(() => {
      setToken("");
      setHealth(null);
      setNote("Bridge forgotten. Credentials wiped from this device.");
      refresh();
    });
  };

  return (
    <Card accent="net" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="label-mono text-net">pair with your pc</div>
        <Chip accent={status === "online" ? "ok" : paired ? "warn" : "danger"} dot>
          {status === "online" ? "online" : paired ? "offline" : "not paired"}
        </Chip>
      </div>

      <label className="block space-y-1">
        <span className="label-mono text-[10px] text-faint">bridge address</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="http://192.168.1.20:8770"
          className="w-full rounded-xl border border-dim bg-surface-2 px-3 py-2.5 font-mono text-xs outline-none focus:border-net/60"
        />
      </label>

      <label className="block space-y-1">
        <span className="label-mono text-[10px] text-faint">pairing token</span>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="printed in the server terminal"
          className="w-full rounded-xl border border-dim bg-surface-2 px-3 py-2.5 font-mono text-xs outline-none focus:border-net/60"
        />
      </label>

      {url && !valid ? (
        <p className="text-[11px] text-danger">
          Only local addresses are allowed (192.168.x, 10.x, 172.16–31.x, *.local or localhost).
        </p>
      ) : null}
      {note || lastError ? (
        <p className="text-[11px] text-muted-foreground">{note || lastError}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <ActionButton variant="ghost" onClick={unpair}>
          <ShieldCheck size={16} /> Unpair
        </ActionButton>
        <ActionButton onClick={connect} disabled={!valid || busy}>
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> {busy ? "Linking…" : "Link"}
        </ActionButton>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <StatTile label="server" value={health?.version ?? "—"} accent={health ? "ok" : "warn"} sub="butler_server" />
        <StatTile
          label="model"
          value={health?.model ?? (health?.ollama ? "ready" : "—")}
          accent={health?.ollama ? "neural" : "warn"}
          sub="ollama · local"
        />
        <StatTile label="transport" value="lan" accent="net" sub="no cloud relay" />
        <StatTile label="device id" value={deviceId ? deviceId.slice(0, 8) : "—"} accent="system" sub="local only" />
      </div>
    </Card>
  );
}

function Connect() {
  return (
    <AppShell title="LINK" subtitle="pairing & transport" accentLabel="lan only">
      <section>
        <PairingPanel />
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

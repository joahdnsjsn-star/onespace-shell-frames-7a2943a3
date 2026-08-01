import { createFileRoute } from "@tanstack/react-router";
import { Server, QrCode, Wifi, RefreshCw, ShieldCheck, Radar, Github, Download, Copy, Check, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  checkHealth,
  forgetBridge,
  isLocalBridgeUrl,
  loadBridge,
  saveBridge,
  type HealthReport,
} from "@/lib/butler-bridge";
import { parseConnection, rememberGoodHost, scanLan, toBaseUrl, type FoundHost, type ScanProgress } from "@/lib/discovery";
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
 * Auto-discovery. Sweeps the LAN for a listening butler server so pairing needs
 * no typing at all — last-known address and its DHCP neighbours first, then the
 * common private subnets. Cancellable, and every candidate is re-validated
 * against the private-network guard before a request is made.
 */
function DiscoveryPanel({ onLinked }: { onLinked: () => void }) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const start = () => {
    if (busy) return;
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    setNote("");
    fx.select();
    void scanLan(setProgress, ctrl.signal)
      .then((hosts) => {
        setNote(hosts.length ? `${hosts.length} host(s) answered.` : "No server answered. Is butler_server.py running?");
        if (hosts.length) fx.success();
      })
      .catch((err: unknown) => setNote((err as Error).message))
      .finally(() => setBusy(false));
  };

  const stop = () => {
    abort.current?.abort();
    setBusy(false);
    setNote("Sweep cancelled.");
  };

  const use = (h: FoundHost) => {
    fx.select();
    void saveBridge({ baseUrl: `http://${h.ip}:${h.port}` })
      .then(() => rememberGoodHost(`http://${h.ip}:${h.port}`))
      .then(onLinked);
  };

  const pct = progress && progress.total ? Math.min(100, Math.round((progress.scanned / progress.total) * 100)) : 0;
  const hosts = progress?.found ?? [];

  return (
    <Card accent="net" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="label-mono text-net">auto-discovery</div>
        <Chip accent={busy ? "warn" : hosts.length ? "ok" : "system"} dot={busy}>
          {busy ? (progress?.phase === "known" ? "probing known" : "sweeping lan") : `${hosts.length} found`}
        </Chip>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-net transition-[width] duration-200"
          style={{ width: `${busy || pct === 100 ? pct : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {hosts.length ? (
          hosts.map((h) => (
            <Row
              key={`${h.ip}:${h.port}`}
              title={<span className="font-mono text-xs">{h.ip}</span>}
              sub={`port ${h.port} · ${h.latencyMs}ms${h.version ? ` · v${h.version}` : ""}${h.ollama ? " · ollama" : ""}`}
              left={
                <IconBadge accent="net" size={34}>
                  <Server size={16} />
                </IconBadge>
              }
              right={
                <button
                  type="button"
                  onClick={() => use(h)}
                  className="rounded-lg border border-net/40 px-2.5 py-1 text-[11px] font-semibold text-net active:scale-95"
                >
                  use
                </button>
              }
            />
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {busy
              ? `Probed ${progress?.scanned ?? 0} of ${progress?.total ?? 0} candidates…`
              : "Run a sweep to find your PC automatically — nothing leaves the local network."}
          </p>
        )}
      </div>

      {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <ActionButton variant="ghost" onClick={stop} disabled={!busy}>
          <X size={16} /> Stop
        </ActionButton>
        <ActionButton onClick={start} disabled={busy}>
          <Radar size={16} className={busy ? "animate-spin" : ""} /> {busy ? "Scanning…" : "Scan LAN"}
        </ActionButton>
      </div>
    </Card>
  );
}

/**
 * The real pairing surface. Everything typed here is written to the encrypted
 * vault, and the address is refused unless it is on the local network.
 */
function PairingPanel({ reloadKey }: { reloadKey: number }) {
  const { status, lastError, paired, refresh } = useBridge();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [paste, setPaste] = useState("");

  useEffect(() => {
    void loadBridge().then((cfg) => {
      setUrl(cfg.baseUrl);
      setToken(cfg.token);
      setDeviceId(cfg.deviceId);
    });
  }, [reloadKey]);

  /** Accepts the QR payload, a deep link, or a raw terminal line. */
  const importString = () => {
    const parsed = parseConnection(paste);
    if (!parsed) {
      setNote("Could not read an address from that text.");
      fx.warn();
      return;
    }
    setUrl(toBaseUrl(parsed));
    if (parsed.token) setToken(parsed.token);
    setPaste("");
    setNote(`Imported ${parsed.ip}${parsed.port ? `:${parsed.port}` : ""}${parsed.token ? " with token" : ""}.`);
    fx.success();
  };



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
        <span className="label-mono text-[10px] text-faint">paste qr / terminal line</span>
        <div className="flex gap-2">
          <input
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder='{"ip":"192.168.1.20","port":8770,…}'
            className="min-w-0 flex-1 rounded-xl border border-dim bg-surface-2 px-3 py-2.5 font-mono text-xs outline-none focus:border-net/60"
          />
          <button
            type="button"
            onClick={importString}
            disabled={!paste.trim()}
            className="shrink-0 rounded-xl border border-net/40 px-3 text-[11px] font-semibold text-net active:scale-95 disabled:opacity-40"
          >
            <Zap size={14} className="inline" /> read
          </button>
        </div>
      </label>

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
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <AppShell title="LINK" subtitle="pairing & transport" accentLabel="lan only">
      <section>
        <PairingPanel reloadKey={reloadKey} />
      </section>

      <section>
        <SectionHeader title="discovered hosts" accent="net" action={<Radar size={14} className="text-faint" />} />
        <DiscoveryPanel onLinked={() => setReloadKey((k) => k + 1)} />
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

      <p className="px-1 pb-1 text-[11px] text-muted-foreground">
        <QrCode size={13} className="mr-1 inline text-cyan" />
        No camera needed — paste the QR payload above, or let the LAN sweep find the machine for you.
      </p>

    </AppShell>
  );
}

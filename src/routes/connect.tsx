import { createFileRoute } from "@tanstack/react-router";
import { Server, QrCode, Wifi, RefreshCw, ShieldCheck, Radar, Github, Download, Copy, Check, X, Zap, Activity } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  checkHealth,
  forgetBridge,
  isLocalBridgeUrl,
  loadBridge,
  pairWithServer,
  saveBridge,
  type HealthReport,
} from "@/lib/butler-bridge";
import { parseConnection, rememberGoodHost, scanLan, toBaseUrl, type FoundHost, type ScanProgress } from "@/lib/discovery";
import { useBridge } from "@/lib/useBridge";
import { useLink } from "@/lib/useLink";
import serverAsset from "@/assets/butler_server.py.asset.json";
import { QrScanner } from "@/components/nexus/QrScanner";
import { networkMonitor } from "@/lib/netmon";
import { neuralTripwire, type TripwireState } from "@/lib/tripwire";
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
  const link = useLink();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [paste, setPaste] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    void loadBridge().then((cfg) => {
      setUrl(cfg.baseUrl);
      setToken(cfg.token);
      setDeviceId(cfg.deviceId);
    });
  }, [reloadKey]);

  /** Accepts the QR payload, a deep link, or a raw terminal line. */
  const importText = (text: string) => {
    const parsed = parseConnection(text);
    if (!parsed) {
      setNote("Could not read an address from that text.");
      fx.warn();
      return;
    }
    setUrl(toBaseUrl(parsed));
    if (parsed.token) setToken(parsed.token);
    // The app signature travels in the QR payload — store it immediately so the
    // very first paired request already carries X-Butler-App-Sig.
    if (parsed.appSig) void saveBridge({ appSig: parsed.appSig });
    setPaste("");
    setNote(`Imported ${parsed.ip}${parsed.port ? `:${parsed.port}` : ""}${parsed.token ? " with code" : ""}.`);
    fx.success();
  };
  const importString = () => importText(paste);



  const valid = url.trim().length > 0 && isLocalBridgeUrl(url.trim());

  /**
   * Real handshake: POST /pair exchanges the printed code for a session token
   * and the machine's app signature, then /api/health confirms the link.
   */
  const connect = () => {
    if (!valid || busy) return;
    setBusy(true);
    setNote("");
    fx.select();
    void pairWithServer(url.trim(), token.trim())
      .then(async (result) => {
        if (!result.ok) {
          setNote(result.message);
          fx.warn();
          return;
        }
        const h = await checkHealth().catch(() => null);
        if (h) setHealth(h);
        setNote(
          h?.ollama
            ? "Paired — local model ready."
            : `${result.message} Ollama not detected on the PC yet.`,
        );
        await rememberGoodHost(url.trim());
        refresh();
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

      <QrScanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={importText} />

      <button
        type="button"
        onClick={() => {
          fx.tap();
          setScanOpen(true);
        }}
        className="press flex w-full items-center justify-center gap-2 rounded-xl border border-cyan/45 bg-cyan/12 px-3 py-2.5 label-mono text-[11px] text-cyan"
      >
        <QrCode size={14} /> scan pairing qr
      </button>

      <label className="block space-y-1">
        <span className="label-mono text-[10px] text-faint">or paste qr / terminal line</span>
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
        <span className="label-mono text-[10px] text-faint">pairing code shown on the pc</span>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="6-digit code from the server window"
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
        <StatTile
          label="server"
          value={health?.version ?? link.serverVersion ?? "—"}
          accent={health ? "ok" : "warn"}
          sub="butler_server"
        />
        <StatTile
          label="model"
          value={health?.model ?? link.model ?? (health?.ollama ? "ready" : "—")}
          accent={health?.ollama ? "neural" : "warn"}
          sub="ollama · local"
        />
        <StatTile label="transport" value="lan" accent="net" sub="no cloud relay" />
        <StatTile label="device id" value={deviceId ? deviceId.slice(0, 8) : "—"} accent="system" sub="local only" />
        <StatTile
          label="pc cpu"
          value={link.state === "online" ? `${link.cpu}%` : "—"}
          accent={link.cpu > 85 ? "danger" : "system"}
          sub="live from host"
        />
        <StatTile
          label="pc ram"
          value={link.state === "online" ? `${link.ram}%` : "—"}
          accent={link.ram > 85 ? "danger" : "system"}
          sub="live from host"
        />
      </div>
    </Card>
  );
}

/** Live connection health: monitor stats, diagnosis, and the latency tripwire. */
function DiagnosticsPanel() {
  const [, bump] = useState(0);
  const [wire, setWire] = useState<TripwireState | null>(null);

  useEffect(() => {
    networkMonitor.load();
    neuralTripwire.load();
    setWire(neuralTripwire.getState());
    const offNet = networkMonitor.subscribe(() => bump((n) => n + 1));
    const offWire = neuralTripwire.subscribe((s) => setWire(s));
    return () => {
      offNet();
      offWire();
    };
  }, []);

  const report = networkMonitor.getDiagnosticReport();
  const stats = networkMonitor.getStats();
  const timeline = networkMonitor.getConnectionTimeline(6);
  const healthAccent = report.healthScore >= 80 ? "ok" : report.healthScore >= 50 ? "warn" : "danger";
  const alert = wire?.alertLevel && wire.alertLevel !== "NONE";

  return (
    <Card accent={healthAccent}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="health" value={`${report.healthScore}`} accent={healthAccent} />
        <StatTile label="avg ping" value={`${report.avgLatencyMs}ms`} accent="cyan" />
        <StatTile label="fail rate" value={`${Math.round(report.failRate * 100)}%`} accent="net" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip accent="cyan">{stats.totalSuccesses} ok</Chip>
        <Chip accent="danger">{stats.totalFailures} fail</Chip>
        {report.bestPort ? <Chip accent="ok">best port {report.bestPort}</Chip> : null}
        {stats.failStreak > 0 ? <Chip accent="warn">streak {stats.failStreak}</Chip> : null}
      </div>

      <div className="mt-3 rounded-lg border border-dim/60 bg-background p-3">
        <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          <ShieldCheck size={12} className={alert ? "text-danger" : "text-ok"} />
          neural tripwire · {wire?.status ?? "idle"}
        </div>
        {alert ? (
          <p className="text-[11px] leading-snug text-danger">{wire?.alertMessage}</p>
        ) : wire?.baseline ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Baseline {Math.round(wire.baseline.meanMs)}ms ±{Math.round(wire.baseline.stddevMs)}ms · live{" "}
            {wire.liveMeanMs}ms ({wire.deviationSigma.toFixed(1)}σ). No routing anomalies.
          </p>
        ) : (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Learning your link — {wire?.samplesCollected ?? 0}/{wire?.samplesNeeded ?? 20} pings sampled.
          </p>
        )}
      </div>

      {report.issues.length ? (
        <ul className="mt-3 space-y-1">
          {report.issues.slice(0, 3).map((i) => (
            <li key={i} className="text-[11px] leading-snug text-warn">• {i}</li>
          ))}
        </ul>
      ) : null}
      {report.recommendations.length ? (
        <ul className="mt-2 space-y-1">
          {report.recommendations.slice(0, 3).map((r) => (
            <li key={r} className="text-[11px] leading-snug text-muted-foreground">› {r}</li>
          ))}
        </ul>
      ) : null}

      {timeline.length ? (
        <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-dim/60 bg-background p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
{timeline.map((e) => networkMonitor.formatEntry(e)).join("\n")}
        </pre>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton
          onClick={() => {
            networkMonitor.clear();
            fx.tap();
            bump((n) => n + 1);
          }}
        >
          <RefreshCw size={16} /> Reset log
        </ActionButton>
        <ActionButton
          onClick={() => {
            neuralTripwire.reset();
            fx.tap();
          }}
        >
          <ShieldCheck size={16} /> Relearn link
        </ActionButton>
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
        <SectionHeader title="link diagnostics" accent="warn" action={<Activity size={14} className="text-faint" />} />
        <DiagnosticsPanel />
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
        Scan the QR above, paste the payload, or let the LAN sweep find the machine for you.
      </p>

    </AppShell>
  );
}

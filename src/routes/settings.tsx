import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Wifi,
  Bot,
  Palette,
  Server,
  Lock,
  Database,
  Zap,
  Globe,
  Volume2,
  Cpu,
  Download,
  Terminal,
  Camera,
  KeyRound,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import {
  Card,
  Chip,
  IconBadge,
  Row,
  SectionHeader,
  Toggle,
  Segmented,
  SliderRow,
  ActionButton,
  type Accent,
} from "@/components/nexus/ui";
import { useSetting, clearAllSettings } from "@/hooks/useSetting";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "Connection, AI, automation, appearance, notification, privacy, storage and advanced controls for Butler AI NEXUS.",
      },
      { property: "og:title", content: "Settings — NEXUS" },
      { property: "og:description", content: "Full control over what Butler AI is allowed to do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

/** Toggle row bound to a persisted setting. */
function SwitchRow({
  id,
  title,
  sub,
  icon,
  accent = "cyan",
  initial = false,
}: {
  id: string;
  title: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: Accent;
  initial?: boolean;
}) {
  const { value, set } = useSetting<boolean>(id, initial);
  return (
    <Row
      title={title}
      {...(sub ? { sub } : {})}
      left={
        <IconBadge accent={accent} size={32}>
          {icon}
        </IconBadge>
      }
      right={<Toggle on={value} onChange={set} label={title} />}
    />
  );
}

/** Segmented-choice row bound to a persisted setting. */
function ChoiceRow<T extends string>({
  id,
  title,
  sub,
  icon,
  accent = "cyan",
  options,
  initial,
}: {
  id: string;
  title: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: Accent;
  options: readonly T[];
  initial: T;
}) {
  const { value, set } = useSetting<T>(id, initial);
  return (
    <div className="rounded-xl border border-dim/50 bg-surface-3/50 px-3 py-3">
      <div className="flex items-center gap-3">
        <IconBadge accent={accent} size={32}>
          {icon}
        </IconBadge>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug">{title}</div>
          {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
        </div>
      </div>
      <Segmented options={options} value={value} onChange={set} className="mt-3 flex w-full" />
    </div>
  );
}

function RangeRow({
  id,
  label,
  initial,
  min,
  max,
  step,
  unit,
  accent,
}: {
  id: string;
  label: string;
  initial: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  accent?: Accent;
}) {
  const { value, set } = useSetting<number>(id, initial);
  return (
    <SliderRow
      label={label}
      value={value}
      onChange={set}
      {...(min !== undefined ? { min } : {})}
      {...(max !== undefined ? { max } : {})}
      {...(step !== undefined ? { step } : {})}
      {...(unit ? { unit } : {})}
      {...(accent ? { accent } : {})}
    />
  );
}

function Settings() {
  const [erased, setErased] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const erase = () => {
    clearAllSettings();
    setErased(true);
    window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <AppShell title="CONFIG" subtitle="device · ai · privacy controls" accentLabel="v9">
      {/* paired device */}
      <section>
        <SectionHeader title="paired device" accent="ok" />
        <Card accent="ok" className="lift">
          <div className="flex items-center gap-3">
            <IconBadge accent="ok" size={40}>
              <Smartphone size={18} />
            </IconBadge>
            <div className="min-w-0">
              <div className="font-mono text-sm">DESKTOP-A9F2</div>
              <div className="text-[11px] text-muted-foreground">
                paired · local key stored on device
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip accent="ok" dot>
              trusted
            </Chip>
            <Chip accent="net">192.168.1.24:8770</Chip>
            <Chip accent="cyan">ed25519</Chip>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/connect"
              className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dim bg-surface-3 text-xs font-semibold hover:bg-surface-3/70"
            >
              <Server size={14} /> Re-pair
            </Link>
            <Link
              to="/crash-report"
              className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dim bg-surface-3 text-xs font-semibold hover:bg-surface-3/70"
            >
              <Bug size={14} /> Diagnostics
            </Link>
          </div>
        </Card>
      </section>

      {/* connection */}
      <section>
        <SectionHeader title="connection" hint="How the phone reaches your PC" accent="net" />
        <div className="space-y-2">
          <SwitchRow
            id="conn.autoConnect"
            title="Auto-connect on launch"
            sub="Reconnect to the last trusted host"
            icon={<Wifi size={14} />}
            accent="net"
            initial
          />
          <SwitchRow
            id="conn.lanOnly"
            title="LAN only"
            sub="Refuse any route that leaves your network"
            icon={<ShieldCheck size={14} />}
            accent="ok"
            initial
          />
          <SwitchRow
            id="conn.wakeOnLan"
            title="Wake-on-LAN"
            sub="Send magic packet when host is asleep"
            icon={<Zap size={14} />}
            accent="warn"
          />
          <SwitchRow
            id="conn.keepAlive"
            title="Keep-alive ping"
            sub="Maintain socket while app is backgrounded"
            icon={<Clock size={14} />}
            accent="system"
            initial
          />
          <ChoiceRow
            id="conn.discovery"
            title="Discovery mode"
            sub="How hosts are found"
            icon={<Globe size={14} />}
            accent="net"
            options={["mdns", "scan", "manual"] as const}
            initial="mdns"
          />
          <RangeRow id="conn.timeout" label="Request timeout" initial={15} min={5} max={60} unit="s" accent="net" />
        </div>
      </section>

      {/* butler AI */}
      <section>
        <SectionHeader title="butler ai" hint="Assistant behaviour" accent="neural" />
        <div className="space-y-2">
          <ChoiceRow
            id="ai.model"
            title="Model tier"
            sub="Runs on your PC, not the cloud"
            icon={<Bot size={14} />}
            accent="neural"
            options={["fast", "balanced", "deep"] as const}
            initial="balanced"
          />
          <ChoiceRow
            id="ai.tone"
            title="Response tone"
            icon={<SlidersHorizontal size={14} />}
            accent="neural"
            options={["brief", "normal", "verbose"] as const}
            initial="normal"
          />
          <SwitchRow
            id="ai.autoTools"
            title="Auto tool use"
            sub="Let Butler run safe commands unprompted"
            icon={<Terminal size={14} />}
            accent="warn"
            initial
          />
          <SwitchRow
            id="ai.confirmDestructive"
            title="Confirm destructive actions"
            sub="Always ask before delete / shutdown"
            icon={<ShieldCheck size={14} />}
            accent="danger"
            initial
          />
          <SwitchRow
            id="ai.voice"
            title="Voice input"
            sub="Push-to-talk in the Butler dock"
            icon={<Volume2 size={14} />}
            accent="cyan"
          />
          <SwitchRow
            id="ai.memory"
            title="Conversation memory"
            sub="Remember context between sessions"
            icon={<Database size={14} />}
            accent="neural"
            initial
          />
          <RangeRow id="ai.temperature" label="Creativity" initial={40} unit="%" accent="neural" />
          <RangeRow id="ai.contextTurns" label="Context window" initial={12} min={2} max={40} unit=" turns" accent="neural" />
        </div>
      </section>

      {/* automation */}
      <section>
        <SectionHeader title="automation" hint="Scripts, schedules and triggers" accent="system" />
        <div className="space-y-2">
          <SwitchRow
            id="auto.scheduler"
            title="Scheduler enabled"
            sub="Run saved flows on a timer"
            icon={<Clock size={14} />}
            accent="system"
            initial
          />
          <SwitchRow
            id="auto.onConnect"
            title="Run on connect"
            sub="Fire the startup flow when pairing succeeds"
            icon={<Zap size={14} />}
            accent="cyan"
          />
          <SwitchRow
            id="auto.retry"
            title="Auto-retry failures"
            sub="Retry a failed step up to 3 times"
            icon={<RotateCcw size={14} />}
            accent="warn"
            initial
          />
          <SwitchRow
            id="auto.sandbox"
            title="Sandbox scripts"
            sub="Execute in a restricted shell"
            icon={<Lock size={14} />}
            accent="ok"
            initial
          />
          <ChoiceRow
            id="auto.concurrency"
            title="Parallel jobs"
            icon={<Cpu size={14} />}
            accent="system"
            options={["1", "2", "4"] as const}
            initial="2"
          />
        </div>
      </section>

      {/* appearance */}
      <section>
        <SectionHeader title="appearance" hint="Visual density and motion" accent="cyan" />
        <div className="space-y-2">
          <ChoiceRow
            id="ui.density"
            title="HUD density"
            icon={<Palette size={14} />}
            options={["cozy", "normal", "dense"] as const}
            initial="normal"
          />
          <ChoiceRow
            id="ui.accent"
            title="Accent colour"
            icon={<Palette size={14} />}
            accent="neural"
            options={["cyan", "neural", "ok"] as const}
            initial="cyan"
          />
          <SwitchRow
            id="ui.motion"
            title="Animations"
            sub="Ambient orbs, sweeps and transitions"
            icon={<Zap size={14} />}
            initial
          />
          <SwitchRow
            id="ui.scanlines"
            title="Scanline overlay"
            sub="Retro HUD texture on hero cards"
            icon={<SlidersHorizontal size={14} />}
            initial
          />
          <SwitchRow
            id="ui.mono"
            title="Monospace labels"
            sub="Technical type for meta text"
            icon={<Terminal size={14} />}
            initial
          />
          <RangeRow id="ui.textScale" label="Text size" initial={100} min={85} max={130} unit="%" />
          <div className="pt-1">
            <Link
              to="/cosmetic"
              className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dim bg-surface-3 text-xs font-semibold hover:bg-surface-3/70"
            >
              <Palette size={14} /> Open theme studio <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* permissions */}
      <section>
        <SectionHeader title="permissions" hint="All revocable, all local" accent="warn" />
        <div className="space-y-2">
          <SwitchRow
            id="perm.camera"
            title="Camera"
            sub="QR pairing scan only"
            icon={<Camera size={14} />}
            initial
          />
          <SwitchRow
            id="perm.lan"
            title="Local network"
            sub="Host discovery on your subnet"
            icon={<Wifi size={14} />}
            accent="net"
            initial
          />
          <SwitchRow
            id="perm.storage"
            title="Storage"
            sub="Opt-in file transfer folder"
            icon={<Database size={14} />}
            accent="warn"
          />
          <SwitchRow
            id="perm.mic"
            title="Microphone"
            sub="Voice commands to Butler"
            icon={<Volume2 size={14} />}
            accent="neural"
          />
          <SwitchRow
            id="perm.notifications"
            title="Notifications"
            sub="System alerts from the bridge"
            icon={<Bell size={14} />}
            accent="system"
            initial
          />
        </div>
      </section>

      {/* notifications */}
      <section>
        <SectionHeader title="notifications" accent="system" />
        <div className="space-y-2">
          <SwitchRow
            id="notif.connection"
            title="Connection alerts"
            sub="When the bridge drops or returns"
            icon={<Bell size={14} />}
            accent="system"
            initial
          />
          <SwitchRow
            id="notif.scripts"
            title="Script results"
            sub="On completion or failure"
            icon={<Terminal size={14} />}
            accent="neural"
            initial
          />
          <SwitchRow
            id="notif.threshold"
            title="Resource warnings"
            sub="CPU, disk or memory over threshold"
            icon={<Cpu size={14} />}
            accent="warn"
            initial
          />
          <SwitchRow
            id="notif.haptics"
            title="Haptics"
            sub="Feedback on actions"
            icon={<SlidersHorizontal size={14} />}
          />
          <SwitchRow id="notif.sound" title="Sound" sub="Audible cue on alerts" icon={<Volume2 size={14} />} />
          <SwitchRow
            id="notif.quiet"
            title="Quiet hours"
            sub="Silence alerts 23:00 – 07:00"
            icon={<Moonish />}
            accent="system"
          />
          <RangeRow id="notif.cpuThreshold" label="CPU alert threshold" initial={85} min={50} max={99} unit="%" accent="warn" />
        </div>
      </section>

      {/* privacy & security */}
      <section>
        <SectionHeader title="privacy & security" accent="danger" />
        <div className="space-y-2">
          <SwitchRow
            id="sec.biometric"
            title="Biometric unlock"
            sub="Face / fingerprint before sensitive actions"
            icon={<KeyRound size={14} />}
            accent="ok"
            initial
          />
          <SwitchRow
            id="sec.autoLock"
            title="Auto-lock"
            sub="Lock the app after inactivity"
            icon={<Lock size={14} />}
            accent="ok"
            initial
          />
          <SwitchRow
            id="sec.telemetry"
            title="Anonymous telemetry"
            sub="Off by default — nothing is collected"
            icon={<Globe size={14} />}
            accent="danger"
          />
          <SwitchRow
            id="sec.crashReports"
            title="Crash reports"
            sub="Send stack traces on fatal errors"
            icon={<Bug size={14} />}
            accent="warn"
          />
          <SwitchRow
            id="sec.hideSecrets"
            title="Mask secrets in logs"
            sub="Redact tokens and paths in the log stream"
            icon={<ShieldCheck size={14} />}
            accent="ok"
            initial
          />
          <RangeRow id="sec.autoLockMinutes" label="Auto-lock after" initial={5} min={1} max={60} unit=" min" accent="ok" />
        </div>
      </section>

      {/* storage & sync */}
      <section>
        <SectionHeader title="storage & sync" accent="neural" />
        <div className="space-y-2">
          <SwitchRow
            id="store.cacheThumbs"
            title="Cache thumbnails"
            sub="Faster file browsing over LAN"
            icon={<Database size={14} />}
            accent="neural"
            initial
          />
          <SwitchRow
            id="store.offlineLogs"
            title="Keep offline logs"
            sub="Retain the last 500 events on device"
            icon={<FileText size={14} />}
            accent="system"
            initial
          />
          <SwitchRow
            id="store.autoDownload"
            title="Auto-download transfers"
            sub="Save incoming files without asking"
            icon={<Download size={14} />}
            accent="warn"
          />
          <ChoiceRow
            id="store.retention"
            title="Log retention"
            icon={<Clock size={14} />}
            accent="system"
            options={["7d", "30d", "90d"] as const}
            initial="30d"
          />
          <RangeRow id="store.cacheLimit" label="Cache limit" initial={250} min={50} max={2000} step={50} unit=" mb" accent="neural" />
          <ActionButton
            variant="ghost"
            className="w-full"
            onClick={() => {
              setCacheCleared(true);
              window.setTimeout(() => setCacheCleared(false), 1600);
            }}
          >
            {cacheCleared ? (
              <>
                <CheckCircle2 size={16} /> Cache cleared
              </>
            ) : (
              <>
                <Trash2 size={16} /> Clear cache
              </>
            )}
          </ActionButton>
        </div>
      </section>

      {/* advanced */}
      <section>
        <SectionHeader title="advanced" hint="For power users" accent="warn" />
        <div className="space-y-2">
          <SwitchRow
            id="adv.devMode"
            title="Developer mode"
            sub="Show raw payloads and timings"
            icon={<Terminal size={14} />}
            accent="warn"
          />
          <SwitchRow
            id="adv.betaFeatures"
            title="Beta features"
            sub="Opt into unfinished modules"
            icon={<Zap size={14} />}
            accent="neural"
          />
          <SwitchRow
            id="adv.verboseLogs"
            title="Verbose logging"
            sub="Debug-level output in the log stream"
            icon={<FileText size={14} />}
            accent="system"
          />
          <SwitchRow
            id="adv.experimentalTransport"
            title="Experimental transport"
            sub="QUIC instead of TCP where supported"
            icon={<Server size={14} />}
            accent="warn"
          />
          <ChoiceRow
            id="adv.logLevel"
            title="Log level"
            icon={<BarsIcon />}
            accent="system"
            options={["error", "warn", "info", "debug"] as const}
            initial="info"
          />
        </div>
      </section>

      {/* legal */}
      <section>
        <SectionHeader title="legal" accent="neural" />
        <div className="space-y-2">
          {LEGAL.map((l) => (
            <Link key={l.to} to={l.to} className="block">
              <Row
                title={l.t}
                left={
                  <IconBadge accent="neural" size={32}>
                    {l.t === "Crash Report" ? <Bug size={14} /> : <FileText size={14} />}
                  </IconBadge>
                }
                right={<ChevronRight size={16} className="text-faint" />}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* data */}
      <section>
        <SectionHeader title="data" accent="danger" />
        <div className="space-y-3">
          <Link
            to="/onboarding"
            className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dim bg-surface-3 text-sm font-semibold hover:bg-surface-3/70"
          >
            <RotateCcw size={16} /> Replay tutorial
          </Link>
          <ActionButton variant="danger" className="w-full" onClick={erase} disabled={erased}>
            <Trash2 size={16} /> {erased ? "Erasing…" : "Erase local data"}
          </ActionButton>
        </div>
      </section>

      {/* about */}
      <section>
        <SectionHeader title="about" />
        <Card>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>app version</span>
              <span className="font-mono tabular-nums">9.0.0 (shell)</span>
            </div>
            <div className="flex justify-between">
              <span>bridge protocol</span>
              <span className="font-mono tabular-nums">nexus/1.4</span>
            </div>
            <div className="flex justify-between">
              <span>build channel</span>
              <span className="font-mono">stable</span>
            </div>
          </div>
        </Card>
      </section>

      <p className="pb-2 text-center text-[10px] text-faint">
        Butler AI NEXUS · shell build · no data leaves your LAN
      </p>
    </AppShell>
  );
}

function Moonish() {
  return <Bell size={14} />;
}

function BarsIcon() {
  return <SlidersHorizontal size={14} />;
}

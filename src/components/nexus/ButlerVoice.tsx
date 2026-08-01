import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";

import { Mascot } from "./Mascot";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { playCue } from "@/lib/sound";
import {
  BUTLER_TIPS,
  butlerSay,
  onSpeakingChange,
  speakLine,
  stopSpeaking,
  voicePrefs,
  voiceSupported,
  type SayPayload,
  type SayTone,
} from "@/lib/voice";

const TONE: Record<SayTone, { ring: string; text: string; label: string }> = {
  info: { ring: "border-cyan/40", text: "text-cyan", label: "BUTLER" },
  tip: { ring: "border-neural/40", text: "text-neural", label: "TIP" },
  ok: { ring: "border-ok/40", text: "text-ok", label: "OK" },
  warn: { ring: "border-warn/45", text: "text-warn", label: "HEADS UP" },
  alert: { ring: "border-danger/50", text: "text-danger", label: "ALERT" },
};

/** Animated five-bar vocoder meter — lively while talking, flat when idle. */
function Waveform({ active, tone }: { active: boolean; tone: SayTone }) {
  return (
    <div className="flex h-3 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-current transition-[height,opacity] duration-200",
            TONE[tone].text,
            active ? "voice-bar" : "h-[3px] opacity-45",
          )}
          style={active ? ({ "--i": i } as React.CSSProperties) : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Butler's on-screen presence. One global instance listens for
 * `nexus:butler-say`, pops the mascot in with a typed caption, speaks the line
 * and retires itself. Also drips ambient tips while the user is idle.
 */
export function ButlerVoice() {
  const [line, setLine] = useState<SayPayload | null>(null);
  const [typed, setTyped] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [talking, setTalking] = useState(false);
  const [muted, setMuted] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = useRef(Date.now());
  const supported = useMemo(() => voiceSupported(), []);

  useEffect(() => onSpeakingChange(setTalking), []);
  useEffect(() => setMuted(!voicePrefs.enabled()), []);

  const dismiss = useCallback(() => {
    stopSpeaking();
    setLeaving(true);
    window.setTimeout(() => {
      setLine(null);
      setLeaving(false);
      setTyped("");
    }, 260);
  }, []);

  // Incoming lines.
  useEffect(() => {
    const onSay = (e: Event) => {
      const detail = (e as CustomEvent<SayPayload>).detail;
      if (!detail?.text) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setLeaving(false);
      setTyped("");
      setLine(detail);
      playCue(detail.tone === "warn" || detail.tone === "alert" ? "warn" : "open");
      haptic(detail.tone === "alert" ? "warn" : "tap");
      speakLine(detail.text);
    };
    window.addEventListener("nexus:butler-say", onSay as EventListener);
    return () => window.removeEventListener("nexus:butler-say", onSay as EventListener);
  }, []);

  // Typewriter caption, then auto-retire.
  useEffect(() => {
    if (!line) return;
    const full = line.text;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTyped(full);
    } else {
      let i = 0;
      const step = window.setInterval(() => {
        i += 1;
        setTyped(full.slice(0, i));
        if (i >= full.length) window.clearInterval(step);
      }, 18);
      return () => window.clearInterval(step);
    }
    return undefined;
  }, [line]);

  useEffect(() => {
    if (!line) return undefined;
    const hold = line.hold ?? 3400;
    const ms = line.text.length * 22 + hold;
    hideTimer.current = setTimeout(dismiss, ms);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [line, dismiss]);

  // Ambient tips while idle — never while something else is on screen.
  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", bump, { passive: true });
    window.addEventListener("keydown", bump);
    const tick = window.setInterval(() => {
      if (!voicePrefs.tips()) return;
      if (document.hidden) return;
      if (Date.now() - lastActivity.current < 45_000) return;
      lastActivity.current = Date.now();
      const tip = BUTLER_TIPS[Math.floor(Math.random() * BUTLER_TIPS.length)]!;
      butlerSay(tip, { tone: "tip", label: "TIP" });
    }, 60_000);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      window.clearInterval(tick);
    };
  }, []);

  if (!line) return null;
  const tone = TONE[line.tone];

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[65] mx-auto flex w-full max-w-lg items-end gap-2 px-3",
        leaving ? "butler-out" : "butler-in",
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative shrink-0", talking && "mascot-talk")}>
        <Mascot size={64} />
      </div>

      <div
        className={cn(
          "pointer-events-auto relative min-w-0 flex-1 rounded-2xl border glass px-3 py-2.5 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.95)]",
          tone.ring,
        )}
      >
        <span
          className={cn(
            "absolute -left-1.5 bottom-4 size-3 rotate-45 border-b border-l glass",
            tone.ring,
          )}
          aria-hidden
        />
        <div className="flex items-center gap-2">
          <span className={cn("label-mono text-[10px]", tone.text)}>
            {line.label ?? tone.label}
          </span>
          <Waveform active={talking} tone={line.tone} />
          <div className="ml-auto flex items-center gap-0.5">
            {supported ? (
              <button
                type="button"
                aria-label={muted ? "Unmute Butler's voice" : "Mute Butler's voice"}
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  try {
                    window.localStorage.setItem("nexus:voice.enabled", JSON.stringify(!next));
                  } catch {
                    /* storage unavailable */
                  }
                  if (next) stopSpeaking();
                  else speakLine(line.text, { force: true });
                  haptic("tap");
                }}
                className="press grid size-6 place-items-center rounded-md text-faint hover:text-foreground"
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="press grid size-6 place-items-center rounded-md text-faint hover:text-foreground"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-foreground/90">
          {typed}
          {typed.length < line.text.length ? (
            <span className="caret ml-px inline-block h-[1em] w-[2px] translate-y-[2px] bg-current align-baseline" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

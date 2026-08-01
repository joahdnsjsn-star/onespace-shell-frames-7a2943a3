/**
 * Tiny WebAudio cue engine. No audio files — every cue is synthesised, so it
 * adds zero bytes to the bundle. Deliberately quiet (master gain 0.05–0.09)
 * and gated behind the Settings "Sound" switch (nexus:notif.sound).
 */
type Cue = "tap" | "select" | "open" | "close" | "success" | "warn" | "boot";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function enabled() {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(window.localStorage.getItem("nexus:notif.sound") ?? "false") === true;
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.075;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number };

const CUES: Record<Cue, Note[]> = {
  tap: [{ f: 880, t: 0, d: 0.045, g: 0.5 }],
  select: [{ f: 1180, t: 0, d: 0.05, g: 0.55 }],
  open: [
    { f: 620, t: 0, d: 0.07 },
    { f: 980, t: 0.05, d: 0.09 },
  ],
  close: [
    { f: 900, t: 0, d: 0.06 },
    { f: 560, t: 0.05, d: 0.09 },
  ],
  success: [
    { f: 784, t: 0, d: 0.08 },
    { f: 1046, t: 0.07, d: 0.12 },
  ],
  warn: [
    { f: 420, t: 0, d: 0.1, type: "triangle" },
    { f: 330, t: 0.09, d: 0.14, type: "triangle" },
  ],
  boot: [
    { f: 392, t: 0, d: 0.12, type: "triangle", g: 0.7 },
    { f: 587, t: 0.11, d: 0.12, type: "triangle", g: 0.7 },
    { f: 784, t: 0.22, d: 0.26, type: "sine", g: 0.8 },
  ],
};

/** Play a UI cue. Silent when the user has sound off or WebAudio is blocked. */
export function playCue(cue: Cue) {
  if (!enabled()) return;
  const ac = audio();
  if (!ac || !master) return;
  const now = ac.currentTime;
  for (const n of CUES[cue]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.f, now + n.t);
    const peak = 0.9 * (n.g ?? 1);
    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(master);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  }
}

/** Browsers require a gesture before audio can start — call once on mount. */
export function primeAudio() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    if (enabled()) audio();
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

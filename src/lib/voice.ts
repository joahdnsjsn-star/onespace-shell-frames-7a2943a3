/**
 * Butler's voice. Uses the browser's built-in speech synthesis, so it costs
 * nothing, works fully offline and adds zero bytes of audio to the bundle.
 *
 * Everything routes through `butlerSay()`, which raises a `nexus:butler-say`
 * event. <ButlerVoice /> renders the mascot + animated caption and calls
 * `speakLine()` — so a line is always readable even when speech is muted,
 * blocked by autoplay policy or unsupported by the browser.
 */

export type SayTone = "info" | "tip" | "ok" | "warn" | "alert";

export type SayPayload = {
  text: string;
  tone: SayTone;
  /** Short mono label above the caption, e.g. "TIP". */
  label?: string;
  /** Milliseconds the bubble stays after the caption finishes typing. */
  hold?: number;
  /** Speak even when the line came from a background source. */
  priority?: boolean;
};

const PREFIX = "nexus:";

function pref<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export const voicePrefs = {
  enabled: () => pref("voice.enabled", true),
  tips: () => pref("voice.tips", true),
  alerts: () => pref("voice.alerts", true),
  name: () => pref<string>("voice.name", "auto"),
  rate: () => pref("voice.rate", 100) / 100,
  pitch: () => pref("voice.pitch", 80) / 100,
  volume: () => pref("voice.volume", 70) / 100,
};

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return "speechSynthesis" in window ? window.speechSynthesis : null;
}

/** True when the browser can speak at all — used to hide voice controls. */
export function voiceSupported() {
  return synth() !== null;
}

let cached: SpeechSynthesisVoice[] = [];

/** Installed voices. Chrome populates these asynchronously after first call. */
export function listVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const v = s.getVoices();
  if (v.length) cached = v;
  return cached;
}

/** Subscribe to the async voice list. Returns an unsubscribe function. */
export function onVoicesChanged(cb: () => void) {
  const s = synth();
  if (!s) return () => {};
  const handler = () => {
    listVoices();
    cb();
  };
  s.addEventListener("voiceschanged", handler);
  listVoices();
  return () => s.removeEventListener("voiceschanged", handler);
}

/** Preferred fallback voices — deeper, clearer, more "system assistant". */
const PREFERRED = [
  "google uk english male",
  "microsoft guy",
  "microsoft david",
  "daniel",
  "arthur",
  "oliver",
  "alex",
  "google us english",
];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (!voices.length) return null;
  const wanted = voicePrefs.name();
  if (wanted && wanted !== "auto") {
    const exact = voices.find((v) => v.name === wanted);
    if (exact) return exact;
  }
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  for (const hint of PREFERRED) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(hint));
    if (hit) return hit;
  }
  return pool[0] ?? null;
}

let speaking = false;
const listeners = new Set<(on: boolean) => void>();

function setSpeaking(on: boolean) {
  if (speaking === on) return;
  speaking = on;
  listeners.forEach((l) => l(on));
}

/** Subscribe to "is Butler talking right now" for mouth/waveform animation. */
export function onSpeakingChange(cb: (on: boolean) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isSpeaking() {
  return speaking;
}

/** Stop mid-sentence — used when a new line arrives or the user dismisses. */
export function stopSpeaking() {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
  } catch {
    /* some engines throw when idle */
  }
  setSpeaking(false);
}

/**
 * Speak one line. Silently no-ops when speech is unsupported, muted, or the
 * user prefers reduced motion + muted audio. Never throws.
 */
export function speakLine(text: string, opts: { force?: boolean } = {}) {
  const s = synth();
  if (!s) return false;
  if (!opts.force && !voicePrefs.enabled()) return false;
  const clean = text
    .replace(/[·—–]/g, ",")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return false;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    const v = pickVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = Math.min(2, Math.max(0.5, voicePrefs.rate()));
    u.pitch = Math.min(2, Math.max(0, voicePrefs.pitch()));
    u.volume = Math.min(1, Math.max(0, voicePrefs.volume()));
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    s.speak(u);
    return true;
  } catch {
    setSpeaking(false);
    return false;
  }
}

/**
 * The one entry point the rest of the app uses. Shows the mascot with an
 * animated caption and speaks the line when voice is on.
 */
export function butlerSay(text: string, opts: Omit<SayPayload, "text"> = { tone: "info" }) {
  if (typeof window === "undefined") return;
  const detail: SayPayload = { text, tone: opts.tone ?? "info", ...opts };
  window.dispatchEvent(new CustomEvent<SayPayload>("nexus:butler-say", { detail }));
}

/** Ambient tips rotated by <ButlerVoice /> while the user is idle. */
export const BUTLER_TIPS: string[] = [
  "Hold the PAGES button to jump straight to any screen. No scrolling required.",
  "Everything stays on your local network. Nothing leaves your house.",
  "Scripts run on your PC, not your phone, so your battery stays cool.",
  "If frames start dropping, I trim the visual effects automatically.",
  "Pair a new machine from the LINK page — scan the QR shown in the terminal.",
  "You can pin a quality mode in Settings if you prefer full effects always.",
  "Long-press a script card to duplicate it before you edit anything risky.",
  "The vault seals your credentials locally, and I never sync them anywhere.",
];

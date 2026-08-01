/**
 * Tiny haptics helper. No-ops when the device has no vibration motor or the
 * user disabled haptics in Settings (nexus:notif.haptics).
 */
type Pattern = "tap" | "select" | "success" | "warn";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  select: 12,
  success: [10, 40, 18],
  warn: [24, 60, 24],
};

function enabled() {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("nexus:notif.haptics");
    return raw === null ? false : JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

export function haptic(pattern: Pattern = "tap") {
  if (!enabled()) return;
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (!nav || typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(PATTERNS[pattern]);
  } catch {
    /* ignore */
  }
}

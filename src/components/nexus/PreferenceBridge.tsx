import { useEffect } from "react";

import { haptic } from "@/lib/haptics";

const KEYS = [
  "ui.density",
  "ui.accent",
  "ui.motion",
  "ui.scanlines",
  "ui.mono",
  "notif.haptics",
] as const;

function readRaw(key: string): unknown {
  try {
    const raw = window.localStorage.getItem("nexus:" + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function apply() {
  const el = document.documentElement;
  const density = readRaw("ui.density");
  const accent = readRaw("ui.accent");
  el.dataset["density"] = typeof density === "string" ? density : "normal";
  el.dataset["accent"] = typeof accent === "string" ? accent : "cyan";
  el.dataset["motion"] = readRaw("ui.motion") === false ? "off" : "on";
  el.dataset["scanlines"] = readRaw("ui.scanlines") === false ? "off" : "on";
  el.dataset["mono"] = readRaw("ui.mono") === false ? "off" : "on";
}

/**
 * Mirrors persisted Settings values onto <html data-*> so CSS can react to them
 * app-wide. Client-only: runs after hydration, and re-applies whenever another
 * tab writes, the tab regains focus, or a control dispatches `nexus:prefs`.
 */
export function PreferenceBridge() {
  useEffect(() => {
    apply();
    const onPrefs = () => apply();
    const onVisible = () => document.visibilityState === "visible" && apply();
    window.addEventListener("nexus:prefs", onPrefs);
    window.addEventListener("storage", onPrefs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("nexus:prefs", onPrefs);
      window.removeEventListener("storage", onPrefs);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}

/** Call after writing any nexus: setting so the bridge picks it up instantly. */
export function notifyPrefsChanged(withHaptic = true) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("nexus:prefs"));
  if (withHaptic) haptic("select");
}

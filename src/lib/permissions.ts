/**
 * Permission registry — single source of truth shared by the web shell,
 * the PWA manifest and the OnSpace.ai / Expo (EAS) native build.
 *
 * Native parity: the `native` field of every GRANTED entry must appear in
 * `expo.android.permissions` in app.json, and every entry in DENIED_NATIVE
 * must appear in `expo.android.blockedPermissions`. `app.permissions.json`
 * at the repo root mirrors this file for build tooling.
 */

export type PermState = "granted" | "denied" | "prompt" | "unsupported" | "checking";

export type PermKey =
  | "network"
  | "camera"
  | "haptics"
  | "notifications"
  | "clipboard"
  | "storage"
  | "wakelock";

export type PermDef = {
  key: PermKey;
  label: string;
  /** Why it exists, in plain language — reused for store disclosures. */
  why: string;
  /** What happens if the user says no. Never a dead end. */
  fallback: string;
  /** Matching Android permission for the native build (null = web only). */
  native: string | null;
  /** Permissions API name, when the browser exposes one. */
  browser?: PermissionName | string;
  /** Requested only on an explicit user gesture, never on boot. */
  runtime: boolean;
  accent: "cyan" | "neural" | "warn" | "ok" | "net" | "system" | "danger";
};

export const PERMISSIONS: PermDef[] = [
  {
    key: "network",
    label: "Local network",
    why: "Reaches your PC bridge over the LAN. This is the only thing the app strictly needs.",
    fallback: "Without it the shell runs fully offline in demo mode.",
    native: "android.permission.INTERNET",
    runtime: false,
    accent: "net",
  },
  {
    key: "camera",
    label: "Camera",
    why: "Scans the pairing QR code shown by the desktop server. Nothing is recorded or uploaded.",
    fallback: "Pair by typing the 6-digit code instead.",
    native: "android.permission.CAMERA",
    browser: "camera",
    runtime: true,
    accent: "cyan",
  },
  {
    key: "haptics",
    label: "Haptics",
    why: "Short vibration confirmations on taps, sends and alerts.",
    fallback: "Feedback falls back to sound and motion only.",
    native: "android.permission.VIBRATE",
    runtime: false,
    accent: "neural",
  },
  {
    key: "notifications",
    label: "Notifications",
    why: "Alerts you when a long script finishes or the host disconnects.",
    fallback: "Alerts stay inside the app as toasts.",
    native: null,
    browser: "notifications",
    runtime: true,
    accent: "system",
  },
  {
    key: "clipboard",
    label: "Clipboard",
    why: "Copies script output and pairing codes when you press copy.",
    fallback: "Text can be selected and copied by hand.",
    native: null,
    browser: "clipboard-write",
    runtime: true,
    accent: "ok",
  },
  {
    key: "storage",
    label: "File access",
    why: "Only files you pick yourself in Fileshare are read. No folder is scanned.",
    fallback: "Fileshare stays receive-only.",
    native: null,
    runtime: true,
    accent: "warn",
  },
  {
    key: "wakelock",
    label: "Keep screen awake",
    why: "Holds the screen on while a long automation runs in the foreground.",
    fallback: "The screen dims normally.",
    native: null,
    browser: "screen-wake-lock",
    runtime: true,
    accent: "system",
  },
];

/**
 * Permissions deliberately refused at build time. Mirrors
 * `expo.android.blockedPermissions` so a transitive library can never
 * quietly widen the app's Play Store data-safety footprint.
 */
export const DENIED_NATIVE: { native: string; label: string }[] = [
  { native: "android.permission.RECORD_AUDIO", label: "Microphone" },
  { native: "android.permission.ACCESS_FINE_LOCATION", label: "Precise location" },
  { native: "android.permission.ACCESS_COARSE_LOCATION", label: "Approximate location" },
  { native: "android.permission.ACCESS_BACKGROUND_LOCATION", label: "Background location" },
  { native: "android.permission.READ_CONTACTS", label: "Contacts" },
  { native: "android.permission.READ_PHONE_STATE", label: "Phone state" },
  { native: "android.permission.READ_EXTERNAL_STORAGE", label: "Read all storage" },
  { native: "android.permission.WRITE_EXTERNAL_STORAGE", label: "Write all storage" },
  { native: "android.permission.READ_MEDIA_IMAGES", label: "Photo library" },
  { native: "android.permission.READ_MEDIA_VIDEO", label: "Video library" },
  { native: "android.permission.READ_MEDIA_AUDIO", label: "Audio library" },
  { native: "android.permission.MEDIA_PROJECTION", label: "Screen capture" },
  { native: "android.permission.FOREGROUND_SERVICE", label: "Background service" },
  { native: "android.permission.BODY_SENSORS", label: "Body sensors" },
  { native: "android.permission.ACTIVITY_RECOGNITION", label: "Activity recognition" },
];

const isBrowser = () => typeof window !== "undefined" && typeof navigator !== "undefined";

/** Reads current state without ever triggering a permission prompt. */
export async function queryPermission(def: PermDef): Promise<PermState> {
  if (!isBrowser()) return "checking";

  switch (def.key) {
    case "network":
      return navigator.onLine ? "granted" : "denied";
    case "haptics":
      return "vibrate" in navigator ? "granted" : "unsupported";
    case "storage":
      return typeof window.showOpenFilePicker === "function" || "FileReader" in window
        ? "prompt"
        : "unsupported";
    case "wakelock":
      return "wakeLock" in navigator ? "prompt" : "unsupported";
    default:
      break;
  }

  if (def.key === "notifications") {
    if (!("Notification" in window)) return "unsupported";
    const p = Notification.permission;
    return p === "default" ? "prompt" : p;
  }

  if (!def.browser || !navigator.permissions?.query) return "unsupported";
  try {
    const status = await navigator.permissions.query({
      name: def.browser as PermissionName,
    });
    return status.state as PermState;
  } catch {
    return "unsupported";
  }
}

/** Requests a permission. Only ever called from a real user gesture. */
export async function requestPermission(def: PermDef): Promise<PermState> {
  if (!isBrowser()) return "checking";
  try {
    switch (def.key) {
      case "camera": {
        if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return "granted";
      }
      case "notifications": {
        if (!("Notification" in window)) return "unsupported";
        return ((await Notification.requestPermission()) === "granted"
          ? "granted"
          : "denied") as PermState;
      }
      case "clipboard": {
        if (!navigator.clipboard?.writeText) return "unsupported";
        await navigator.clipboard.writeText("");
        return "granted";
      }
      case "wakelock": {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (!wl) return "unsupported";
        const lock = await wl.request("screen");
        await lock.release();
        return "granted";
      }
      case "haptics": {
        if (!("vibrate" in navigator)) return "unsupported";
        navigator.vibrate?.(8);
        return "granted";
      }
      case "storage":
        return "prompt";
      case "network":
        return navigator.onLine ? "granted" : "denied";
      default:
        return "unsupported";
    }
  } catch {
    return "denied";
  }
}

export const STATE_LABEL: Record<PermState, string> = {
  granted: "granted",
  denied: "denied",
  prompt: "on demand",
  unsupported: "n/a here",
  checking: "checking",
};

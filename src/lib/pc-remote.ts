/**
 * PC REMOTE — clipboard / keyboard / power bridge helpers.
 *
 * Ports the native `pcClipboard.ts` + `safeClipboard.ts` services to the web
 * shell. Every call is:
 *   1. feature-gated on what /api/status actually reported (no dead buttons),
 *   2. routed through bridgeRequest (LAN-only guard, auth headers, rotation),
 *   3. non-throwing — callers get a typed result, never an unhandled rejection.
 */
import { bridgeRequest } from "./butler-bridge";
import { features } from "./server-features";
import { log } from "./logger";

export type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

/** Read the phone clipboard, tolerating denied/unsupported permission. */
export async function readLocalClipboard(): Promise<string> {
  try {
    if (!navigator.clipboard?.readText) return "";
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

/** Write to the phone clipboard, tolerating denied/unsupported permission. */
export async function writeLocalClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Pull the PC's clipboard onto the phone. */
export async function pullFromPc(): Promise<RemoteResult<string>> {
  if (!features.has("clipboard")) return { ok: false, error: "Server has no clipboard support" };
  try {
    const r = await bridgeRequest<{ text?: string; content?: string }>("/api/clipboard", {
      method: "POST",
      body: {},
      timeoutMs: 8000,
    });
    const text = r?.text ?? r?.content ?? "";
    log("info", "bridge", `clipboard pull · ${text.length} chars`);
    return { ok: true, value: text };
  } catch (e) {
    return fail(e);
  }
}

/** Push text from the phone to the PC's clipboard (server caps at 10k chars). */
export async function pushToPc(text: string): Promise<RemoteResult<number>> {
  if (!features.has("clipboard")) return { ok: false, error: "Server has no clipboard support" };
  const payload = text.slice(0, 10000);
  try {
    await bridgeRequest("/api/clipboard", { method: "POST", body: { text: payload }, timeoutMs: 8000 });
    log("info", "bridge", `clipboard push · ${payload.length} chars`);
    return { ok: true, value: payload.length };
  } catch (e) {
    return fail(e);
  }
}

/** Phone → PC, then PC → phone. Phone content wins on conflict. */
export async function syncClipboard(): Promise<RemoteResult<string>> {
  if (!features.has("clipboard")) return { ok: false, error: "Server has no clipboard support" };
  const phoneText = await readLocalClipboard();
  if (phoneText) {
    const pushed = await pushToPc(phoneText);
    if (!pushed.ok) return pushed;
  }
  const pulled = await pullFromPc();
  if (!pulled.ok) return pulled;
  if (pulled.value && pulled.value !== phoneText) await writeLocalClipboard(pulled.value);
  return { ok: true, value: pulled.value || phoneText };
}

/** Type a string on the PC keyboard. */
export async function typeOnPc(text: string): Promise<RemoteResult<true>> {
  if (!features.has("keyboard")) return { ok: false, error: "Server has no keyboard support" };
  try {
    await bridgeRequest("/api/keyboard/type", { method: "POST", body: { text }, timeoutMs: 10000 });
    log("info", "bridge", `typed ${text.length} chars on host`);
    return { ok: true, value: true };
  } catch (e) {
    return fail(e);
  }
}

export type PowerAction = "sleep" | "shutdown" | "restart";

/** Send a power action to the PC. Always explicit — never fired automatically. */
export async function powerAction(action: PowerAction): Promise<RemoteResult<true>> {
  if (!features.has("power")) return { ok: false, error: "Server has no power controls" };
  try {
    await bridgeRequest("/api/power", { method: "POST", body: { action, confirm: true }, timeoutMs: 8000 });
    log("warn", "bridge", `power action sent · ${action}`);
    return { ok: true, value: true };
  } catch (e) {
    return fail(e);
  }
}

/** Which remote capabilities the currently paired server advertises. */
export function remoteCapabilities() {
  return {
    clipboard: features.has("clipboard"),
    keyboard: features.has("keyboard"),
    power: features.has("power"),
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, X } from "lucide-react";
import { ActionButton } from "@/components/nexus/ui";
import { fx } from "@/lib/fx";
import type { PermDef } from "@/lib/permissions";

/**
 * Prominent disclosure gate — Google Play User Data policy requires a
 * plain-language, in-app explanation shown BEFORE the OS permission prompt
 * for sensitive permissions. This modal is that screen, and the runtime
 * request only fires if the user explicitly continues.
 *
 * Mirrors docs/native/PROMINENT_DISCLOSURES.md.
 */
export const DISCLOSURES: Partial<Record<PermDef["key"], { title: string; body: string; bullets: string[] }>> = {
  camera: {
    title: "Camera is used only for the pairing QR",
    body: "Butler AI opens the camera solely to read the one-time pairing code shown on your PC screen.",
    bullets: [
      "No photo or video is captured, saved or uploaded",
      "The camera closes the instant the code is read",
      "You can pair by typing the code instead and never grant this",
    ],
  },
  notifications: {
    title: "Notifications are used only for your own runs",
    body: "Alerts tell you when a script you started finishes, or when your paired PC drops off the network.",
    bullets: ["No marketing, no promotions, no third-party pushes", "Refusing keeps alerts inside the app as toasts"],
  },
  storage: {
    title: "Only the files you pick are read",
    body: "Fileshare reads a file after you choose it in the system picker. No folder is scanned or indexed.",
    bullets: ["No media library access — those permissions are blocked in the build", "Refusing keeps Fileshare receive-only"],
  },
  network: {
    title: "Local network scan needs your consent",
    body: "Discovery sends a short probe across your own Wi-Fi to find the PC running Butler server.",
    bullets: ["The public internet is never scanned", "One-time scan, started only by this tap", "You can type the IP address manually instead"],
  },
};

export function usePermissionDisclosure() {
  const [pending, setPending] = useState<PermDef | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  /** Resolves true when the user may proceed to the OS prompt. */
  const confirm = useCallback((def: PermDef) => {
    if (!DISCLOSURES[def.key]) return Promise.resolve(true);
    setPending(def);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPending(null);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const copy = pending ? DISCLOSURES[pending.key] : null;

  const sheet =
    pending && copy ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => close(false)}
      >
        <div
          className="w-full max-w-[440px] rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-warn/30 bg-warn/10 text-warn">
              <ShieldAlert size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">before we ask</p>
              <h2 className="text-sm font-semibold leading-snug text-foreground">{copy.title}</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="ml-auto -mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => close(false)}
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
          <ul className="mt-3 space-y-1.5">
            {copy.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-ok" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <ActionButton
              variant="ghost"
              className="flex-1"
              onClick={() => {
                fx.tap();
                close(false);
              }}
            >
              not now
            </ActionButton>
            <ActionButton
              className="flex-1"
              onClick={() => {
                fx.tap();
                close(true);
              }}
            >
              continue
            </ActionButton>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Refusing never blocks the app — a fallback is always available.
          </p>
        </div>
      </div>
    ) : null;

  // The handset column uses transforms/containment, which would make a
  // position:fixed overlay resolve against that box instead of the viewport.
  // Portalling to <body> keeps the sheet pinned to the real screen edges.
  const node = sheet && mounted ? createPortal(sheet, document.body) : null;

  return { confirm, node };
}

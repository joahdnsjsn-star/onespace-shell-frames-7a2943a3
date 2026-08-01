/**
 * Android app behaviours for the web shell.
 *
 * Everything here is opt-in, SSR-safe and degrades to a no-op on desktop.
 * The goal is that a user who installs the PWA (or runs the TWA build) cannot
 * tell the difference from a native Android app: hardware back closes sheets,
 * pull-to-refresh works, taps ripple, and nothing rubber-bands.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------- platform */

export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // iOS Safari legacy flag
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** True once the app is running as an installed app rather than a browser tab. */
export function useStandalone() {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const sync = () => setInstalled(isStandalone());
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return installed;
}

/* ------------------------------------------------------- hardware back key */

const BACK_FLAG = "__nexus_back__";

/**
 * Android hardware/gesture back closes the top-most overlay instead of leaving
 * the app. While `active` is true a throwaway history entry is parked on the
 * stack; popping it calls `onBack` instead of navigating.
 */
export function useAndroidBack(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const token = `${BACK_FLAG}${Date.now()}`;
    let ours = true;
    try {
      window.history.pushState({ [BACK_FLAG]: token }, "");
    } catch {
      return;
    }

    const onPop = () => {
      ours = false; // our entry is already gone
      cb.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed from the UI rather than the back key — remove our parked entry
      // so the stack stays exactly as deep as the user's real navigation.
      if (ours && (window.history.state as Record<string, unknown> | null)?.[BACK_FLAG] === token) {
        window.history.back();
      }
    };
  }, [active]);
}

/**
 * Back on the home screen should feel like Android: the first press warns,
 * a second press within 2s actually leaves. Returns a "press again" flag.
 */
export function useDoubleBackToExit(enabled: boolean) {
  const [armed, setArmed] = useState(false);
  useAndroidBack(enabled && !armed, () => {
    setArmed(true);
    window.setTimeout(() => setArmed(false), 2000);
  });
  return armed;
}

/* ---------------------------------------------------------- pull-to-refresh */

export type PullState = { pull: number; refreshing: boolean; armed: boolean };

/**
 * Material pull-to-refresh. Attaches to a scroll container (or the window when
 * `ref` has no element) and only engages while already scrolled to the top, so
 * it can never fight with normal scrolling.
 */
export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  opts: { threshold?: number; enabled?: boolean } = {},
) {
  const { threshold = 72, enabled = true } = opts;
  const targetRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<PullState>({ pull: 0, refreshing: false, armed: false });
  const run = useRef(onRefresh);
  run.current = onRefresh;

  const setTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const el = targetRef.current;
    const scrollTop = () => (el ? el.scrollTop : window.scrollY);

    let startY = 0;
    let tracking = false;
    let pull = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || scrollTop() > 0) return;
      startY = e.touches[0]!.clientY;
      tracking = true;
      pull = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0]!.clientY - startY;
      if (dy <= 0 || scrollTop() > 0) {
        tracking = false;
        pull = 0;
        setState((s) => (s.pull === 0 ? s : { ...s, pull: 0, armed: false }));
        return;
      }
      // rubber-band: the further you pull, the slower it moves
      pull = Math.min(threshold * 1.6, dy * 0.45);
      setState((s) => ({ ...s, pull, armed: pull >= threshold }));
    };

    const onEnd = async () => {
      if (!tracking) return;
      tracking = false;
      if (pull >= threshold) {
        setState({ pull: threshold * 0.7, refreshing: true, armed: false });
        try {
          await run.current();
        } finally {
          setState({ pull: 0, refreshing: false, armed: false });
        }
      } else {
        setState({ pull: 0, refreshing: false, armed: false });
      }
      pull = 0;
    };

    const node: HTMLElement | Window = el ?? window;
    node.addEventListener("touchstart", onStart as EventListener, { passive: true });
    node.addEventListener("touchmove", onMove as EventListener, { passive: true });
    node.addEventListener("touchend", onEnd as EventListener, { passive: true });
    node.addEventListener("touchcancel", onEnd as EventListener, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onStart as EventListener);
      node.removeEventListener("touchmove", onMove as EventListener);
      node.removeEventListener("touchend", onEnd as EventListener);
      node.removeEventListener("touchcancel", onEnd as EventListener);
    };
  }, [enabled, threshold]);

  return { ...state, setTarget };
}

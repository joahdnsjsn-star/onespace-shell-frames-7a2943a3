/**
 * Deferred work scheduler.
 *
 * Rule of the house: nothing on the critical path is ever deferred. Only
 * decorative or secondary chrome waits, and any wait is cancelled the instant
 * the user actually needs the thing (`force`). Every deferred mount opens a
 * perf quiet window first, so the extra work of mounting can never be
 * misread by the governor as device lag and pop a "performance mode" toast.
 */

import { useEffect, useRef, useState } from "react";
import { getPerfState, perfQuiet } from "./perf";

type IdleHandle = { cancel: () => void };

/** requestIdleCallback with a rAF+timeout fallback, always cancellable. */
export function onIdle(cb: () => void, timeout = 2000): IdleHandle {
  if (typeof window === "undefined") return { cancel: () => {} };
  const ric = (window as Window & {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  }).requestIdleCallback;
  if (ric) {
    const id = ric(cb, { timeout });
    return {
      cancel: () =>
        (window as unknown as { cancelIdleCallback?: (i: number) => void }).cancelIdleCallback?.(id),
    };
  }
  const t = window.setTimeout(() => requestAnimationFrame(cb), Math.min(timeout, 220));
  return { cancel: () => window.clearTimeout(t) };
}

/** Extra breathing room on weak devices so deferred work never fights the UI. */
function tierDelay() {
  const tier = getPerfState().tier;
  return tier === "low" ? 1200 : tier === "balanced" ? 500 : 120;
}

export type DeferOptions = {
  /** Skip the wait entirely (user asked for it now). */
  force?: boolean;
  /** Upper bound before we mount anyway. */
  timeout?: number;
  /** Never mount while the device is pinned/degraded to the low tier. */
  skipOnLowTier?: boolean;
};

/**
 * Returns true once it is safe to mount non-critical UI: after hydration,
 * after the first paint, and after the main thread goes idle.
 */
export function useDeferredMount({ force, timeout = 2500, skipOnLowTier }: DeferOptions = {}) {
  const [ready, setReady] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (ready) return;
    if (force) {
      setReady(true);
      return;
    }
    if (armed.current) return;
    armed.current = true;

    let cancelled = false;
    let idle: IdleHandle | null = null;

    // Two rAFs = first paint is on screen before we queue anything.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        const delay = window.setTimeout(() => {
          idle = onIdle(() => {
            if (cancelled) return;
            if (skipOnLowTier && getPerfState().tier === "low") {
              armed.current = false;
              return;
            }
            perfQuiet(1000);
            setReady(true);
          }, timeout);
        }, tierDelay());
        idle = { cancel: () => window.clearTimeout(delay) };
        void raf2;
      });
      void raf2;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      idle?.cancel();
    };
  }, [force, ready, timeout, skipOnLowTier]);

  return ready || Boolean(force);
}

/**
 * Viewport-driven reveal. `rootMargin` pre-loads slightly ahead of the scroll
 * so content is never visibly missing. Falls back to "always visible" when
 * IntersectionObserver is unavailable.
 */
export function useInView<T extends HTMLElement>(options?: { rootMargin?: string; once?: boolean }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) {
          perfQuiet(600);
          setInView(true);
          if (options?.once !== false) io.disconnect();
        } else if (options?.once === false) {
          setInView(false);
        }
      },
      { rootMargin: options?.rootMargin ?? "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options?.rootMargin, options?.once]);

  return { ref, inView };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fx } from "@/lib/fx";
import { butlerSay } from "@/lib/voice";

export type CoachStep = {
  /** matches a `data-coach="…"` attribute somewhere on the page */
  target?: string;
  title: string;
  body: string;
};

const seenKey = (id: string) => `nexus:coach:${id}`;

export function coachSeen(id: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(seenKey(id)) === "1";
  } catch {
    return true;
  }
}

export function resetCoach(id?: string) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.removeItem(seenKey(id));
    else
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("nexus:coach:"))
        .forEach((k) => window.localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent("nexus:coach-reset"));
  } catch {
    /* storage blocked */
  }
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * First-run coach marks. Renders a spotlight over the current step's target
 * plus a compact explainer card. Silent forever after the user finishes once.
 */
export function Coach({
  id,
  steps,
  speak = true,
}: {
  id: string;
  steps: CoachStep[];
  speak?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const spoken = useRef(-1);

  // only mount client-side, and only when never completed
  useEffect(() => {
    if (!coachSeen(id)) {
      const t = window.setTimeout(() => setOpen(true), 650);
      return () => window.clearTimeout(t);
    }
    const replay = () => {
      setI(0);
      spoken.current = -1;
      setOpen(true);
    };
    window.addEventListener("nexus:coach-reset", replay);
    return () => window.removeEventListener("nexus:coach-reset", replay);
  }, [id]);

  const step = steps[i];

  // track the spotlight target through scroll / resize
  useEffect(() => {
    if (!open || !step?.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-coach="${step.target}"]`);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    const el = document.querySelector<HTMLElement>(`[data-coach="${step.target}"]`);
    if (el) ro.observe(el);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, step?.target, i]);

  useEffect(() => {
    if (!open || !step || !speak || spoken.current === i) return;
    spoken.current = i;
    butlerSay(step.body, { tone: "tip", label: step.title.toUpperCase() });
  }, [open, i, step, speak]);

  const finish = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(seenKey(id), "1");
    } catch {
      /* storage blocked */
    }
  }, [id]);

  const next = useCallback(() => {
    fx.tap();
    if (i >= steps.length - 1) finish();
    else setI((n) => n + 1);
  }, [i, steps.length, finish]);

  if (!open || !step) return null;
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* dimmer + spotlight */}
      <button
        type="button"
        aria-label="Dismiss tips"
        onClick={finish}
        className="absolute inset-0 h-full w-full cursor-default bg-background/72 backdrop-blur-[2px]"
      />
      {rect ? (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-2xl border-2 border-cyan/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_40px_-6px_var(--cyan)] transition-all duration-300 ease-out"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : null}

      {/* explainer card — bottom sheet, always above the tab bar */}
      <div className="absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mx-auto max-w-md">
        <div className="nx-pop rounded-2xl border border-cyan/35 glass p-4 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-cyan/40 bg-cyan/12 text-cyan">
              <Lightbulb size={14} />
            </span>
            <span className="label-mono min-w-0 flex-1 truncate text-[10px] text-cyan">
              {step.title}
            </span>
            <span className="label-mono shrink-0 text-[10px] text-faint">
              {i + 1}/{steps.length}
            </span>
            <button
              type="button"
              aria-label="Skip tips"
              onClick={finish}
              className="press grid size-7 shrink-0 place-items-center rounded-lg border border-dim bg-surface-3 text-faint"
            >
              <X size={13} />
            </button>
          </div>

          <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/90">{step.body}</p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {steps.map((_, n) => (
                <span
                  key={n}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    n <= i ? "bg-cyan" : "bg-surface-3",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              {last ? "Got it" : "Next"}
              {last ? <Check size={13} /> : <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

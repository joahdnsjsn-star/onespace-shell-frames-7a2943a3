import { useEffect, useState } from "react";

import mascot from "@/assets/butler-mascot.png.asset.json";
import { fx } from "@/lib/fx";
import { cn } from "@/lib/utils";

/**
 * Butler mascot artwork with a hovering float, ground glow and holo scan sweep.
 * Purely decorative — always paired with real text.
 */
export function Mascot({
  size = 132,
  className,
  eager = false,
}: {
  size?: number;
  className?: string;
  /** Set on the boot/hero instance so it is not lazy-loaded. */
  eager?: boolean;
}) {
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div className="mascot-glow absolute inset-x-[8%] bottom-[2%] h-[18%] rounded-[50%]" />
      <div className="mascot-float relative size-full">
        <img
          src={mascot.url}
          alt=""
          width={size}
          height={size}
          {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
          className="size-full object-contain drop-shadow-[0_0_28px_color-mix(in_oklab,var(--cyan)_28%,transparent)]"
        />
        <div className="mascot-scan pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

const LINES = [
  "vault.seal ........ sealed",
  "link.engine ....... armed",
  "butler.mind ....... online",
  "telemetry ......... streaming",
];

/**
 * One-per-session boot splash: mascot, wordmark, checklist and progress rail.
 * Renders client-side only so it can never cause a hydration mismatch, and is
 * skipped entirely for users who prefer reduced motion.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fx.boot();
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), 260 + i * 240)));
    timers.push(setTimeout(() => setLeaving(true), 260 + LINES.length * 240 + 220));
    timers.push(setTimeout(() => onDone?.(), 260 + LINES.length * 240 + 640));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const pct = Math.round((step / LINES.length) * 100);

  return (
    <div
      role="status"
      aria-label="Starting Butler AI NEXUS"
      className={cn(
        "fixed inset-0 z-[80] grid place-items-center bg-background px-6",
        leaving ? "splash-out" : "splash-in",
      )}
    >
      <div className="starfield pointer-events-none absolute inset-[-20%] opacity-70" />
      <div className="canopy pointer-events-none absolute inset-0" />
      <div className="relative flex w-full max-w-xs flex-col items-center gap-5 text-center">
        <Mascot size={148} eager />
        <Wordmark size="lg" />
        <div className="w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-neural transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1 text-left font-mono text-[11px] leading-relaxed text-faint">
            {LINES.slice(0, Math.max(step, 1)).map((l) => (
              <li key={l} className="rise-in">
                <span className="text-cyan">›</span> {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Logo + typeset wordmark lockup: hex mark, BUTLER AI in wide caps, product subline. */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const mark = size === "lg" ? 40 : size === "md" ? 30 : 24;
  const title = size === "lg" ? "text-[26px]" : size === "md" ? "text-lg" : "text-sm";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <HexMark size={mark} />
      <div className="min-w-0 text-left">
        <div
          className={cn(
            "wordmark truncate font-semibold uppercase leading-none tracking-[0.22em]",
            title,
          )}
        >
          Butler&nbsp;AI
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase leading-none tracking-[0.28em] text-faint">
          PC&nbsp;Automation
        </div>
      </div>
    </div>
    </div>
  );
}

/** Static gradient hex mark used inside the wordmark lockup. */
export function HexMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Butler AI NEXUS"
    >
      <defs>
        <linearGradient id="wmMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" />
          <stop offset="100%" stopColor="var(--neural)" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 41.7 13.75v20.5L24 44.5 6.3 34.25v-20.5Z"
        stroke="url(#wmMark)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="color-mix(in oklab, var(--cyan) 9%, transparent)"
      />
      <path
        d="M18 32V16l12 16V16"
        stroke="var(--cyan)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

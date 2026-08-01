import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Ambient animated backdrop: drifting orbs + circuit SVG + vignette. Pure decoration. */
export function BackdropFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* deep space: two parallax star layers behind everything */}
      <div className="starfield-far absolute inset-[-20%] opacity-60" />
      <div className="starfield absolute inset-[-20%] opacity-70" />
      {/* cockpit canopy glow */}
      <div className="canopy absolute inset-0" />
      <div className="nx-orb left-[-15%] top-[-10%] size-[55vmax] bg-cyan/40" />
      <div className="nx-orb right-[-20%] top-[25%] size-[45vmax] bg-neural/35 [animation-delay:-6s]" />
      <div className="nx-orb bottom-[-18%] left-[10%] size-[50vmax] bg-net/30 [animation-delay:-11s]" />
      <svg
        className="absolute inset-0 size-full opacity-[0.16]"
        preserveAspectRatio="none"
        viewBox="0 0 400 800"
      >
        <defs>
          <linearGradient id="nxLine" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--cyan)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[90, 210, 330, 470, 610, 730].map((y, i) => (
          <path
            key={y}
            d={`M-20 ${y} H140 L190 ${y + (i % 2 ? 46 : -46)} H420`}
            fill="none"
            stroke="url(#nxLine)"
            strokeWidth="1"
            className="nx-dash"
            style={{ animationDelay: `${i * -0.9}s` }}
          />
        ))}
      </svg>
      <div className="vignette absolute inset-0" />
    </div>
  );
}

/** Animated hexagon "N" mark — layered SVG: pulse ring, orbiting nodes, energy core. */
export function NexusLogo({
  size = 26,
  className,
  status = "online",
}: {
  size?: number;
  className?: string;
  status?: "online" | "offline" | "busy";
}) {
  const ring =
    status === "online" ? "var(--ok)" : status === "busy" ? "var(--warn)" : "var(--danger)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0 overflow-visible", className)}
      role="img"
      aria-label="Butler AI — PC Automation"
    >
      <defs>
        <linearGradient id="nxMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" />
          <stop offset="100%" stopColor="var(--neural)" />
        </linearGradient>
        <radialGradient id="nxCore" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* status pulse ring */}
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke={ring}
        strokeWidth="1"
        opacity="0.5"
        className="nx-ring"
      />
      <circle cx="24" cy="24" r="17" fill="url(#nxCore)" />

      {/* hex frame */}
      <path
        d="M24 3.5 41.7 13.75v20.5L24 44.5 6.3 34.25v-20.5Z"
        stroke="url(#nxMark)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="color-mix(in oklab, var(--cyan) 8%, transparent)"
      />

      {/* butler bot head */}
      <rect
        x="14.5"
        y="13"
        width="19"
        height="15"
        rx="5"
        stroke="var(--cyan)"
        strokeWidth="1.8"
        fill="color-mix(in oklab, var(--cyan) 12%, transparent)"
      />
      {/* antenna */}
      <path d="M24 13V9.2" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="8" r="1.7" fill="var(--neural)" className="pulse-dot" />
      {/* visor eyes */}
      <circle cx="20" cy="20.2" r="1.9" fill="var(--cyan)" />
      <circle cx="28" cy="20.2" r="1.9" fill="var(--cyan)" />
      {/* bow tie — the butler tell */}
      <path
        d="M24 32.6 18.4 29.8v5.6L24 32.6Zm0 0 5.6-2.8v5.6L24 32.6Z"
        fill="url(#nxMark)"
        stroke="var(--neural)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <circle
        cx="24"
        cy="32.6"
        r="1.5"
        fill="var(--background)"
        stroke="var(--cyan)"
        strokeWidth="1"
      />
      {/* collar */}
      <path
        d="M17 29.5 24 34l7-4.5"
        stroke="color-mix(in oklab, var(--cyan) 45%, transparent)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Header wordmark: eyebrow + gradient sweep title. */
export function AnimatedTitle({
  title,
  subtitle,
  online = true,
}: {
  title: string;
  subtitle?: string | undefined;
  online?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span
          className={cn("size-1.5 shrink-0 rounded-full pulse-dot", online ? "bg-ok" : "bg-danger")}
          aria-hidden
        />
        <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.34em] text-cyan/70">
          Butler AI
        </span>
      </div>
      <h1 className="nx-title truncate font-mono text-fluid-sm font-bold uppercase leading-tight tracking-[0.1em] min-[400px]:text-fluid-lg">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-0.5 truncate text-fluid-xs leading-snug text-muted-foreground">
          <span className="text-cyan/70">›</span> {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/** Thin scroll-progress meter for the sticky header. */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        setP(h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div aria-hidden className="h-px w-full bg-dim/40">
      <div
        className="h-px bg-gradient-to-r from-cyan via-neural to-net transition-[width] duration-150 ease-out"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

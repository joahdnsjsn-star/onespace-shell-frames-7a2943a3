import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Ambient animated backdrop: drifting orbs + circuit SVG + vignette. Pure decoration. */
export function BackdropFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="nx-orb left-[-15%] top-[-10%] size-[55vmax] bg-cyan/40" />
      <div className="nx-orb right-[-20%] top-[25%] size-[45vmax] bg-neural/35 [animation-delay:-6s]" />
      <div className="nx-orb bottom-[-18%] left-[10%] size-[50vmax] bg-net/30 [animation-delay:-11s]" />
      <svg className="absolute inset-0 size-full opacity-[0.16]" preserveAspectRatio="none" viewBox="0 0 400 800">
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

/** Animated hexagon "N" mark — pure SVG, scales with font-size. */
export function NexusLogo({ size = 26, className }: { size?: number; className?: string }) {
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
        <linearGradient id="nxMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" />
          <stop offset="100%" stopColor="var(--neural)" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 41.7 13.75v20.5L24 44.5 6.3 34.25v-20.5Z"
        stroke="url(#nxMark)"
        strokeWidth="2"
        fill="color-mix(in oklab, var(--cyan) 8%, transparent)"
      />
      <g className="nx-spin-slow" style={{ transformOrigin: "24px 24px" }}>
        <circle cx="24" cy="8" r="1.8" fill="var(--cyan)" />
        <circle cx="40" cy="32" r="1.4" fill="var(--neural)" />
        <circle cx="8" cy="32" r="1.4" fill="var(--net)" />
      </g>
      <path d="M18 32V16l12 16V16" stroke="var(--cyan)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
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

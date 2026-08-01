/**
 * Instrument cluster ported from the "Butler AI Home" project and re-fitted to
 * the NEXUS design tokens: segmented radial gauges, an animated neural core,
 * a bracketed scan frame and a hydration-safe live clock.
 */
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ gauge */

export function RadialGauge({
  value,
  label,
  unit = "%",
  size = 96,
  color = "var(--cyan)",
  segments = 24,
}: {
  value: number | null;
  label: string;
  unit?: string;
  size?: number;
  color?: string;
  segments?: number;
}) {
  const v = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  const filled = Math.round((v / 100) * segments);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter - size * 0.095;
  const step = 270 / segments;
  const uid = label.replace(/\W+/g, "-").toLowerCase();

  return (
    <div className="relative inline-flex shrink-0 flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
        <defs>
          <filter id={`rg-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        {Array.from({ length: segments }).map((_, i) => {
          const a = (135 + i * step + step / 2) * (Math.PI / 180);
          const on = i < filled;
          return (
            <line
              key={i}
              x1={cx + rInner * Math.cos(a)}
              y1={cy + rInner * Math.sin(a)}
              x2={cx + rOuter * Math.cos(a)}
              y2={cy + rOuter * Math.sin(a)}
              stroke={on ? color : "color-mix(in oklab, var(--foreground) 12%, transparent)"}
              strokeWidth={2.4}
              strokeLinecap="round"
              filter={on ? `url(#rg-glow-${uid})` : undefined}
              opacity={on ? 1 : 0.6}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="font-mono text-base font-bold leading-none tabular-nums" style={{ color }}>
          {typeof value === "number" ? Math.round(value) : "—"}
          <span className="ml-0.5 text-[0.6rem] text-muted-foreground">
            {typeof value === "number" ? unit : ""}
          </span>
        </span>
        <span className="mt-1 max-w-full text-[0.55rem] font-semibold uppercase leading-tight tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- neural core */

export function NeuralCore({
  size = 200,
  color = "var(--cyan)",
  accent = "var(--purple)",
  active = true,
  label,
  value,
}: {
  size?: number;
  color?: string;
  accent?: string;
  active?: boolean;
  label?: string;
  value?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const rings: [number, number, number] = [size * 0.42, size * 0.32, size * 0.22];
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x: cx + rings[0] * Math.cos(a), y: cy + rings[0] * Math.sin(a), d: (i % 3) * 0.6 };
  });

  return (
    <div className="relative mx-auto block max-w-full" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="nc-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="55%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nc-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.4" />
          </linearGradient>
          <filter id="nc-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r={rings[0]} fill="url(#nc-core)" opacity={active ? 0.9 : 0.35} />

        <g stroke={color} strokeWidth={1} opacity={0.3}>
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = rings[0] + 4;
            const r2 = rings[0] + (i % 5 === 0 ? 10 : 6);
            return (
              <line
                key={i}
                x1={cx + r1 * Math.cos(a)}
                y1={cy + r1 * Math.sin(a)}
                x2={cx + r2 * Math.cos(a)}
                y2={cy + r2 * Math.sin(a)}
                opacity={i % 5 === 0 ? 0.9 : 0.35}
              />
            );
          })}
        </g>

        <circle
          cx={cx}
          cy={cy}
          r={rings[0]}
          fill="none"
          stroke="url(#nc-ring)"
          strokeWidth={1.2}
          strokeDasharray="6 8"
          opacity={0.85}
        >
          {active ? (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur="22s"
              repeatCount="indefinite"
            />
          ) : null}
        </circle>

        <circle
          cx={cx}
          cy={cy}
          r={rings[1]}
          fill="none"
          stroke={color}
          strokeOpacity={0.32}
          strokeWidth={1}
          strokeDasharray="2 6"
        >
          {active ? (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`360 ${cx} ${cy}`}
              to={`0 ${cx} ${cy}`}
              dur="14s"
              repeatCount="indefinite"
            />
          ) : null}
        </circle>

        <circle cx={cx} cy={cy} r={rings[2]} fill="none" stroke={accent} strokeOpacity={0.5} strokeWidth={1} filter="url(#nc-glow)">
          {active ? (
            <>
              <animate attributeName="r" values={`${rings[2]};${rings[2] + 6};${rings[2]}`} dur="3.2s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.15;0.7;0.15" dur="3.2s" repeatCount="indefinite" />
            </>
          ) : null}
        </circle>

        <g stroke={color} strokeOpacity={0.16} strokeWidth={0.8}>
          <line x1={cx - rings[0]} y1={cy} x2={cx + rings[0]} y2={cy} />
          <line x1={cx} y1={cy - rings[0]} x2={cx} y2={cy + rings[0]} />
        </g>

        {nodes.map((n, i) => (
          <g key={i}>
            <line x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={color} strokeOpacity={0.08} strokeWidth={0.8} />
            <circle cx={n.x} cy={n.y} r={2.4} fill={color} filter="url(#nc-glow)">
              {active ? (
                <animate attributeName="opacity" values="0.25;1;0.25" dur="2.4s" begin={`${n.d}s`} repeatCount="indefinite" />
              ) : null}
            </circle>
          </g>
        ))}

        <circle cx={cx} cy={cy} r={4.5} fill={color} filter="url(#nc-glow)">
          {active ? <animate attributeName="r" values="4;6;4" dur="1.8s" repeatCount="indefinite" /> : null}
        </circle>
      </svg>

      {label || value ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {value ? (
            <span className="font-mono text-xl font-bold leading-none tabular-nums" style={{ color }}>
              {value}
            </span>
          ) : null}
          {label ? (
            <span className="mt-1 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- scan frame */

export function ScanFrame({
  title,
  status,
  children,
  accent = "var(--cyan)",
  className,
}: {
  title?: string;
  status?: string;
  children: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dim/70 bg-surface-2/70 p-3 shadow-hud backdrop-blur-sm",
        className,
      )}
    >
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <span
          key={c}
          aria-hidden
          className="pointer-events-none absolute size-3"
          style={{
            top: c.startsWith("t") ? 3 : "auto",
            bottom: c.startsWith("b") ? 3 : "auto",
            left: c.endsWith("l") ? 3 : "auto",
            right: c.endsWith("r") ? 3 : "auto",
            borderColor: accent,
            borderStyle: "solid",
            borderWidth: 0,
            borderTopWidth: c.startsWith("t") ? 1.5 : 0,
            borderBottomWidth: c.startsWith("b") ? 1.5 : 0,
            borderLeftWidth: c.endsWith("l") ? 1.5 : 0,
            borderRightWidth: c.endsWith("r") ? 1.5 : 0,
          }}
        />
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 2px, color-mix(in oklab, var(--cyan) 65%, transparent) 2px 3px)",
        }}
      />
      {title || status ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {title}
          </span>
          {status ? (
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">{status}</span>
          ) : null}
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------- live clock */

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "--:--";
  const secs = now ? String(now.getSeconds()).padStart(2, "0") : "--";

  return (
    <div className={cn("text-right font-mono tabular-nums", className)}>
      <div className="text-sm font-bold leading-none text-cyan">
        {time}
        <span className="opacity-60">:{secs}</span>
      </div>
      <div className="mt-1 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">local · secure</div>
    </div>
  );
}

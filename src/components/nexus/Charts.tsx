/**
 * Knowledge charts — tiny dependency-free SVG instruments.
 *
 * Everything is pure geometry over plain arrays: no chart library, no layout
 * thrash, no canvas. Each chart degrades to a readable "no data yet" state so
 * an unpaired or freshly installed PC never shows a broken frame.
 */

import { useId, useMemo } from "react";
import type { Accent } from "./ui";
import { cn } from "@/lib/utils";

const strokeFor: Record<Accent, string> = {
  cyan: "var(--cyan)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  neural: "var(--neural)",
  system: "var(--system)",
  net: "var(--net)",
};

export type Point = { ts: number; total: number; added: number };

function buildPath(pts: Point[], w: number, h: number, pad: number) {
  const xs = pts.map((p) => p.ts);
  const ys = pts.map((p) => p.total);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const px = (v: number) => pad + ((v - minX) / spanX) * (w - pad * 2);
  const py = (v: number) => h - pad - ((v - minY) / spanY) * (h - pad * 2);
  const coords = pts.map((p) => [px(p.ts), py(p.total)] as const);

  // Smooth the line with mid-point quadratic curves — cheap and jitter-free.
  let d = "";
  coords.forEach(([x, y], i) => {
    if (i === 0) {
      d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      return;
    }
    const [px0, py0] = coords[i - 1]!;
    const mx = (px0 + x) / 2;
    d += ` Q ${px0.toFixed(1)} ${py0.toFixed(1)} ${mx.toFixed(1)} ${((py0 + y) / 2).toFixed(1)}`;
    if (i === coords.length - 1) d += ` T ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  const area = `${d} L ${coords[coords.length - 1]![0].toFixed(1)} ${h - pad} L ${coords[0]![0].toFixed(1)} ${h - pad} Z`;
  return { d, area, last: coords[coords.length - 1]!, minY, maxY };
}

/** Growth curve: total knowledge over time, with an area fill and live head. */
export function GrowthChart({
  points,
  accent = "neural",
  height = 132,
  label,
  className,
}: {
  points: Point[];
  accent?: Accent;
  height?: number;
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const W = 320;
  const H = height;
  const stroke = strokeFor[accent];

  const geo = useMemo(() => {
    const clean = points.filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.total));
    if (clean.length < 2) return null;
    return buildPath(clean, W, H, 10);
  }, [points, H]);

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[var(--chart-h)] w-full"
        style={{ ["--chart-h" as string]: `${H}px` }}
        role="img"
        aria-label={label ?? "knowledge growth over time"}
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.34" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-dim/50"
            strokeDasharray="3 6"
          />
        ))}

        {geo ? (
          <>
            <path d={geo.area} fill={`url(#fill-${id})`} />
            <path
              d={geo.d}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={geo.last[0]} cy={geo.last[1]} r="3.5" fill={stroke} />
            <circle cx={geo.last[0]} cy={geo.last[1]} r="7" fill={stroke} opacity="0.22">
              <animate attributeName="r" values="5;10;5" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2.6s" repeatCount="indefinite" />
            </circle>
          </>
        ) : null}
      </svg>

      {!geo ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="label-mono text-muted">collecting first samples…</span>
        </div>
      ) : null}
    </div>
  );
}

/** Per-hour intake bars, derived from the same series as the growth curve. */
export function IntakeBars({ points, accent = "cyan", bars = 24 }: { points: Point[]; accent?: Accent; bars?: number }) {
  const data = useMemo(() => {
    const tail = points.slice(-bars);
    const max = Math.max(1, ...tail.map((p) => p.added));
    return tail.map((p) => ({ h: Math.max(0.06, p.added / max), added: p.added, ts: p.ts }));
  }, [points, bars]);

  if (!data.length) {
    return <p className="label-mono text-muted">no intake recorded yet</p>;
  }

  return (
    <div className="flex h-14 items-end gap-[3px]" aria-hidden>
      {data.map((d, i) => (
        <span
          key={`${d.ts}-${i}`}
          className="flex-1 rounded-t-[2px] transition-[height] duration-500"
          style={{
            height: `${(d.h * 100).toFixed(1)}%`,
            background: `linear-gradient(to top, ${strokeFor[accent]}, color-mix(in oklab, ${strokeFor[accent]} 35%, transparent))`,
            opacity: d.added > 0 ? 1 : 0.28,
          }}
        />
      ))}
    </div>
  );
}

/** Category distribution — horizontal bars, biggest first. */
export function CategoryBars({ categories, max = 6 }: { categories: { name: string; count: number }[]; max?: number }) {
  const rows = useMemo(() => {
    const top = [...categories].sort((a, b) => b.count - a.count).slice(0, max);
    const peak = Math.max(1, ...top.map((c) => c.count));
    return top.map((c) => ({ ...c, pct: Math.round((c.count / peak) * 100) }));
  }, [categories, max]);

  if (!rows.length) return <p className="label-mono text-muted">no categories indexed yet</p>;

  const accents: Accent[] = ["neural", "cyan", "net", "system", "ok", "warn"];

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.name} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-body">{r.name}</span>
            <span className="font-mono text-[12px] tabular-nums text-muted">{r.count.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${r.pct}%`, background: strokeFor[accents[i % accents.length]!] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Compact ring used for milestone progress. */
export function ProgressRing({
  value,
  size = 72,
  accent = "neural",
  center,
  caption,
}: {
  value: number; // 0..1
  size?: number;
  accent?: Accent;
  center?: string;
  caption?: string;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={caption ?? "progress"}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-dim/50" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeFor[accent]}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct).toFixed(2)} ${c.toFixed(2)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 700ms ease" }}
        />
        {center ? (
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-body font-mono text-[13px] font-bold"
          >
            {center}
          </text>
        ) : null}
      </svg>
      {caption ? <span className="label-mono text-muted">{caption}</span> : null}
    </div>
  );
}

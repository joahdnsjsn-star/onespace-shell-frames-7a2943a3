import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Accent = "cyan" | "ok" | "warn" | "danger" | "neural" | "system" | "net";

const accentText: Record<Accent, string> = {
  cyan: "text-cyan",
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  neural: "text-neural",
  system: "text-system",
  net: "text-net",
};

const accentBorder: Record<Accent, string> = {
  cyan: "border-cyan/30",
  ok: "border-ok/30",
  warn: "border-warn/30",
  danger: "border-danger/30",
  neural: "border-neural/30",
  system: "border-system/30",
  net: "border-net/30",
};

const accentBg: Record<Accent, string> = {
  cyan: "bg-cyan/12",
  ok: "bg-ok/12",
  warn: "bg-warn/12",
  danger: "bg-danger/12",
  neural: "bg-neural/12",
  system: "bg-system/12",
  net: "bg-net/12",
};

export type { Accent };

export function Card({
  children,
  className,
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: Accent;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dim/70 bg-surface-2 p-4",
        accent && accentBorder[accent],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  hint,
  accent = "cyan",
  action,
}: {
  title: string;
  hint?: string;
  accent?: Accent;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className={cn("label-mono", accentText[accent])}>{title}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function IconBadge({
  children,
  accent = "cyan",
  size = 40,
  glow,
}: {
  children: ReactNode;
  accent?: Accent;
  size?: number;
  glow?: boolean;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[0.7rem] border",
        accentBg[accent],
        accentBorder[accent],
        accentText[accent],
        glow && "glow-cyan",
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  children,
  accent = "cyan",
  dot,
}: {
  children: ReactNode;
  accent?: Accent;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 label-mono",
        accentBg[accent],
        accentBorder[accent],
        accentText[accent],
      )}
    >
      {dot ? (
        <span className={cn("size-1.5 rounded-full pulse-dot bg-current")} aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  unit,
  accent = "cyan",
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: Accent;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-dim/70 bg-surface-2 p-3">
      <div className="label-mono text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("font-mono text-2xl leading-none", accentText[accent])}>{value}</span>
        {unit ? <span className="font-mono text-[10px] text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, accent = "cyan" }: { value: number; accent?: Accent }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className={cn("h-full rounded-full", accentText[accent], "bg-current")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Row({
  title,
  sub,
  left,
  right,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-dim/50 bg-surface-3/60 px-3 py-2.5",
        className,
      )}
    >
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {sub ? <div className="truncate text-[11px] text-muted-foreground">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-3", className)} />;
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-dim bg-surface/60 px-5 py-8 text-center">
      {icon ? <div className="mb-3 text-faint">{icon}</div> : null}
      <div className="label-mono text-muted-foreground">{title}</div>
      <p className="mt-2 max-w-[26ch] text-xs text-muted-foreground/80">{body}</p>
    </div>
  );
}

export function Toggle({ on }: { on?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors",
        on ? "border-cyan/50 bg-cyan/25" : "border-dim bg-surface-3",
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full transition-transform",
          on ? "translate-x-5 bg-cyan" : "translate-x-0 bg-faint",
        )}
      />
    </span>
  );
}

export function ActionButton({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-11 select-none items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
        variant === "primary" && "bg-cyan text-primary-foreground hover:bg-cyan/90",
        variant === "ghost" && "border border-dim bg-surface-3 text-foreground hover:bg-surface-3/70",
        variant === "danger" && "border border-danger/40 bg-danger/15 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

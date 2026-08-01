import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fx } from "@/lib/fx";

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
  ...rest
}: {
  children: ReactNode;
  className?: string;
  accent?: Accent;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">) {
  return (
    <div
      {...rest}
      className={cn(
        "relative rounded-2xl border border-dim/60 bg-surface-2 surface-elevated hairline-top p-4 transition-colors duration-200",
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
        <div className={cn("flex items-center gap-2 label-mono", accentText[accent])}>
          <span className="h-3 w-0.5 rounded-full bg-current" aria-hidden />
          {title}
        </div>
        {hint ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
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
        "inline-flex shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_0_color-mix(in_oklab,white_10%,transparent)] transition-transform duration-200",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 label-mono backdrop-blur-sm transition-colors",
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
    <div className="group relative rounded-2xl border border-dim/60 bg-surface-2 surface-elevated p-3.5 press hover:border-dim">
      <div className="label-mono text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-2xl font-bold leading-none tabular-nums",
            accentText[accent],
          )}
        >
          {value}
        </span>
        {unit ? <span className="font-mono text-[10px] text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? (
        <div className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  );
}

export function ProgressBar({ value, accent = "cyan" }: { value: number; accent?: Accent }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3/80 ring-1 ring-inset ring-dim/50">
      <div
        className={cn(
          "h-full rounded-full bg-current shadow-[0_0_12px_-2px_currentColor] transition-[width] duration-700 ease-out",
          accentText[accent],
        )}
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
        "flex items-start gap-3 rounded-xl border border-dim/50 bg-surface-3/50 px-3 py-3 press hover:border-cyan/25 hover:bg-surface-3/80",
        className,
      )}
    >
      {left ? <div className="shrink-0 pt-0.5">{left}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-snug text-balance">{title}</div>
        {sub ? (
          <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub}</div>
        ) : null}
      </div>
      {right ? <div className="shrink-0 self-center">{right}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md bg-surface-3/80", className)} />;
}

/** Skeleton stand-in for a Row list while real data is pending. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dim bg-surface/70 px-3 py-3">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-3/5" />
      </div>
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
  );
}

/** Skeleton stand-in for a metrics Card / StatTile grid. */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-dim bg-surface/70 p-4">
      <Skeleton className="h-3 w-24" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Inline loading strip for streams, consoles and charts. */
export function LoadingStrip({ label = "awaiting host response" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dim bg-surface/60 px-3 py-2 label-mono text-faint">
      <span className="size-1.5 rounded-full bg-cyan pulse-dot" aria-hidden />
      {label}
    </div>
  );
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
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-dim/80 bg-surface/50 px-5 py-10 text-center">
      {icon ? <div className="mb-3 text-faint">{icon}</div> : null}
      <div className="label-mono text-muted-foreground">{title}</div>
      <p className="mt-2 max-w-[30ch] text-xs leading-relaxed text-muted-foreground/90">{body}</p>
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  disabled,
}: {
  on?: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  const interactive = typeof onChange === "function";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label ?? "toggle"}
      disabled={disabled || !interactive}
      onClick={
        interactive
          ? () => {
              fx.select();
              onChange!(!on);
            }
          : undefined
      }
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
        interactive && "cursor-pointer",
        disabled && "opacity-40",
        on
          ? "border-cyan/50 bg-cyan/25 shadow-[0_0_16px_-6px_var(--cyan)]"
          : "border-dim bg-surface-3",
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          on ? "translate-x-5 bg-cyan" : "translate-x-0 bg-faint",
        )}
      />
    </button>
  );
}

/** Segmented control for enum-style settings. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex shrink-0 gap-0.5 rounded-xl border border-dim/70 bg-surface-3/60 p-0.5 [&>*]:flex-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={o === value}
          onClick={() => onChange(o)}
          className={cn(
            "press rounded-[0.6rem] px-2.5 py-1 label-mono text-[10px] transition-colors duration-200",
            o === value
              ? "bg-cyan/18 text-cyan shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_30%,transparent)]"
              : "text-faint hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Labelled range slider that matches the HUD styling. */
export function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  accent = "cyan",
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  accent?: Accent;
}) {
  return (
    <div className="rounded-xl border border-dim/50 bg-surface-3/50 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={cn("label-mono", accentText[accent])}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--cyan)] outline-none ring-1 ring-inset ring-dim/60"
      />
    </div>
  );
}

export function ActionButton({
  children,
  variant = "primary",
  className,
  onClick,
  disabled,
  type = "button",
  href,
  download,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  /** Renders an anchor instead of a button — used for file downloads. */
  href?: string;
  download?: string;
}) {
  const classes = cn(
    "press inline-flex h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold tracking-tight",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 disabled:opacity-50",
    variant === "primary" &&
      "bg-cyan text-primary-foreground shadow-[0_10px_30px_-14px_var(--cyan)] hover:bg-cyan/90",
    variant === "ghost" && "border border-dim bg-surface-3 text-foreground hover:bg-surface-3/70",
    variant === "danger" && "border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25",
    className,
  );

  if (href) {
    return (
      <a href={href} download={download} onClick={onClick} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={
        onClick
          ? () => {
              if (variant === "danger") fx.warn();
              else fx.tap();
              onClick();
            }
          : undefined
      }
      disabled={disabled}
      className={cn(
        "press inline-flex h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold tracking-tight",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 disabled:opacity-50",
        variant === "primary" &&
          "bg-cyan text-primary-foreground shadow-[0_10px_30px_-14px_var(--cyan)] hover:bg-cyan/90",
        variant === "ghost" &&
          "border border-dim bg-surface-3 text-foreground hover:bg-surface-3/70",
        variant === "danger" &&
          "border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25",
        className,
      )}
    >
      {children}
    </button>
  );
}

import { Link } from "@tanstack/react-router";
import { useLink } from "@/lib/useLink";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  excellent: "border-cyan/45 text-cyan",
  good: "border-cyan/35 text-cyan/85",
  fair: "border-amber-400/45 text-amber-300",
  poor: "border-orange-500/45 text-orange-300",
  down: "border-dim text-faint",
};

/**
 * Always-visible PC link pill. Reads the single auto-connect engine — it never
 * starts its own probe — and doubles as a shortcut to the pairing screen.
 */
export function LinkPill({ className }: { className?: string }) {
  const link = useLink();
  const connecting = link.state === "connecting" || link.state === "discovering";
  const label =
    link.state === "online"
      ? `${link.latencyMs}ms`
      : link.state === "discovering"
        ? "scan"
        : link.state === "connecting"
          ? "…"
          : link.state === "idle"
            ? "pair"
            : "down";

  return (
    <Link
      to="/connect"
      aria-label={`PC link: ${link.state}. ${link.message}`}
      className={cn(
        "press label-mono flex h-9 shrink-0 items-center gap-1.5 rounded-xl border bg-surface-2/60 px-2.5 text-[10px]",
        TONE[link.state === "online" ? link.quality : link.state === "offline" ? "poor" : "down"],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          link.state === "online"
            ? "bg-current shadow-[0_0_8px_currentColor]"
            : connecting
              ? "animate-pulse bg-current"
              : "bg-current/60",
        )}
      />
      {label}
    </Link>
  );
}

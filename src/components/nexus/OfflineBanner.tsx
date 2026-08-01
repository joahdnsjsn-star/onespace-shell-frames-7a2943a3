import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Persistent connection-state banner for the PC bridge link.
 * Visual shell only — `online` is passed in, nothing is wired.
 */
export function OfflineBanner({
  online = true,
  detail = "reconnecting to PC bridge",
  className,
}: {
  online?: boolean;
  detail?: string;
  className?: string;
}) {
  if (online) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 border-t border-warn/30 bg-warn/12 px-4 py-1.5 label-mono text-warn",
        className,
      )}
    >
      <WifiOff size={12} strokeWidth={2} aria-hidden />
      <span className="size-1.5 rounded-full bg-warn pulse-dot" aria-hidden />
      offline — {detail}
    </div>
  );
}

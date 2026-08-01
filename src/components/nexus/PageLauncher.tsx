import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  Code2,
  Brain,
  BarChart3,
  Hammer,
  FolderOpen,
  Server,
  Palette,
  SlidersHorizontal,
  Rocket,
  Boxes,
  ShieldCheck,
  FileText,
  Database,
  Lock,
  Bug,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PageEntry = {
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  accent: "cyan" | "neural" | "warn" | "ok" | "net" | "system" | "danger";
};

export const PAGE_GROUPS: { group: string; pages: PageEntry[] }[] = [
  {
    group: "core",
    pages: [
      { to: "/", label: "Home", desc: "Live telemetry & core", icon: LayoutDashboard, accent: "cyan" },
      { to: "/butler", label: "Butler AI", desc: "Chat with your machine", icon: Bot, accent: "neural" },
      { to: "/scripts", label: "Scripts", desc: "Automation library", icon: Code2, accent: "ok" },
      { to: "/knowledge", label: "Brain", desc: "Neural knowledge base", icon: Brain, accent: "neural" },
    ],
  },
  {
    group: "modules",
    pages: [
      { to: "/logs", label: "Logs", desc: "System event stream", icon: BarChart3, accent: "warn" },
      { to: "/builder", label: "Builder", desc: "Visual flow composer", icon: Hammer, accent: "warn" },
      { to: "/fileshare", label: "Fileshare", desc: "LAN transfer bridge", icon: FolderOpen, accent: "net" },
      { to: "/connect", label: "Connect", desc: "Pair a new device", icon: Server, accent: "system" },
    ],
  },
  {
    group: "system",
    pages: [
      { to: "/cosmetic", label: "Cosmetic", desc: "Theme & HUD density", icon: Palette, accent: "neural" },
      { to: "/settings", label: "Settings", desc: "Every configuration", icon: SlidersHorizontal, accent: "cyan" },
      { to: "/onboarding", label: "Onboarding", desc: "Replay setup sequence", icon: Rocket, accent: "ok" },
      { to: "/components", label: "Component kit", desc: "UI primitive gallery", icon: Boxes, accent: "system" },
    ],
  },
  {
    group: "legal & trust",
    pages: [
      { to: "/security-trust", label: "Security & trust", desc: "How data is protected", icon: ShieldCheck, accent: "ok" },
      { to: "/privacy-policy", label: "Privacy policy", desc: "What we never collect", icon: Lock, accent: "system" },
      { to: "/terms", label: "Terms", desc: "Terms of service", icon: FileText, accent: "system" },
      { to: "/data-safety", label: "Data safety", desc: "Store disclosure", icon: Database, accent: "net" },
      { to: "/crash-report", label: "Crash report", desc: "Diagnostics bundle", icon: Bug, accent: "danger" },
    ],
  },
];

export const ALL_PAGES: PageEntry[] = PAGE_GROUPS.flatMap((g) => g.pages);

const ACCENT: Record<PageEntry["accent"], string> = {
  cyan: "text-cyan border-cyan/30 bg-cyan/10",
  neural: "text-neural border-neural/30 bg-neural/10",
  warn: "text-warn border-warn/30 bg-warn/10",
  ok: "text-ok border-ok/30 bg-ok/10",
  net: "text-net border-net/30 bg-net/10",
  system: "text-system border-system/30 bg-system/10",
  danger: "text-danger border-danger/30 bg-danger/10",
};

export function PageLauncher({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="All pages"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="scroll-y mx-auto flex h-dvh w-full max-w-lg flex-col sm:max-w-xl lg:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-dim/70 glass px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="min-w-0">
            <div className="label-mono text-cyan">all pages</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap any module — no scrolling required
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close page list"
            className="press grid size-9 shrink-0 place-items-center rounded-xl border border-dim/70 bg-surface-2/60 text-faint hover:border-cyan/40 hover:text-cyan"
          >
            <X size={16} />
          </button>
        </div>

        <div className="nx-stagger space-y-5 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
          {PAGE_GROUPS.map((g) => (
            <section key={g.group}>
              <div className="label-mono mb-2 text-faint">{g.group}</div>
              <div className="grid grid-cols-2 gap-2.5">
                {g.pages.map((p) => (
                  <Link
                    key={p.to}
                    to={p.to}
                    activeOptions={{ exact: p.to === "/" }}
                    onClick={() => onOpenChange(false)}
                    className="press lift flex items-start gap-2.5 rounded-2xl border border-dim/60 bg-surface-2/60 p-3 hover:border-cyan/30 hover:bg-surface-3/70"
                    activeProps={{ className: "border-cyan/45 bg-cyan/8" }}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl border",
                        ACCENT[p.accent],
                      )}
                    >
                      <p.icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug text-balance">
                        {p.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {p.desc}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

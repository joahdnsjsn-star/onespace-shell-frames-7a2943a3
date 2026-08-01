import type { ReactNode } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "./ui";

export const TABS = [
  { to: "/", label: "HOME", icon: LayoutDashboard },
  { to: "/butler", label: "BUTLER", icon: Bot },
  { to: "/scripts", label: "SCRIPTS", icon: Code2 },
  { to: "/knowledge", label: "BRAIN", icon: Brain },
  { to: "/logs", label: "LOGS", icon: BarChart3 },
  { to: "/builder", label: "BUILD", icon: Hammer },
  { to: "/fileshare", label: "FILES", icon: FolderOpen },
  { to: "/connect", label: "LINK", icon: Server },
  { to: "/cosmetic", label: "SKIN", icon: Palette },
  { to: "/settings", label: "CONFIG", icon: SlidersHorizontal },
] as const;

export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-dim bg-surface/95 backdrop-blur">
      <div className="flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-faint transition-colors hover:text-cyan"
            activeOptions={{ exact: t.to === "/" }}
            activeProps={{ className: "bg-cyan/10 text-cyan" }}
          >
            <t.icon size={20} strokeWidth={1.6} />
            <span className="label-mono text-[9px]">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  accentLabel,
  offline,
  children,
}: {
  title: string;
  subtitle?: string;
  accentLabel?: string;
  offline?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-dim bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-ok pulse-dot" aria-hidden />
              <h1 className="truncate font-mono text-base font-bold tracking-widest">{title}</h1>
            </div>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {accentLabel ? <Chip accent="cyan">{accentLabel}</Chip> : null}
        </div>
        {offline ? (
          <div className="flex items-center gap-2 border-t border-warn/30 bg-warn/12 px-4 py-1.5 label-mono text-warn">
            <span className="size-1.5 rounded-full bg-warn pulse-dot" aria-hidden />
            offline — reconnecting to PC bridge
          </div>
        ) : null}
      </header>

      <main className={cn("flex-1 space-y-5 nexus-grid px-4 pb-8 pt-5")}>{children}</main>

      <TabBar />
    </div>
  );
}
